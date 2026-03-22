import { Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { HTTP_STATUS } from '../utils/constants.js';

const authService = new AuthService();

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  // Validation is done by validateRequest middleware
  const result = await authService.register(email, password, name);

  logger.info({
    message: 'User registered successfully',
    email,
    userId: result.user.id,
  });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: result,
    message: 'Registration successful',
  });
});

/**
 * Login user
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validation is done by validateRequest middleware
  const result = await authService.login(email, password);

  logger.info({
    message: 'User logged in successfully',
    email,
    userId: result.user.id,
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result,
    message: 'Login successful',
  });
});