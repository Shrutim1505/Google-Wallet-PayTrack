import { Router } from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import { authLimiter } from '../middleware/rateLimitMiddleware.js';
import { authMiddleware } from '../middleware/auth.js';
import { idempotency } from '../middleware/idempotency.js';
import { schemas } from '../utils/validation.js';
import * as authController from '../controllers/authController.js';

const router = Router();

router.post('/register', authLimiter, idempotency, validateRequest(schemas.register, 'body'), authController.register);
router.post('/login', authLimiter, validateRequest(schemas.login, 'body'), authController.login);
router.get('/verify', authController.verify);
router.post('/refresh', authLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.post('/change-password', authMiddleware, authController.changePassword);

// Password reset
router.post('/password-reset/request', authLimiter, authController.requestPasswordReset);
router.post('/password-reset/confirm', authLimiter, authController.confirmPasswordReset);

export default router;
