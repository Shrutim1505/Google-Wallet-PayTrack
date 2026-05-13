import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

/**
 * Prometheus metrics: application-level monitoring.
 * Exposed at GET /metrics in the app.
 */

// Collect default Node.js metrics (memory, event loop, GC, etc.)
client.collectDefaultMetrics({ prefix: 'paytrack_' });

export const httpRequestDuration = new client.Histogram({
  name: 'paytrack_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const httpRequestsTotal = new client.Counter({
  name: 'paytrack_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const dbQueryDuration = new client.Histogram({
  name: 'paytrack_db_query_duration_seconds',
  help: 'Duration of DB queries in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});

export const authFailures = new client.Counter({
  name: 'paytrack_auth_failures_total',
  help: 'Authentication failures',
  labelNames: ['reason'],
});

export const receiptsCreated = new client.Counter({
  name: 'paytrack_receipts_created_total',
  help: 'Receipts created',
  labelNames: ['source'], // manual | ocr
});

/**
 * Express middleware to record HTTP metrics.
 * Must be registered before route handlers but after the request ID middleware.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationSec = Number(durationNs) / 1e9;

    // Use route pattern (e.g. /api/v1/receipts/:id) not the actual URL
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;
    const labels = {
      method: req.method,
      route,
      status: String(res.statusCode),
    };

    httpRequestDuration.observe(labels, durationSec);
    httpRequestsTotal.inc(labels);
  });

  next();
}

/**
 * GET /metrics endpoint handler — returns Prometheus-formatted metrics.
 */
export async function metricsEndpoint(_req: Request, res: Response) {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
}

export { client };
