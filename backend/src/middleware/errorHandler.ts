import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { environment } from '../config/environment.js';

/**
 * RFC 7807 Problem Details for HTTP APIs
 * https://datatracker.ietf.org/doc/html/rfc7807
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  traceId?: string;
  errors?: Array<{ field: string; message: string }>;
  [key: string]: unknown;
}

export class AppError extends Error {
  public code: string;
  public details?: Record<string, unknown>;
  public errors?: Array<{ field: string; message: string }>;

  constructor(
    public statusCode: number,
    codeOrMessage: string,
    message?: string,
    details?: Record<string, unknown>,
    errors?: Array<{ field: string; message: string }>
  ) {
    // Support legacy 2-arg form: new AppError(404, 'Not found')
    // And new 3-arg form: new AppError(404, 'NOT_FOUND', 'Resource not found')
    const isLegacy = message === undefined;
    super(isLegacy ? codeOrMessage : message);
    this.code = isLegacy ? AppError.statusToCode(statusCode) : codeOrMessage;
    this.details = details;
    this.errors = errors;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }

  private static statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
      503: 'SERVICE_UNAVAILABLE',
    };
    return map[status] || 'ERROR';
  }

  static badRequest(message: string, details?: Record<string, unknown>) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Insufficient permissions') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(resource: string) {
    return new AppError(404, 'NOT_FOUND', `${resource} not found`);
  }

  static conflict(message: string) {
    return new AppError(409, 'CONFLICT', message);
  }

  static validation(errors: Array<{ field: string; message: string }>) {
    return new AppError(422, 'VALIDATION_ERROR', 'Validation failed', undefined, errors);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new AppError(429, 'RATE_LIMITED', message);
  }

  static internal(message = 'Internal server error', details?: Record<string, unknown>) {
    return new AppError(500, 'INTERNAL_ERROR', message, details);
  }

  static serviceUnavailable(message = 'Service temporarily unavailable') {
    return new AppError(503, 'SERVICE_UNAVAILABLE', message);
  }
}

/**
 * Global error handler middleware — must be registered LAST.
 * Returns RFC 7807 Problem Details responses.
 */
export const errorHandler = (
  err: Error | AppError | any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const traceId = req.requestId || 'unknown';
  const path = `${req.method} ${req.originalUrl}`;

  // AppError (our custom error class)
  if (err instanceof AppError) {
    const problem: ProblemDetails = {
      type: `https://paytrack.dev/errors/${err.code.toLowerCase().replace(/_/g, '-')}`,
      title: err.message,
      status: err.statusCode,
      code: err.code,
      traceId,
      instance: path,
    };
    if (err.errors) problem.errors = err.errors;
    if (err.details && environment.NODE_ENV === 'development') {
      problem.detail = JSON.stringify(err.details);
    }

    logger[err.statusCode >= 500 ? 'error' : 'warn']({
      msg: err.message,
      traceId,
      code: err.code,
      statusCode: err.statusCode,
      path,
    });

    return res.status(err.statusCode).type('application/problem+json').json(problem);
  }

  // Joi / validation errors with 422 statusCode attached
  if (err.statusCode === 422 && err.details) {
    const problem: ProblemDetails = {
      type: 'https://paytrack.dev/errors/validation-error',
      title: 'Validation failed',
      status: 422,
      code: 'VALIDATION_ERROR',
      traceId,
      instance: path,
      errors: err.details,
    };
    return res.status(422).type('application/problem+json').json(problem);
  }

  // Unknown errors
  const problem: ProblemDetails = {
    type: 'https://paytrack.dev/errors/internal',
    title: 'Internal server error',
    status: 500,
    code: 'INTERNAL_ERROR',
    traceId,
    instance: path,
  };

  if (environment.NODE_ENV === 'development') {
    problem.detail = err.message;
    problem.stack = err.stack;
  }

  logger.error({
    msg: err.message || 'Unknown error',
    traceId,
    stack: err.stack,
    path,
  });

  res.status(500).type('application/problem+json').json(problem);
};
