import { Router } from 'express';
import { authMiddleware, requireAuth } from '../middleware/auth.js';
import * as aiController from '../controllers/aiController.js';

const router = Router();

router.use(authMiddleware, requireAuth);

router.get('/insights', aiController.getInsights);
router.post('/categorize', aiController.categorize);

export default router;
