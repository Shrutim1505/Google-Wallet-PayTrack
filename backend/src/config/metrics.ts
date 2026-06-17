import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

const METRIC_PREFIX = 'paytrack_';
const REQUEST_DURATION_BUCKETS = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const QUERY_DURATION_BUCKETS = [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5];
const NS_PER_SEC = 1e9;

client.collectDefaultMetrics({ prefix: METRIC_PREFIX });

export const httpRequestDuration = new client.Histogram({
  name: `${METRIC_PREFIX}http_request_duration_seconds`,
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: REQUEST_DURATION_BUCKETS,
});

export const httpRequestsTotal = new client.Counter({
  name: `${METRIC_PREFIX}http_requests_total`,
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const dbQueryDuration = new client.Histogram({
  name: `${METRIC_PREFIX}db_query_duration_seconds`,
  help: 'Duration of DB queries in seconds',
  labelNames: ['operation'],
  buckets: QUERY_DURATION_BUCKETS,
});

export const authFailures = new client.Counter({
  name: `${METRIC_PREFIX}auth_failures_total`,
  help: 'Authentication failures',
  labelNames: ['reason'],
});

export const receiptsCreated = new client.Counter({
  name: `${METRIC_PREFIX}receipts_created_total`,
  help: 'Receipts created',
  labelNames: ['source'],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationSec = Number(process.hrtime.bigint() - start) / NS_PER_SEC;
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

export async function metricsEndpoint(_req: Request, res: Response) {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
}

export { client };
