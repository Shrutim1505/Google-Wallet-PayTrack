import { describe, it, expect, beforeEach } from 'vitest';

// We test InMemoryCache directly by importing the module and initializing cache.
// This tests the abstraction used in dev and as a fallback; Redis-specific paths
// are tested via the higher-level integration tests.

import { initializeCache, getCache, closeCache } from '../config/cache.js';

describe('Cache (InMemory)', () => {
  beforeEach(async () => {
    // Ensure no REDIS_URL is present so the in-memory implementation is used
    delete process.env.REDIS_URL;
    await closeCache().catch(() => {});
    initializeCache();
  });

  describe('basic operations', () => {
    it('set and get a value', async () => {
      const cache = getCache();
      await cache.set('key1', 'value1');
      expect(await cache.get('key1')).toBe('value1');
    });

    it('returns null for missing keys', async () => {
      expect(await getCache().get('missing')).toBeNull();
    });

    it('deletes a key', async () => {
      const cache = getCache();
      await cache.set('to-delete', 'x');
      await cache.del('to-delete');
      expect(await cache.get('to-delete')).toBeNull();
    });

    it('exists returns true for present keys, false otherwise', async () => {
      const cache = getCache();
      await cache.set('k', 'v');
      expect(await cache.exists('k')).toBe(true);
      expect(await cache.exists('missing')).toBe(false);
    });
  });

  describe('TTL (expiration)', () => {
    it('expires after ttl seconds', async () => {
      const cache = getCache();
      await cache.set('short-lived', 'x', 1); // 1 second TTL
      expect(await cache.get('short-lived')).toBe('x');

      // Wait just past the TTL
      await new Promise(r => setTimeout(r, 1100));
      expect(await cache.get('short-lived')).toBeNull();
    });

    it('keys without ttl persist', async () => {
      const cache = getCache();
      await cache.set('permanent', 'x');
      await new Promise(r => setTimeout(r, 100));
      expect(await cache.get('permanent')).toBe('x');
    });

    it('expire() updates ttl on existing key', async () => {
      const cache = getCache();
      await cache.set('k', 'v');
      await cache.expire('k', 1);
      await new Promise(r => setTimeout(r, 1100));
      expect(await cache.get('k')).toBeNull();
    });
  });

  describe('counter operations', () => {
    it('incr starts at 1 for a new key', async () => {
      expect(await getCache().incr('counter-1')).toBe(1);
    });

    it('incr increments sequentially', async () => {
      const cache = getCache();
      await cache.incr('counter-2');
      await cache.incr('counter-2');
      expect(await cache.incr('counter-2')).toBe(3);
    });
  });

  describe('ping', () => {
    it('responds with PONG', async () => {
      expect(await getCache().ping()).toBe('PONG');
    });
  });
});
