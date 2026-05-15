import { describe, it, expect, vi } from 'vitest';
import { LRUCache } from '../algorithms/LRUCache.js';

describe('LRUCache', () => {
  describe('basic get/set', () => {
    it('stores and retrieves values', () => {
      const cache = new LRUCache<string, number>({ capacity: 3 });
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBe(2);
    });

    it('returns undefined for missing keys', () => {
      const cache = new LRUCache<string, number>({ capacity: 3 });
      expect(cache.get('missing')).toBeUndefined();
    });

    it('updates an existing value without expanding size', () => {
      const cache = new LRUCache<string, number>({ capacity: 3 });
      cache.set('a', 1);
      cache.set('a', 2);
      expect(cache.size).toBe(1);
      expect(cache.get('a')).toBe(2);
    });
  });

  describe('LRU eviction', () => {
    it('evicts least recently used when at capacity', () => {
      const cache = new LRUCache<string, number>({ capacity: 3 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4); // should evict 'a'

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('promotes a key to most-recently-used on get', () => {
      const cache = new LRUCache<string, number>({ capacity: 3 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.get('a'); // promote 'a'
      cache.set('d', 4); // should evict 'b' (now LRU)

      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('calls onEvict for LRU evictions', () => {
      const onEvict = vi.fn();
      const cache = new LRUCache<string, number>({ capacity: 2, onEvict });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      expect(onEvict).toHaveBeenCalledWith('a', 1, 'lru');
    });
  });

  describe('TTL expiration', () => {
    it('expires entries after the TTL elapses', async () => {
      const cache = new LRUCache<string, number>({ capacity: 10, defaultTtlMs: 50 });
      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);

      await new Promise(r => setTimeout(r, 80));
      expect(cache.get('a')).toBeUndefined();
    });

    it('does not expire entries without TTL (defaultTtlMs=0)', async () => {
      const cache = new LRUCache<string, number>({ capacity: 10 });
      cache.set('a', 1);
      await new Promise(r => setTimeout(r, 50));
      expect(cache.get('a')).toBe(1);
    });

    it('per-entry TTL overrides default', async () => {
      const cache = new LRUCache<string, number>({ capacity: 10, defaultTtlMs: 1000 });
      cache.set('short', 1, 30);
      cache.set('long', 2, 5000);

      await new Promise(r => setTimeout(r, 60));
      expect(cache.get('short')).toBeUndefined();
      expect(cache.get('long')).toBe(2);
    });
  });

  describe('stats', () => {
    it('tracks hits and misses', () => {
      const cache = new LRUCache<string, number>({ capacity: 3 });
      cache.set('a', 1);
      cache.get('a');
      cache.get('a');
      cache.get('missing');

      const stats = cache.stats;
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3, 2);
    });

    it('tracks evictions', () => {
      const cache = new LRUCache<string, number>({ capacity: 1 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      expect(cache.stats.evictions).toBe(2);
    });
  });

  describe('delete and clear', () => {
    it('deletes a single entry', () => {
      const cache = new LRUCache<string, number>({ capacity: 3 });
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.delete('a')).toBe(true);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.size).toBe(1);
    });

    it('returns false when deleting absent key', () => {
      const cache = new LRUCache<string, number>({ capacity: 3 });
      expect(cache.delete('nope')).toBe(false);
    });

    it('clears all entries', () => {
      const cache = new LRUCache<string, number>({ capacity: 3 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('iteration order', () => {
    it('entries() yields most-recently-used first', () => {
      const cache = new LRUCache<string, number>({ capacity: 3 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.get('a'); // promote 'a' to MRU

      const order = [...cache.entries()].map(([k]) => k);
      expect(order).toEqual(['a', 'c', 'b']);
    });
  });

  describe('input validation', () => {
    it('throws on non-positive capacity', () => {
      expect(() => new LRUCache<string, number>({ capacity: 0 })).toThrow();
      expect(() => new LRUCache<string, number>({ capacity: -5 })).toThrow();
    });
  });
});
