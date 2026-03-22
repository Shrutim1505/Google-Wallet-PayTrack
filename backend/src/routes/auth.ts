import { Router } from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import { authLimiter } from '../middleware/rateLimitMiddleware.js';
import { schemas } from '../utils/validation.js';
import * as authController from '../controllers/authController.js';

const router = Router();

// Register: validate body, apply auth rate limiter
router.post(
  '/register',
  authLimiter,
  validateRequest(schemas.register, 'body'),
  authController.register
);

// Login: validate body, apply auth rate limiter
router.post(
  '/login',
  authLimiter,
  validateRequest(schemas.login, 'body'),
  authController.login
);

export default router;