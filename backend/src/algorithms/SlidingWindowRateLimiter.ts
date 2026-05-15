/**
 * Sliding Window Rate Limiter
 *
 * Compared to fixed-window rate limiting (the default in `express-rate-limit`),
 * sliding window provides smoother, fairer enforcement.
 *
 * Fixed-window problem: A user can make 2× the limit in a short burst by
 * sending requests at the end of one window and beginning of the next.
 *
 *   Window 1: 12:00:00 → 12:00:59  (limit: 10)
 *   Window 2: 12:01:00 → 12:01:59
 *
 *   Attacker sends 10 at 12:00:59 and 10 at 12:01:00 → 20 requests in 2 seconds.
 *
 * Sliding window: Looks at requests in the past N seconds at every point in time,
 * not arbitrary buckets. Tighter enforcement.
 *
 * Implementation: Redis sorted set per (user, route)
 *   • ZADD timestamp request_id   — record this request
 *   • ZREMRANGEBYSCORE 0 (now-window)  — purge old entries
 *   • ZCARD                        — count requests in window
 *
 * Time: O(log N) per request (Redis sorted set ops).
 * Space: O(R) where R = requests per window per key.
 */

import type { Cache } from '../config/cache.js';
import { getRedisClient } from '../config/cache.js';

export interface SlidingWindowOptions {
  /** Window duration in seconds. */
  windowSeconds: number;
  /** Maximum requests allowed in the window. */
  maxRequests: number;
  /** Cache prefix to namespace keys. */
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Requests made in current window. */
  current: number;
  /** Requests remaining before limit. */
  remaining: number;
  /** Seconds until oldest request expires (window slides). */
  retryAfterSeconds: number;
}

export class SlidingWindowRateLimiter {
  private readonly cache: Cache;
  private readonly options: Required<SlidingWindowOptions>;

  constructor(cache: Cache, options: SlidingWindowOptions) {
    this.cache = cache;
    this.options = {
      keyPrefix: 'rl:sw:',
      ...options,
    };
  }

  /**
   * Check whether `identifier` (e.g. user ID or IP) can make another request.
   * If yes, records the request. If no, returns retry-after info.
   *
   * Uses Redis sorted sets for true sliding window. Falls back to a coarser
   * approach when Redis isn't available (in-memory cache).
   */
  async check(identifier: string): Promise<RateLimitResult> {
    const redis = getRedisClient();
    if (redis) {
      return this.checkRedis(redis, identifier);
    }
    return this.checkInMemory(identifier);
  }

  private async checkRedis(redis: NonNullable<ReturnType<typeof getRedisClient>>, identifier: string): Promise<RateLimitResult> {
    const key = this.options.keyPrefix + identifier;
    const now = Date.now();
    const windowStart = now - this.options.windowSeconds * 1000;

    // Atomic pipeline: purge expired, count, conditionally add
    const pipeline = redis.multi();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);
    const results = await pipeline.exec();

    const current = (results?.[1]?.[1] as number) ?? 0;

    if (current >= this.options.maxRequests) {
      // Find oldest entry to compute retryAfter
      const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const oldestScore = oldest[1] ? Number(oldest[1]) : now;
      const retryAfter = Math.max(1, Math.ceil((oldestScore + this.options.windowSeconds * 1000 - now) / 1000));
      return {
        allowed: false,
        current,
        remaining: 0,
        retryAfterSeconds: retryAfter,
      };
    }

    // Add this request — score = timestamp, member = unique id
    await redis.zadd(key, now, `${now}-${Math.random()}`);
    await redis.expire(key, this.options.windowSeconds + 1);

    return {
      allowed: true,
      current: current + 1,
      remaining: this.options.maxRequests - current - 1,
      retryAfterSeconds: 0,
    };
  }

  /**
   * In-memory fallback using an array of timestamps.
   * Less accurate under heavy concurrency than Redis but works for dev.
   */
  private inMemoryStore = new Map<string, number[]>();

  private async checkInMemory(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - this.options.windowSeconds * 1000;

    let timestamps = this.inMemoryStore.get(identifier) || [];
    // Purge expired
    timestamps = timestamps.filter(t => t > windowStart);

    if (timestamps.length >= this.options.maxRequests) {
      const oldest = timestamps[0];
      const retryAfter = Math.max(1, Math.ceil((oldest + this.options.windowSeconds * 1000 - now) / 1000));
      this.inMemoryStore.set(identifier, timestamps);
      return {
        allowed: false,
        current: timestamps.length,
        remaining: 0,
        retryAfterSeconds: retryAfter,
      };
    }

    timestamps.push(now);
    this.inMemoryStore.set(identifier, timestamps);

    return {
      allowed: true,
      current: timestamps.length,
      remaining: this.options.maxRequests - timestamps.length,
      retryAfterSeconds: 0,
    };
  }
}
