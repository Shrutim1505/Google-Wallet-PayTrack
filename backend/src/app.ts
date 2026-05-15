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
import { errorHandler, AppError } from './middleware/errorHandler.js';
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

const BODY_LIMIT = '1mb';
const CORS_MAX_AGE_SECONDS = 86400;

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: environment.NODE_ENV === 'production' ? undefined : false,
}));
app.use(compression());

app.use(requestIdMiddleware);

const allowedOrigins = environment.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  maxAge: CORS_MAX_AGE_SECONDS,
}));

app.use(metricsMiddleware);

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

app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.use('/health', healthRoutes);
app.get('/metrics', metricsEndpoint);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
  customSiteTitle: 'PayTrack API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
}));
app.get('/api/openapi.json', (_req, res) => res.json(openapiSpec));

app.use('/api/', apiLimiter);

const v1Router = express.Router();
v1Router.use('/auth', authRoutes);
v1Router.use('/receipts', receiptRoutes);
v1Router.use('/settings', settingsRoutes);
v1Router.use('/analytics', analyticsRoutes);
v1Router.use('/budgets', budgetRoutes);
v1Router.use('/ai', aiRoutes);
v1Router.use('/wallet', walletRoutes);
v1Router.use('/features', featureRoutes);
app.use('/api/v1', v1Router);

app.use('/api/auth', authRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/features', featureRoutes);

app.use((req, _res, next) => {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl}`));
});

attachSentryRequestHandler(app);
app.use(errorHandler);

export default app;
