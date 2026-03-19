import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { environment } from '../config/environment.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, environment.JWT_SECRET);

    (req as any).userId = (decoded as any).userId;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
}