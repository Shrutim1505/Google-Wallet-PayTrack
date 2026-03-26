import { Router } from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import { authLimiter } from '../middleware/rateLimitMiddleware.js';
import { authMiddleware } from '../middleware/auth.js';
import { schemas } from '../utils/validation.js';
import * as authController from '../controllers/authController.js';

const router = Router();

router.post('/register', authLimiter, validateRequest(schemas.register, 'body'), authController.register);
router.post('/login', authLimiter, validateRequest(schemas.login, 'body'), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/change-password', authMiddleware, validateRequest(schemas.changePassword, 'body'), authController.changePassword);

export default router;
