import { describe, it, expect, beforeEach } from 'vitest';
import { initializeCache, closeCache } from '../config/cache.js';
import {
  blacklistToken,
  isTokenBlacklisted,
  remainingTokenLifetime,
} from '../services/tokenBlacklist.js';

describe('tokenBlacklist', () => {
  beforeEach(async () => {
    delete process.env.REDIS_URL;
    await closeCache().catch(() => {});
    initializeCache();
  });

  describe('blacklistToken / isTokenBlacklisted', () => {
    it('returns false for unblacklisted tokens', async () => {
      expect(await isTokenBlacklisted('never-seen-this')).toBe(false);
    });

    it('returns true after blacklisting a token', async () => {
      const token = 'eyJ.test.token';
      await blacklistToken(token, 60);
      expect(await isTokenBlacklisted(token)).toBe(true);
    });

    it('respects ttl and eventually un-blacklists the token', async () => {
      const token = 'eyJ.short.lived';
      await blacklistToken(token, 1); // 1 second
      expect(await isTokenBlacklisted(token)).toBe(true);

      await new Promise(r => setTimeout(r, 1100));
      expect(await isTokenBlacklisted(token)).toBe(false);
    });

    it('different tokens have independent blacklist state', async () => {
      await blacklistToken('token-A', 60);
      expect(await isTokenBlacklisted('token-A')).toBe(true);
      expect(await isTokenBlacklisted('token-B')).toBe(false);
    });

    it('handles minimum TTL of 1 even if 0 is passed', async () => {
      // Implementation enforces `Math.max(ttlSeconds, 1)`
      await blacklistToken('edge-case', 0);
      expect(await isTokenBlacklisted('edge-case')).toBe(true);
    });
  });

  describe('remainingTokenLifetime', () => {
    it('returns positive seconds for a future exp', () => {
      const future = Math.floor(Date.now() / 1000) + 60;
      expect(remainingTokenLifetime(future)).toBeGreaterThan(0);
      expect(remainingTokenLifetime(future)).toBeLessThanOrEqual(60);
    });

    it('returns 0 for an expired token', () => {
      const past = Math.floor(Date.now() / 1000) - 1000;
      expect(remainingTokenLifetime(past)).toBe(0);
    });

    it('returns 0 when exp equals now (not negative)', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(remainingTokenLifetime(now)).toBeGreaterThanOrEqual(0);
    });
  });
});
