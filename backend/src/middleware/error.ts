import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';
import { env } from '../config/env';

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err && typeof err === 'object' && 'code' in err) {
    // Map common PostgreSQL errors
    const pgErr = err as { code?: string; detail?: string; message?: string };
    if (pgErr.code === '23505') {
      statusCode = 409;
      message = 'A record with these details already exists';
      details = pgErr.detail;
    } else if (pgErr.code === '23503') {
      statusCode = 400;
      message = 'Referenced record does not exist';
    } else if (pgErr.code === '23502') {
      statusCode = 400;
      message = 'A required field is missing';
    } else if (pgErr.message) {
      message = pgErr.message;
    }
  } else if (err instanceof Error) {
    message = err.message;
  }

  if (statusCode >= 500) {
    logger.error('Unhandled error', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(env.isProd ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  });
}
