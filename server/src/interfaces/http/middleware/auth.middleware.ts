import type { Request, Response, NextFunction } from "express";
import type { AuthService } from "../../../application/services/AuthService";
import { AppError } from "../../../shared/errors/AppError";

export function createAuthMiddleware(authService: AuthService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization ?? "";
    if (!header.startsWith("Bearer ")) {
      next(AppError.unauthorized());
      return;
    }
    try {
      const payload = authService.verifyToken(header.slice(7));
      req.userId = payload.sub;
      next();
    } catch {
      next(AppError.unauthorized());
    }
  };
}
