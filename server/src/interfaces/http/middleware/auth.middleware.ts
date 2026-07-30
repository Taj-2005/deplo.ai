import type { Request, Response, NextFunction } from "express";
import type { AuthService } from "../../../application/services/AuthService";
import { CLI_TOKEN_PREFIX, type CliTokenService } from "../../../application/services/CliTokenService";
import { AppError } from "../../../shared/errors/AppError";

export function createAuthMiddleware(authService: AuthService, cliTokenService?: CliTokenService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization ?? "";
    if (!header.startsWith("Bearer ")) {
      next(AppError.unauthorized());
      return;
    }
    const bearer = header.slice(7);

    // CLI tokens (dpl_…) resolve via hash lookup; everything else is a JWT.
    if (cliTokenService && bearer.startsWith(CLI_TOKEN_PREFIX)) {
      cliTokenService
        .authenticate(bearer)
        .then((userId) => {
          if (!userId) {
            next(AppError.unauthorized());
            return;
          }
          req.userId = userId;
          next();
        })
        .catch(() => next(AppError.unauthorized()));
      return;
    }

    try {
      const payload = authService.verifyToken(bearer);
      req.userId = payload.sub;
      next();
    } catch {
      next(AppError.unauthorized());
    }
  };
}
