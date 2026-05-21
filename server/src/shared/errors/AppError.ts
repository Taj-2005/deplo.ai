export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "EXTERNAL_SERVICE_ERROR"
  | "RATE_LIMIT_EXCEEDED";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    isOperational = true,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static notFound(resource: string): AppError {
    return new AppError(`${resource} not found`, "NOT_FOUND", 404);
  }

  static unauthorized(message = "Unauthorized"): AppError {
    return new AppError(message, "UNAUTHORIZED", 401);
  }

  static forbidden(message = "Forbidden"): AppError {
    return new AppError(message, "FORBIDDEN", 403);
  }

  static conflict(message: string): AppError {
    return new AppError(message, "CONFLICT", 409);
  }

  static validation(message: string): AppError {
    return new AppError(message, "VALIDATION_ERROR", 400);
  }

  static internal(message = "Internal server error"): AppError {
    return new AppError(message, "INTERNAL_ERROR", 500, false);
  }

  static externalService(service: string, message: string): AppError {
    return new AppError(
      `${service}: ${message}`,
      "EXTERNAL_SERVICE_ERROR",
       502,
    );
  }
}
