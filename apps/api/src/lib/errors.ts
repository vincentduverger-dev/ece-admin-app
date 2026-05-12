export class AppError extends Error {
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

export const badRequest = (message: string): AppError => {
  return new AppError(message, 400);
};

export const unauthorized = (message: string): AppError => {
  return new AppError(message, 401);
};

export const notFound = (message: string): AppError => {
  return new AppError(message, 404);
};

export const conflict = (
  message: string,
  details?: Record<string, unknown>
): AppError => {
  return new AppError(message, 409, details);
};
