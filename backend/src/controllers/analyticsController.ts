import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { HTTP_STATUS } from '../utils/constants.js';

const analyticsService = new AnalyticsService();

export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

  const analytics = await analyticsService.getAnalytics(userId, year, month);

  logger.info({
    message: 'Analytics request',
    userId,
    year,
    month,
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: analytics,
    message: 'Analytics data retrieved successfully',
  });
});

/** GET /api/analytics/charts — aggregated data for dashboard charts */
export const getChartData = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const [topMerchants, topCategories, monthlyTrend, confidenceDistribution] = await Promise.all([
    analyticsService.getTopMerchants(userId, 8),
    analyticsService.getTopCategories(userId, 8),
    analyticsService.getMonthlyTrend(userId, 6),
    analyticsService.getConfidenceDistribution(userId),
  ]);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { topMerchants, topCategories, monthlyTrend, confidenceDistribution },
  });
});

