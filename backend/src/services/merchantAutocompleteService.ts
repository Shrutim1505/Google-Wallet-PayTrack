/**
 * Merchant Autocomplete Service — Trie-backed prefix search.
 *
 * Maintains a per-user Trie of merchants from their receipts.
 * Lazy-loaded on first use, kept in memory, refreshed periodically.
 *
 * Performance:
 *   • Naive SQL query (`WHERE merchant ILIKE 'prefix%'`): O(N × L) per request, hits DB
 *   • Trie lookup: O(L) where L = prefix length, in-memory
 */

import { Trie } from '../algorithms/Trie.js';
import { LRUCache } from '../algorithms/LRUCache.js';
import { getPool } from '../config/database.js';
import { logger } from '../utils/logger.js';

interface UserTrie {
  trie: Trie;
  builtAt: number;
}

// Cache one trie per user. Auto-evicts when capacity reached.
const trieCache = new LRUCache<string, UserTrie>({
  capacity: 1000,             // Up to 1000 active users in memory
  defaultTtlMs: 10 * 60_000,  // Refresh trie every 10 minutes
});

const REBUILD_AFTER_INSERTS = 50; // After this many inserts, rebuild from DB
const insertCounters = new Map<string, number>();

export class MerchantAutocompleteService {
  /**
   * Search merchants by prefix.
   * Returns top suggestions ranked by frequency (most-used first).
   */
  async search(userId: string, prefix: string, limit = 10): Promise<string[]> {
    if (!prefix || prefix.length < 1) return [];

    const trie = await this.getOrBuildTrie(userId);
    const matches = trie.search(prefix, limit);
    return matches.map(m => m.word);
  }

  /**
   * Notify the service that a new receipt was created.
   * Updates the in-memory trie incrementally without rebuilding.
   */
  recordMerchant(userId: string, merchant: string): void {
    const cached = trieCache.get(userId);
    if (cached) {
      cached.trie.insert(merchant);
    }

    // Periodic full rebuild keeps trie in sync with deletions
    const count = (insertCounters.get(userId) || 0) + 1;
    if (count >= REBUILD_AFTER_INSERTS) {
      trieCache.delete(userId);
      insertCounters.delete(userId);
    } else {
      insertCounters.set(userId, count);
    }
  }

  /** Force-rebuild the trie for a user (e.g. after bulk delete). */
  invalidate(userId: string): void {
    trieCache.delete(userId);
    insertCounters.delete(userId);
  }

  /** Get cache statistics for monitoring. */
  getCacheStats() {
    return trieCache.stats;
  }

  private async getOrBuildTrie(userId: string): Promise<Trie> {
    const cached = trieCache.get(userId);
    if (cached) return cached.trie;

    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT merchant, COUNT(*)::int as freq
       FROM receipts
       WHERE user_id = $1 AND deleted_at IS NULL
       GROUP BY merchant`,
      [userId]
    );

    const trie = new Trie();
    for (const row of rows) {
      // Insert with frequency by calling insert() multiple times,
      // which lets the trie naturally rank by usage.
      for (let i = 0; i < row.freq; i++) {
        trie.insert(row.merchant);
      }
    }

    trieCache.set(userId, { trie, builtAt: Date.now() });
    logger.debug({ msg: 'Trie built', userId, merchants: trie.size, totalRecords: rows.length });
    return trie;
  }
}

// Singleton instance
export const merchantAutocomplete = new MerchantAutocompleteService();
