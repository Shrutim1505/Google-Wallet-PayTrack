import { Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import { PasswordResetService } from '../services/passwordResetService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

const authService = new AuthService();
const passwordResetService = new PasswordResetService();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               name: { type: string, minLength: 2 }
 *     responses:
 *       201: { description: Success, content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  const result = await authService.register(email, password, name);
  logger.info({ msg: 'User registered', userId: result.user.id, traceId: req.requestId });
  res.status(201).json({ success: true, data: result, message: 'Registration successful' });
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     responses:
 *       200: { description: Success }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  logger.info({ msg: 'User logged in', userId: result.user.id, traceId: req.requestId });
  res.status(200).json({ success: true, data: result, message: 'Login successful' });
});

/**
 * @openapi
 * /auth/verify:
 *   get:
 *     tags: [Auth]
 *     summary: Verify token validity
 *     security: [{ bearerAuth: [] }]
 */
export const verify = asyncHandler(async (req: Request, res: Response) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw AppError.unauthorized('No token provided');
  const payload = await authService.verifyToken(header.slice(7));
  res.status(200).json({
    success: true,
    data: { userId: payload.sub, email: payload.email, roles: payload.roles, permissions: payload.permissions },
  });
});

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using refresh token
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw AppError.badRequest('refreshToken is required');
  const result = await authService.refresh(refreshToken);
  logger.info({ msg: 'Token refreshed', userId: result.user.id, traceId: req.requestId });
  res.status(200).json({ success: true, data: result });
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and revoke tokens
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const accessToken = req.headers.authorization?.slice(7);
  await authService.logout(accessToken, refreshToken);
  res.status(200).json({ success: true, message: 'Logged out' });
});

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password (requires authentication)
 *     security: [{ bearerAuth: [] }]
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw AppError.badRequest('currentPassword and newPassword are required');
  }
  await authService.changePassword(userId, currentPassword, newPassword);
  logger.info({ msg: 'Password changed', userId, traceId: req.requestId });
  res.status(200).json({ success: true, message: 'Password changed successfully' });
});

/**
 * @openapi
 * /auth/password-reset/request:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset (emails token to user)
 */
export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) throw AppError.badRequest('email is required');
  const result = await passwordResetService.requestReset(email);

  // In production: send token via email (queue a job)
  // For development: include token in response to allow testing
  const responseData: Record<string, unknown> = {
    success: true,
    message: 'If the email exists, a reset link has been sent',
  };
  if (process.env.NODE_ENV !== 'production' && result.token) {
    responseData._dev_token = result.token; // REMOVE in production
  }

  res.status(200).json(responseData);
});

/**
 * @openapi
 * /auth/password-reset/confirm:
 *   post:
 *     tags: [Auth]
 *     summary: Confirm password reset with token
 */
export const confirmPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) throw AppError.badRequest('token and newPassword are required');
  await passwordResetService.confirmReset(token, newPassword);
  res.status(200).json({ success: true, message: 'Password reset successfully' });
});
