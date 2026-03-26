import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { schemas } from '../utils/validation.js';
import * as settingsController from '../controllers/settingsController.js';

const router = Router();
router.use(authMiddleware);

router.get('/', settingsController.getSettings);
router.put('/', validateRequest(schemas.updateSettings, 'body'), settingsController.updateSettings);

export default router;
