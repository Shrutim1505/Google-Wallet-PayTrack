import { Router, Request, Response } from 'express';
import { getPool } from '../config/database.js';
import { getCache } from '../config/cache.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * Liveness probe — is the process alive?
 * K8s restarts the pod if this fails. Must be fast and have no dependencies.
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe — can we serve traffic?
 * K8s removes the pod from load balancer rotation if this fails.
 * Checks all critical dependencies.
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: 'ok' | 'fail'; latency?: number; error?: string }> = {};

  // DB check
  const dbStart = Date.now();
  try {
    await getPool().query('SELECT 1');
    checks.database = { status: 'ok', latency: Date.now() - dbStart };
  } catch (err) {
    checks.database = { status: 'fail', error: (err as Error).message };
  }

  // Cache check
  const cacheStart = Date.now();
  try {
    await getCache().ping();
    checks.cache = { status: 'ok', latency: Date.now() - cacheStart };
  } catch (err) {
    checks.cache = { status: 'fail', error: (err as Error).message };
  }

  const allOk = Object.values(checks).every(c => c.status === 'ok');
  const status = allOk ? 200 : 503;

  if (!allOk) {
    logger.warn({ msg: 'Readiness check failed', checks });
  }

  res.status(status).json({
    status: allOk ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks,
  });
});

// Legacy endpoint for backward compatibility
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
