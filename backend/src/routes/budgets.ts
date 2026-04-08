import { Router } from 'express';
import { authMiddleware, requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { schemas } from '../utils/validation.js';
import * as budgetController from '../controllers/budgetController.js';

const router = Router();

router.use(authMiddleware, requireAuth);

router.get('/', budgetController.getBudgets);
router.get('/status', budgetController.getBudgetStatus);
router.post('/', validateRequest(schemas.createBudget, 'body'), budgetController.createBudget);
router.put('/:id', budgetController.updateBudget);
router.delete('/:id', budgetController.deleteBudget);

export default router;
