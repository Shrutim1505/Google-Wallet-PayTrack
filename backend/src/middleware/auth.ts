import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { environment } from '../config/environment.js';
import { AppError } from './errorHandler.js';
import { isTokenBlacklisted } from '../services/tokenBlacklist.js';
import type { TokenPayload } from '../services/authService.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      email?: string;
      roles?: string[];
      permissions?: string[];
    }
  }
}

/**
 * Authentication middleware — verifies JWT and attaches user + permissions to request.
 * Zero DB calls: permissions are embedded in the JWT at login time.
 */
export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(AppError.unauthorized('No token provided'));
  }

  const token = authHeader.slice(7);

  // Check blacklist first (logged-out tokens)
  if (await isTokenBlacklisted(token)) {
    return next(AppError.unauthorized('Token has been revoked'));
  }

  let decoded: TokenPayload;
  try {
    decoded = jwt.verify(token, environment.JWT_SECRET) as TokenPayload;
  } catch {
    return next(AppError.unauthorized('Invalid or expired token'));
  }

  if (decoded.type && decoded.type !== 'access') {
    return next(AppError.unauthorized('Invalid token type'));
  }

  req.userId = decoded.sub;
  req.email = decoded.email;
  req.roles = decoded.roles || [];
  req.permissions = decoded.permissions || [];
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.userId) return next(AppError.unauthorized());
  next();
}
