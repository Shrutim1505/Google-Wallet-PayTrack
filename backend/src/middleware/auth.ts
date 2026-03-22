import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { environment } from '../config/environment.js';
import { logger } from '../utils/logger.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      email?: string;
    }
  }
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Authentication middleware to verify JWT and attach user info to request
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug({ message: 'No token provided' });
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        timestamp: new Date(),
      });
    }

    const token = authHeader.slice(7);

    try {
      const decoded = jwt.verify(token, environment.JWT_SECRET) as JWTPayload;
      req.userId = decoded.userId;
      req.email = decoded.email;
      next();
    } catch (verifyError: any) {
      logger.debug({
        message: 'Token verification failed',
        error: verifyError.message,
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        timestamp: new Date(),
      });
    }
  } catch (error) {
    logger.error({
      message: 'Authentication middleware error',
      error: (error as Error).message,
    });
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      timestamp: new Date(),
    });
  }
}

/**
 * Middleware to check if user is authenticated
 * Used to ensure userId exists on request object
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      timestamp: new Date(),
    });
  }
  next();
}