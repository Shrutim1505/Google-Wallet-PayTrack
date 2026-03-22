import { Router } from 'express';
import { authMiddleware, requireAuth } from '../middleware/auth.js';
import * as analyticsController from '../controllers/analyticsController.js';

const router = Router();

// Apply auth middleware to all analytics routes
router.use(authMiddleware, requireAuth);

router.get('/', analyticsController.getAnalytics);

export default router;

