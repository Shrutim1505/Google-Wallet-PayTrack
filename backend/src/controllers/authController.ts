import { Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { HTTP_STATUS } from '../utils/constants.js';

const authService = new AuthService();

/** POST /api/auth/register */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  const result = await authService.register(email, password, name);
  logger.info({ msg: 'User registered', userId: result.user.id });
  res.status(HTTP_STATUS.CREATED).json({ success: true, data: result, message: 'Registration successful' });
});

/** POST /api/auth/login */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  logger.info({ msg: 'User logged in', userId: result.user.id });
  res.status(HTTP_STATUS.OK).json({ success: true, data: result, message: 'Login successful' });
});

/** GET /api/auth/verify */
export const verify = asyncHandler(async (req: Request, res: Response) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: 'No token provided' });
  }
  const payload = await authService.verifyToken(header.slice(7));
  res.status(HTTP_STATUS.OK).json({ success: true, data: payload, message: 'Token is valid' });
});

/** POST /api/auth/refresh */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'refreshToken is required' });
  }
  const result = await authService.refresh(refreshToken);
  logger.info({ msg: 'Token refreshed', userId: result.user.id });
  res.status(HTTP_STATUS.OK).json({ success: true, data: result });
});

/** POST /api/auth/logout */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  await authService.logout(refreshToken);
  res.status(HTTP_STATUS.OK).json({ success: true, message: 'Logged out' });
});

/** POST /api/auth/change-password */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'currentPassword and newPassword are required' });
  }
  await authService.changePassword(userId, currentPassword, newPassword);
  logger.info({ msg: 'Password changed', userId });
  res.status(HTTP_STATUS.OK).json({ success: true, message: 'Password changed successfully' });
});
