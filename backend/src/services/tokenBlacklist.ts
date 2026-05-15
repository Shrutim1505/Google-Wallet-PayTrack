import { createHash } from 'node:crypto';
import { getCache } from '../config/cache.js';

const KEY_PREFIX = 'bl:token:';
const HASH_LENGTH = 32;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, HASH_LENGTH);
}

export async function blacklistToken(token: string, ttlSeconds: number): Promise<void> {
  await getCache().set(KEY_PREFIX + hashToken(token), '1', Math.max(ttlSeconds, 1));
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  return getCache().exists(KEY_PREFIX + hashToken(token));
}

export function remainingTokenLifetime(exp: number): number {
  return Math.max(exp - Math.floor(Date.now() / 1000), 0);
}
