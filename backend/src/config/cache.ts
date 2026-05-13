/**
 * Cache abstraction: Redis in production, in-memory for development.
 *
 * Provides a unified interface so services don't care whether they're
 * running in single-instance dev mode or horizontally scaled production.
 */
import { Redis } from 'ioredis';
import { environment } from './environment.js';
import { logger } from '../utils/logger.js';

export interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  ping(): Promise<string>;
  quit(): Promise<void>;
}

class InMemoryCache implements Cache {
  private store = new Map<string, { value: string; expiresAt: number | null }>();

  constructor() {
    // Periodic cleanup to prevent memory bloat
    setInterval(() => {
      const now = Date.now();
      for (const [k, v] of this.store.entries()) {
        if (v.expiresAt && v.expiresAt < now) this.store.delete(k);
      }
    }, 60_000).unref();
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async incr(key: string): Promise<number> {
    const current = parseInt((await this.get(key)) || '0', 10);
    const next = current + 1;
    await this.set(key, String(next));
    return next;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) entry.expiresAt = Date.now() + ttlSeconds * 1000;
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async quit(): Promise<void> {
    this.store.clear();
  }
}

class RedisCache implements Cache {
  constructor(private client: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async quit(): Promise<void> {
    await this.client.quit();
  }
}

let cache: Cache;
let redisClient: Redis | null = null;

export function initializeCache(): Cache {
  if (environment.REDIS_URL) {
    redisClient = new Redis(environment.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
    redisClient.on('error', (err) => logger.error({ msg: 'Redis error', err: err.message }));
    redisClient.on('connect', () => logger.info('Redis connected'));
    cache = new RedisCache(redisClient);
  } else {
    if (environment.NODE_ENV === 'production') {
      throw new Error('REDIS_URL required in production');
    }
    logger.warn('Using in-memory cache (set REDIS_URL for production-grade caching)');
    cache = new InMemoryCache();
  }
  return cache;
}

export function getCache(): Cache {
  if (!cache) throw new Error('Cache not initialized — call initializeCache() first');
  return cache;
}

export function getRedisClient(): Redis | null {
  return redisClient;
}

export async function closeCache(): Promise<void> {
  if (cache) await cache.quit();
}
