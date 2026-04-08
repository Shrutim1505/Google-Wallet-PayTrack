import { Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { HTTP_STATUS } from '../utils/constants.js';

const authService = new AuthService();

/**
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  const result = await authService.register(email, password, name);

  logger.info({ msg: 'User registered', userId: result.user.id });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: result,
    message: 'Registration successful',
  });
});

/**
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  logger.info({ msg: 'User logged in', userId: result.user.id });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result,
    message: 'Login successful',
  });
});

/**
 * GET /api/auth/verify
 * Validates the JWT and returns the associated user info.
 */
export const verify = asyncHandler(async (req: Request, res: Response) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: 'No token provided' });
  }

  const payload = await authService.verifyToken(header.slice(7));

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: payload,
    message: 'Token is valid',
  });
});
