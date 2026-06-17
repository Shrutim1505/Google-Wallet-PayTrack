import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as analyticsController from '../controllers/analyticsController.js';

const router = Router();
router.use(authMiddleware);

router.get('/', analyticsController.getAnalytics);
router.get('/summary', analyticsController.getAnalytics);
router.get('/charts', analyticsController.getChartData);

export default router;
