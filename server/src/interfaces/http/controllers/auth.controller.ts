import type { Request, Response, NextFunction } from "express";
import type { AuthService } from "../../../application/services/AuthService";
import type { IUserRepository } from "../../../domain/user/UserRepository.interface";
import { AppError } from "../../../shared/errors/AppError";
import { env } from "../../../config/env";
import { logger } from "../../../shared/logger/logger";

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userRepository: IUserRepository,
  ) {}

  getGithubOAuthUrl = (req: Request, res: Response): void => {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_REDIRECT_URI,
      // repo          — read/write repos + hooks for user-owned repos
      // admin:repo_hook — create/delete hooks (org repos + extra safety for user repos)
      // read:user + user:email — profile and email access
      scope: "read:user user:email repo admin:repo_hook",
    });

    // After an explicit sign-out GitHub would otherwise re-authorize silently
    // — already-granted app plus a live github.com session means no prompt —
    // and drop the user straight back into the account they just left.
    // select_account forces the picker. Only this one value is forwarded.
    if (req.query["prompt"] === "select_account") {
      params.set("prompt", "select_account");
    }

    res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
  };

  handleGithubCallback = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    try {
      const code = req.query["code"] as string | undefined;
      if (!code) {
        res.status(400).json({ error: { message: "Missing code parameter" } });
        return;
      }
      const { token, user } = await this.authService.loginWithGithub(code);

      const clientUrl = env.ALLOWED_ORIGINS[0] ?? "http://localhost:3000";
      res.redirect(`${clientUrl}/auth/callback?token=${encodeURIComponent(token)}&userId=${user.id}`);
    } catch (err) {
      logger.error("GitHub OAuth callback failed", {
        message: err instanceof Error ? err.message : String(err),
      });
      const clientUrl = env.ALLOWED_ORIGINS[0] ?? "http://localhost:3000";
      res.redirect(`${clientUrl}/?auth=failed`);
    }
  };

  /**
   * DELETE /auth/me — permanently deletes the account.
   *
   * Every user-owned table (repositories, deployments, provider connections,
   * CLI tokens, uptime samples, analytics) cascades from User, so one delete
   * removes all of it. Apps already deployed keep running: they live in the
   * user's own Vercel and Render accounts, which we never touch.
   */
  deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      await this.userRepository.delete(userId);
      logger.info("Account deleted", { userId });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  getCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // req.userId is set by the auth middleware for BOTH JWTs and CLI
      // tokens (dpl_…) — never re-verify the bearer as a JWT here.
      const user = await this.userRepository.findById(req.userId!);
      if (!user) {
        throw AppError.unauthorized();
      }
      res.json({
        userId: user.id,
        email: user.email,
        name: user.name,
        githubLogin: user.githubLogin,
        avatarUrl: user.avatarUrl,
      });
    } catch (err) {
      next(err);
    }
  };
}
