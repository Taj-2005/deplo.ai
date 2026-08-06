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

  getGithubOAuthUrl = (_req: Request, res: Response): void => {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_REDIRECT_URI,
      // repo          — read/write repos + hooks for user-owned repos
      // admin:repo_hook — create/delete hooks (org repos + extra safety for user repos)
      // read:user + user:email — profile and email access
      scope: "read:user user:email repo admin:repo_hook",
    });
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
