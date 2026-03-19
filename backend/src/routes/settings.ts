import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as settingsController from '../controllers/settingsController.js';

const router = Router();

router.use(authMiddleware);
router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

export default router;

