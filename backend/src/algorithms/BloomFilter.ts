/**
 * Bloom filter — a space-efficient probabilistic data structure
 * for testing set membership.
 *
 * Properties:
 *   • False positives possible (says "maybe present" when not)
 *   • False negatives IMPOSSIBLE (if it says "not present", it's definitely not)
 *   • Memory: ~10 bits per item for ~1% false positive rate
 *
 * Use case in PayTrack: pre-check for duplicate receipts BEFORE doing
 * an expensive PostgreSQL similarity query. If the bloom filter says
 * "definitely not a duplicate", we skip the DB call entirely.
 *
 *   Bloom: definitely not in set    →  skip DB call (most receipts are unique)
 *   Bloom: maybe in set              →  fall back to DB check
 *
 * For 100,000 receipts at 1% false positive rate:
 *   • Memory: ~120 KB
 *   • Skipped DB queries: ~99% of unique-receipt insertions
 */

import { createHash } from 'node:crypto';

export interface BloomFilterOptions {
  /** Expected number of items the filter will hold. */
  expectedItems: number;
  /** Target false positive rate (0 < x < 1). Default: 0.01 (1%). */
  falsePositiveRate?: number;
}

export class BloomFilter {
  private readonly bits: Uint8Array;
  private readonly bitSize: number;
  private readonly hashCount: number;
  private itemCount = 0;

  constructor(options: BloomFilterOptions) {
    const { expectedItems, falsePositiveRate = 0.01 } = options;

    if (expectedItems <= 0 || falsePositiveRate <= 0 || falsePositiveRate >= 1) {
      throw new Error('Invalid bloom filter parameters');
    }

    // Optimal size: m = -n * ln(p) / (ln(2)^2)
    this.bitSize = Math.max(8, Math.ceil(-(expectedItems * Math.log(falsePositiveRate)) / Math.LN2 ** 2));
    // Optimal hash count: k = (m / n) * ln(2)
    this.hashCount = Math.max(1, Math.round((this.bitSize / expectedItems) * Math.LN2));

    // Round up to byte boundary
    const byteSize = Math.ceil(this.bitSize / 8);
    this.bits = new Uint8Array(byteSize);
  }

  /** Number of bits in the filter. */
  get capacity(): number {
    return this.bitSize;
  }

  /** Number of hash functions. */
  get hashes(): number {
    return this.hashCount;
  }

  /** Approximate number of items added. */
  get size(): number {
    return this.itemCount;
  }

  /** Add an item to the filter. Time: O(k) where k = hashCount. */
  add(item: string): void {
    for (const idx of this.hashIndices(item)) {
      const byte = idx >>> 3;       // idx / 8
      const bit = idx & 7;           // idx % 8
      this.bits[byte] |= 1 << bit;
    }
    this.itemCount++;
  }

  /**
   * Check if an item might be in the set.
   * Returns: true (maybe present) / false (definitely not present).
   * Time: O(k).
   */
  has(item: string): boolean {
    for (const idx of this.hashIndices(item)) {
      const byte = idx >>> 3;
      const bit = idx & 7;
      if ((this.bits[byte] & (1 << bit)) === 0) return false;
    }
    return true;
  }

  /** Estimated false positive rate at current load. */
  estimatedFalsePositiveRate(): number {
    // P = (1 - e^(-k*n/m))^k
    return Math.pow(1 - Math.exp(-this.hashCount * this.itemCount / this.bitSize), this.hashCount);
  }

  /** Reset the filter. */
  clear(): void {
    this.bits.fill(0);
    this.itemCount = 0;
  }

  /**
   * Generate `hashCount` independent indices using the
   * double-hashing technique (Kirsch-Mitzenmacher):
   *   h_i(x) = (h1(x) + i * h2(x)) mod m
   *
   * This avoids computing k expensive hashes — we compute 2 and derive k.
   */
  private *hashIndices(item: string): IterableIterator<number> {
    const h1 = this.hash(item, 'sha256');
    const h2 = this.hash(item, 'md5');

    for (let i = 0; i < this.hashCount; i++) {
      const combined = (h1 + i * h2) >>> 0; // unsigned
      yield combined % this.bitSize;
    }
  }

  private hash(item: string, algo: 'sha256' | 'md5'): number {
    const buf = createHash(algo).update(item).digest();
    // Use first 4 bytes as a 32-bit int
    return buf.readUInt32BE(0);
  }
}

/**
 * Helper: build a deterministic fingerprint for a receipt.
 * Used by duplicate detection — if two receipts have the same fingerprint,
 * they're either duplicates or a near-collision.
 */
export function receiptFingerprint(merchant: string, amount: number, date: string): string {
  // Normalize merchant: lowercase, collapse whitespace, strip punctuation
  const m = merchant.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  // Round amount to 2 decimals, normalize date to YYYY-MM-DD
  const a = Math.round(amount * 100) / 100;
  const d = date.slice(0, 10);
  return `${m}|${a}|${d}`;
}
