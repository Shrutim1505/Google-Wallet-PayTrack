import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Global error handler middleware
 * Must be registered LAST in the middleware chain
 */
export const errorHandler = (
  err: Error | AppError | any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Handle custom AppError
  if (err instanceof AppError) {
    logger.error({
      message: err.message,
      statusCode: err.statusCode,
      details: err.details,
      stack: err.stack,
    });

    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.details : undefined,
      timestamp: new Date(),
    });
  }

  // Handle validation errors from middleware
  if (err.statusCode === 422 && err.details) {
    logger.debug({
      message: err.message,
      details: err.details,
    });

    return res.status(422).json({
      success: false,
      error: err.message,
      details: err.details,
      timestamp: new Date(),
    });
  }

  // Handle generic errors
  logger.error({
    message: err.message,
    stack: err.stack,
    name: err.name,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      message: err.message,
      stack: err.stack 
    }),
    timestamp: new Date(),
  });
};