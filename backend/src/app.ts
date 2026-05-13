import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import path from 'node:path';

import { environment } from './config/environment.js';
import { logger } from './utils/logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';
import { metricsMiddleware, metricsEndpoint } from './config/metrics.js';
import { attachSentryRequestHandler } from './config/sentry.js';
import { openapiSpec } from './config/openapi.js';

import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import receiptRoutes from './routes/receipts.js';
import settingsRoutes from './routes/settings.js';
import analyticsRoutes from './routes/analytics.js';
import budgetRoutes from './routes/budgets.js';
import aiRoutes from './routes/ai.js';
import walletRoutes from './routes/wallet.js';
import featureRoutes from './routes/features.js';
import { AppError } from './middleware/errorHandler.js';

const app = express();

// ── Trust proxy (critical behind load balancers) ──
app.set('trust proxy', 1);

// ── Security & compression ──
app.use(helmet({
  contentSecurityPolicy: environment.NODE_ENV === 'production' ? undefined : false,
}));
app.use(compression());

// ── Request ID (for log correlation / tracing) ──
app.use(requestIdMiddleware);

// ── CORS ──
const allowedOrigins = environment.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // same-origin / curl
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  maxAge: 86400,
}));

// ── Metrics (before everything else so it captures all requests) ──
app.use(metricsMiddleware);

// ── Request logging ──
app.use(morgan((tokens: any, req: Request, res: Response) => {
  const line = [
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens['response-time'](req, res), 'ms',
    `rid=${req.requestId}`,
  ].join(' ');

  if (res.statusCode >= 500) logger.error({ message: line });
  else if (res.statusCode >= 400) logger.warn({ message: line });
  else logger.info({ message: line });
  return null;
}));

// ── Body parsers (with size limits) ──
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Static uploads (dev only — use S3/CDN in production) ──
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// ── Observability endpoints (no auth, no rate limit) ──
app.use('/health', healthRoutes);
app.get('/metrics', metricsEndpoint);

// ── API documentation ──
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
  customSiteTitle: 'PayTrack API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
}));
app.get('/api/openapi.json', (_req, res) => res.json(openapiSpec));

// ── Rate limiting on all API endpoints ──
app.use('/api/', apiLimiter);

// ── API v1 routes ──
const v1 = express.Router();
v1.use('/auth', authRoutes);
v1.use('/receipts', receiptRoutes);
v1.use('/settings', settingsRoutes);
v1.use('/analytics', analyticsRoutes);
v1.use('/budgets', budgetRoutes);
v1.use('/ai', aiRoutes);
v1.use('/wallet', walletRoutes);
v1.use('/features', featureRoutes);
app.use('/api/v1', v1);

// ── Backward compatibility: unversioned routes alias to v1 ──
app.use('/api/auth', authRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/features', featureRoutes);

// ── 404 ──
app.use((req, _res, next) => {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl}`));
});

// ── Sentry error handler (before our error handler) ──
attachSentryRequestHandler(app);

// ── Global error handler (must be last) ──
app.use(errorHandler);

export default app;
