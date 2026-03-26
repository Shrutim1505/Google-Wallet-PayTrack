import { Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { HTTP_STATUS } from '../utils/constants.js';

const authService = new AuthService();

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  const result = await authService.register(email, password, name);

  logger.info({ message: 'User registered', email, userId: result.user.id });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: result,
    message: 'Registration successful',
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  logger.info({ message: 'User logged in', email, userId: result.user.id });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result,
    message: 'Login successful',
  });
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Refresh token required' });
  }

  const result = await authService.refreshAccessToken(refreshToken);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result,
    message: 'Token refreshed',
  });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { currentPassword, newPassword } = req.body;

  await authService.changePassword(userId, currentPassword, newPassword);

  logger.info({ message: 'Password changed', userId });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Password changed successfully',
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await authService.logout(refreshToken);
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Logged out successfully',
  });
});
