import type { Request, Response, NextFunction } from "express";
import type { AuthService } from "../../../application/services/AuthService";
import { env } from "../../../config/env";
import { logger } from "../../../shared/logger/logger";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
      const token = (req.headers.authorization ?? "").slice(7);
      const payload = this.authService.verifyToken(token);
      res.json({ userId: payload.sub, email: payload.email });
    } catch (err) {
      next(err);
    }
  };
}
