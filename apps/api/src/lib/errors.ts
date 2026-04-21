export class AppError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;

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
