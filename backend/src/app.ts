import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import crypto from 'node:crypto';
import { environment } from './config/environment.js';
import authRoutes from './routes/auth.js';
import receiptRoutes from './routes/receipts.js';
import settingsRoutes from './routes/settings.js';
import analyticsRoutes from './routes/analytics.js';
import featuresRoutes from './routes/features.js';
import aiRoutes from './routes/ai.js';
import walletRoutes from './routes/wallet.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';
import { logger } from './utils/logger.js';
import { getTotalConnections } from './config/websocket.js';
import path from 'node:path';

const app = express();

// ── Request ID for tracing ──
app.use((req: Request, _res, next) => {
  (req as any).requestId = req.headers['x-request-id'] || crypto.randomUUID();
  next();
});

// ── Security ──
app.use(helmet({
  contentSecurityPolicy: environment.NODE_ENV === 'production' ? undefined : false,
}));
app.use(compression());
app.use(cors({
  origin: environment.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// ── Logging ──
app.use(morgan((tokens: any, req: Request, res: Response) => {
  const msg = [
    `[${(req as any).requestId?.slice(0, 8)}]`,
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens['response-time'](req, res), 'ms',
  ].join(' ');

  if (res.statusCode >= 400) { logger.error({ message: msg }); }
  else { logger.info({ message: msg }); }
  return '';
}));

// ── Body parsers ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static files ──
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// ── Health check ──
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: environment.NODE_ENV,
    wsConnections: getTotalConnections(),
  });
});

// ── Rate limiting ──
app.use('/api/', apiLimiter);

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/features', featuresRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/wallet', walletRoutes);

// ── 404 ──
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Error handler ──
app.use(errorHandler);

export default app;
