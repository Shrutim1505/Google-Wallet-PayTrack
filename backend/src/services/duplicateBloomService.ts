/**
 * Duplicate Detection Service — Bloom filter pre-check + DB fallback.
 *
 * Flow:
 *   1. Check Bloom filter — O(1)
 *      → "definitely not a duplicate" → return false (no DB hit)
 *      → "maybe a duplicate" → fall through
 *   2. Run expensive PostgreSQL similarity query
 *
 * Real impact (assuming 99% of receipts are unique):
 *   • Without Bloom: 100% of receipts trigger DB similarity query
 *   • With Bloom:    ~1% trigger DB query, 99% short-circuited
 *   • Result: ~99× reduction in DB load for this code path
 */

import { BloomFilter, receiptFingerprint } from '../algorithms/BloomFilter.js';
import { LRUCache } from '../algorithms/LRUCache.js';
import { getPool } from '../config/database.js';
import { logger } from '../utils/logger.js';

interface UserBloom {
  bloom: BloomFilter;
  builtAt: number;
}

// Per-user bloom filters; LRU evicts inactive users.
const bloomCache = new LRUCache<string, UserBloom>({
  capacity: 1000,
  defaultTtlMs: 30 * 60_000, // Rebuild after 30 minutes
});

const EXPECTED_RECEIPTS_PER_USER = 5_000;
const FALSE_POSITIVE_RATE = 0.01; // 1%

class DuplicateBloomService {
  /**
   * Check if a receipt is potentially a duplicate.
   *   • Returns `false` immediately (no DB hit) if the bloom filter is certain
   *   • Returns `true` if the bloom filter says "maybe" — caller should DB-verify
   */
  async maybeDuplicate(userId: string, merchant: string, amount: number, date: string): Promise<boolean> {
    const bloom = await this.getOrBuildFilter(userId);
    const fp = receiptFingerprint(merchant, amount, date);
    return bloom.has(fp);
  }

  /** Record a new receipt (insert into bloom filter). */
  add(userId: string, merchant: string, amount: number, date: string): void {
    const cached = bloomCache.get(userId);
    if (cached) {
      cached.bloom.add(receiptFingerprint(merchant, amount, date));
    }
  }

  /** Force rebuild on next access (e.g. after bulk delete). */
  invalidate(userId: string): void {
    bloomCache.delete(userId);
  }

  getStats() {
    return bloomCache.stats;
  }

  /**
   * Combined check: bloom pre-filter → DB confirm.
   * This is the recommended public API for the duplicate-check feature.
   */
  async findDuplicates(userId: string, merchant: string, amount: number, date: string) {
    // Phase 1: O(1) bloom check
    const maybe = await this.maybeDuplicate(userId, merchant, amount, date);
    if (!maybe) {
      return { skipped: true, candidates: [] as Array<unknown> };
    }

    // Phase 2: DB confirm with similarity scoring
    const dateObj = new Date(date);
    const startDate = new Date(dateObj.getTime() - 3 * 86400000).toISOString().split('T')[0];
    const endDate = new Date(dateObj.getTime() + 3 * 86400000).toISOString().split('T')[0];

    const { rows } = await getPool().query(
      `SELECT id, merchant, amount, date FROM receipts
       WHERE user_id = $1
         AND deleted_at IS NULL
         AND date BETWEEN $2 AND $3
         AND amount BETWEEN $4 AND $5
         AND LOWER(merchant) = LOWER($6)`,
      [userId, startDate, endDate, amount * 0.95, amount * 1.05, merchant]
    );

    return { skipped: false, candidates: rows };
  }

  private async getOrBuildFilter(userId: string): Promise<BloomFilter> {
    const cached = bloomCache.get(userId);
    if (cached) return cached.bloom;

    const bloom = new BloomFilter({
      expectedItems: EXPECTED_RECEIPTS_PER_USER,
      falsePositiveRate: FALSE_POSITIVE_RATE,
    });

    const { rows } = await getPool().query(
      `SELECT merchant, amount, date FROM receipts WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    for (const r of rows) {
      const dateStr = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date);
      bloom.add(receiptFingerprint(r.merchant, parseFloat(r.amount), dateStr));
    }

    bloomCache.set(userId, { bloom, builtAt: Date.now() });
    logger.debug({
      msg: 'Bloom filter built',
      userId,
      receipts: rows.length,
      bits: bloom.capacity,
      hashes: bloom.hashes,
      estimatedFPR: bloom.estimatedFalsePositiveRate(),
    });
    return bloom;
  }
}

export const duplicateBloomFilter = new DuplicateBloomService();
