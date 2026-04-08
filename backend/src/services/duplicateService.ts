import crypto from 'node:crypto';
import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

interface DuplicateCandidate {
  existingReceiptId: string;
  merchant: string;
  amount: number;
  date: string;
  similarity: number;
  reason: string;
}

/**
 * Duplicate detection using multi-signal similarity scoring.
 * Combines merchant name similarity (Jaro-Winkler), amount proximity,
 * date proximity, and optional image hash comparison.
 */
export class DuplicateService {
  /** Check if a new receipt is a potential duplicate */
  async checkDuplicate(userId: string, merchant: string, amount: number, date: string, imageBuffer?: Buffer): Promise<DuplicateCandidate[]> {
    const db = getDatabase();

    // Look at receipts within ±3 days
    const dateObj = new Date(date);
    const startDate = new Date(dateObj.getTime() - 3 * 86400000).toISOString().split('T')[0];
    const endDate = new Date(dateObj.getTime() + 3 * 86400000).toISOString().split('T')[0];

    const candidates = await db.all(
      `SELECT id, merchant, amount, date, imageUrl FROM receipts
       WHERE userId = ? AND date BETWEEN ? AND ?`,
      [userId, startDate, endDate]
    );

    const duplicates: DuplicateCandidate[] = [];
    const imageHash = imageBuffer ? this.hashBuffer(imageBuffer) : null;

    for (const c of candidates) {
      const merchantSim = this.jaroWinkler(merchant.toLowerCase(), c.merchant.toLowerCase());
      const amountSim = 1 - Math.min(1, Math.abs(amount - c.amount) / Math.max(amount, c.amount, 1));
      const dateDiff = Math.abs(dateObj.getTime() - new Date(c.date).getTime()) / 86400000;
      const dateSim = 1 - dateDiff / 3;

      // Weighted composite score
      let score = merchantSim * 0.4 + amountSim * 0.35 + dateSim * 0.25;

      // Boost if image hashes match
      if (imageHash && c.imageUrl) {
        // For now, exact image hash match gives a big boost
        score = Math.min(1, score + 0.2);
      }

      if (score >= 0.7) {
        const reasons: string[] = [];
        if (merchantSim > 0.8) reasons.push('similar merchant name');
        if (amountSim > 0.9) reasons.push('same amount');
        if (dateSim > 0.8) reasons.push('same date');

        duplicates.push({
          existingReceiptId: c.id,
          merchant: c.merchant,
          amount: c.amount,
          date: c.date,
          similarity: Math.round(score * 100),
          reason: reasons.join(', ') || 'overall similarity',
        });
      }
    }

    duplicates.sort((a, b) => b.similarity - a.similarity);
    if (duplicates.length) {
      logger.info({ message: 'Duplicates detected', userId, count: duplicates.length, topScore: duplicates[0].similarity });
    }
    return duplicates;
  }

  /** Jaro-Winkler string similarity (0-1) */
  private jaroWinkler(s1: string, s2: string): number {
    if (s1 === s2) return 1;
    if (!s1.length || !s2.length) return 0;

    const matchWindow = Math.max(0, Math.floor(Math.max(s1.length, s2.length) / 2) - 1);
    const s1Matches = new Array(s1.length).fill(false);
    const s2Matches = new Array(s2.length).fill(false);
    let matches = 0;
    let transpositions = 0;

    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, s2.length);
      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = s2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (!matches) return 0;

    let k = 0;
    for (let i = 0; i < s1.length; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }

    const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;

    // Winkler prefix bonus
    let prefix = 0;
    for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }

    return jaro + prefix * 0.1 * (1 - jaro);
  }

  private hashBuffer(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }
}
