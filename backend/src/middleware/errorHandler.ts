import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { environment } from '../config/environment.js';

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

const STATUS_CODE_MAP: Record<number, string> = {
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

const ERROR_TYPE_BASE = 'https://paytrack.dev/errors';

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
    const isLegacy = message === undefined;
    super(isLegacy ? codeOrMessage : message);
    this.code = isLegacy ? STATUS_CODE_MAP[statusCode] || 'ERROR' : codeOrMessage;
    this.details = details;
    this.errors = errors;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
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

function buildProblemTypeUri(code: string): string {
  return `${ERROR_TYPE_BASE}/${code.toLowerCase().replace(/_/g, '-')}`;
}

export const errorHandler = (
  err: Error | AppError | any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const traceId = req.requestId || 'unknown';
  const path = `${req.method} ${req.originalUrl}`;

  if (err instanceof AppError) {
    const problem: ProblemDetails = {
      type: buildProblemTypeUri(err.code),
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

  if (err.statusCode === 422 && err.details) {
    const problem: ProblemDetails = {
      type: buildProblemTypeUri('VALIDATION_ERROR'),
      title: 'Validation failed',
      status: 422,
      code: 'VALIDATION_ERROR',
      traceId,
      instance: path,
      errors: err.details,
    };
    return res.status(422).type('application/problem+json').json(problem);
  }

  const problem: ProblemDetails = {
    type: buildProblemTypeUri('INTERNAL_ERROR'),
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
