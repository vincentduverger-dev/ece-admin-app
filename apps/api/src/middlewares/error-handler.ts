import type { ErrorRequestHandler, RequestHandler } from "express";

import { AppError, isAppError, notFound } from "../lib/errors";

const isJsonParseError = (
  error: unknown
): error is SyntaxError & { status: number; type: string } => {
  const errorWithMetadata = error as { status?: unknown; type?: unknown };

  return (
    error instanceof SyntaxError &&
    typeof errorWithMetadata.status === "number" &&
    typeof errorWithMetadata.type === "string" &&
    errorWithMetadata.status === 400 &&
    errorWithMetadata.type === "entity.parse.failed"
  );
};

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(notFound("Route not found"));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const appError = isAppError(error)
    ? error
    : isJsonParseError(error)
      ? new AppError("Invalid JSON payload", 400)
      : new AppError("Internal server error", 500);

  if (appError.statusCode >= 500) {
    console.error(error);
  }

  res.status(appError.statusCode).json({
    message: appError.message,
    ...appError.details
  });
};
