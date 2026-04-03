import { Request, Response } from 'express';
import { BudgetService } from '../services/budgetService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { HTTP_STATUS } from '../utils/constants.js';

const budgetService = new BudgetService();

/** GET /api/budgets */
export const getBudgets = asyncHandler(async (req: Request, res: Response) => {
  const budgets = await budgetService.getBudgets(req.userId!);
  res.status(HTTP_STATUS.OK).json({ success: true, data: budgets });
});

/** POST /api/budgets */
export const createBudget = asyncHandler(async (req: Request, res: Response) => {
  const budget = await budgetService.createBudget(req.userId!, req.body);
  logger.info({ msg: 'Budget created', userId: req.userId, budgetId: budget.id });
  res.status(HTTP_STATUS.CREATED).json({ success: true, data: budget, message: 'Budget created' });
});

/** PUT /api/budgets/:id */
export const updateBudget = asyncHandler(async (req: Request, res: Response) => {
  const budget = await budgetService.updateBudget(req.userId!, req.params.id, req.body);
  logger.info({ msg: 'Budget updated', userId: req.userId, budgetId: req.params.id });
  res.status(HTTP_STATUS.OK).json({ success: true, data: budget, message: 'Budget updated' });
});

/** DELETE /api/budgets/:id */
export const deleteBudget = asyncHandler(async (req: Request, res: Response) => {
  await budgetService.deleteBudget(req.userId!, req.params.id);
  logger.info({ msg: 'Budget deleted', userId: req.userId, budgetId: req.params.id });
  res.status(HTTP_STATUS.OK).json({ success: true, data: null, message: 'Budget deleted' });
});

/** GET /api/budgets/status — budget vs actual spending */
export const getBudgetStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = await budgetService.getBudgetStatus(req.userId!);
  res.status(HTTP_STATUS.OK).json({ success: true, data: status });
});
