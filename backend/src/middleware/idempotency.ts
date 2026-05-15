import { Request, Response, NextFunction } from 'express';
import { getCache } from '../config/cache.js';
import { logger } from '../utils/logger.js';

const CACHE_TTL_SECONDS = 24 * 60 * 60;
const KEY_PREFIX = 'idem:';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH']);

interface CachedResponse {
  status: number;
  body: unknown;
}

export function idempotency(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['idempotency-key'] as string | undefined;

  if (!key || !MUTATING_METHODS.has(req.method)) {
    return next();
  }

  const scope = req.userId || req.ip;
  const cacheKey = `${KEY_PREFIX}${scope}:${key}`;

  getCache().get(cacheKey).then(cached => {
    if (cached) {
      try {
        const { status, body } = JSON.parse(cached) as CachedResponse;
        logger.info({ msg: 'Idempotent replay', key, scope, traceId: req.requestId });
        res.status(status).json(body);
        return;
      } catch {
        // malformed cache entry - fall through to handler
      }
    }

    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        const entry: CachedResponse = { status: res.statusCode, body };
        getCache()
          .set(cacheKey, JSON.stringify(entry), CACHE_TTL_SECONDS)
          .catch(err => logger.error({ msg: 'Failed to cache idempotent response', err: err.message }));
      }
      return originalJson(body);
    };

    next();
  }).catch(next);
}
