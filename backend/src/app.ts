import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan, { StreamOptions } from 'morgan';
import { environment } from './config/environment.js';
import authRoutes from './routes/auth.js';
import receiptRoutes from './routes/receipts.js';
import settingsRoutes from './routes/settings.js';
import analyticsRoutes from './routes/analytics.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';
import { logger } from './utils/logger.js';
import path from 'node:path';

const app = express();

// ──────────────────────────────────
// MIDDLEWARE CHAIN (correct order)
// ──────────────────────────────────

// 1. Security headers
app.use(helmet());

// 2. Compression
app.use(compression());

// 3. CORS
app.use(cors({
  origin: environment.FRONTEND_URL,
  credentials: true,
}));

// 4. Request logging
app.use(morgan((tokens: any, req: Request, res: Response) => {
  const status = tokens.status(req, res);
  const msg = [
    tokens.method(req, res),
    tokens.url(req, res),
    status,
    tokens['response-time'](req, res), 'ms',
  ].join(' ');

  if (res.statusCode >= 400) {
    logger.error({ message: msg });
  } else {
    logger.info({ message: msg });
  }
  return '';
}));

// 5. Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 6. Static file serving (for receipt uploads)
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// 7. Health check endpoint (before rate limiting)
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: environment.NODE_ENV,
  });
});

// 8. Global rate limiting for /api routes
app.use('/api/', apiLimiter);

// ──────────────────────────────────
// ROUTES
// ──────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);

// ──────────────────────────────────
// ERROR HANDLING
// ──────────────────────────────────

// 404 handler (before global error handler)
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    timestamp: new Date(),
  });
});

// Global error handler (MUST be last)
app.use(errorHandler);

export default app;