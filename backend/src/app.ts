import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'node:path';

import { environment } from './config/environment.js';
import { logger } from './utils/logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';

import authRoutes from './routes/auth.js';
import receiptRoutes from './routes/receipts.js';
import settingsRoutes from './routes/settings.js';
import analyticsRoutes from './routes/analytics.js';
import budgetRoutes from './routes/budgets.js';
import aiRoutes from './routes/ai.js';

const app = express();

// ── Security & compression ──
app.use(helmet());
app.use(compression());

// ── Request ID (for log correlation) ──
app.use(requestIdMiddleware);

// ── CORS ──
app.use(cors({ origin: environment.FRONTEND_URL, credentials: true }));

// ── Request logging ──
app.use(morgan((tokens: any, req: Request, res: Response) => {
  const msg = [
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens['response-time'](req, res), 'ms',
    `rid=${req.requestId}`,
  ].join(' ');

  if (res.statusCode >= 400) logger.error({ message: msg });
  else logger.info({ message: msg });
  return null;
}));

// ── Body parsers ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static files ──
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// ── Health check (before rate limiter) ──
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: environment.NODE_ENV,
  });
});

// ── Rate limiting ──
app.use('/api/', apiLimiter);

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/ai', aiRoutes);

// ── 404 ──
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Global error handler (must be last) ──
app.use(errorHandler);

export default app;
