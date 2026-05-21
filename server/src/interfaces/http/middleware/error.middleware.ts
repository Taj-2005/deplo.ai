import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../../shared/errors/AppError";
import { logger } from "../../../shared/logger/logger";
import { env } from "../../../config/env";

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message:
        env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
    },
  });
}
