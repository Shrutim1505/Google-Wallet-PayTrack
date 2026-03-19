import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService.js';

const analyticsService = new AnalyticsService();

export async function getAnalytics(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const analytics = await analyticsService.getAnalytics(userId);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

