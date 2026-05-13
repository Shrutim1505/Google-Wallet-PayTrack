import { createHash } from 'node:crypto';
import { getCache } from '../config/cache.js';

/**
 * Token blacklist backed by Redis (or in-memory in dev).
 * Stores hashed tokens with TTL matching the token's remaining lifetime.
 */
const PREFIX = 'bl:token:';

/**
 * Hash tokens before storing — shorter keys, plus defense-in-depth
 * if the cache store is ever exposed.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 32);
}

export async function blacklistToken(token: string, ttlSeconds: number): Promise<void> {
  const key = PREFIX + hashToken(token);
  await getCache().set(key, '1', Math.max(ttlSeconds, 1));
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const key = PREFIX + hashToken(token);
  return getCache().exists(key);
}

/**
 * Compute remaining token lifetime in seconds from a JWT exp claim.
 */
export function remainingTokenLifetime(exp: number): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(exp - now, 0);
}
