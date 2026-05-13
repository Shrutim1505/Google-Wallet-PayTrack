import { Request, Response, NextFunction } from 'express';
import { getCache } from '../config/cache.js';
import { logger } from '../utils/logger.js';

/**
 * Idempotency middleware (Stripe-style).
 *
 * Clients send `Idempotency-Key: <uuid>` header on POST requests.
 * If the same key is retried within 24h, we return the cached response.
 * Prevents duplicate resource creation from network retries.
 */

const TTL_SECONDS = 24 * 60 * 60; // 24 hours
const PREFIX = 'idem:';

interface CachedResponse {
  status: number;
  body: unknown;
}

export function idempotency(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['idempotency-key'] as string | undefined;

  // Only apply to mutating requests
  if (!key || !['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  // Scope key by user to prevent cross-user collisions
  const scope = req.userId || req.ip;
  const cacheKey = `${PREFIX}${scope}:${key}`;

  getCache().get(cacheKey).then(cached => {
    if (cached) {
      try {
        const { status, body } = JSON.parse(cached) as CachedResponse;
        logger.info({ msg: 'Idempotent replay', key, scope, traceId: req.requestId });
        res.status(status).json(body);
        return;
      } catch {
        // Malformed cache entry — fall through
      }
    }

    // Intercept res.json to cache successful responses
    const origJson = res.json.bind(res);
    res.json = function (body: unknown) {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        const entry: CachedResponse = { status: res.statusCode, body };
        getCache()
          .set(cacheKey, JSON.stringify(entry), TTL_SECONDS)
          .catch(err => logger.error({ msg: 'Failed to cache idempotent response', err: err.message }));
      }
      return origJson(body);
    };

    next();
  }).catch(next);
}
