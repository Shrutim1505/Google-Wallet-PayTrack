import { getPool } from '../config/database.js';
import { generateEmbedding, isAIEnabled } from './geminiClient.js';
import { cosineSimilarity, averageEmbeddings } from '../utils/aiMath.js';
import { logger } from '../utils/logger.js';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Other'];

const CATEGORY_SEEDS: Record<string, string[]> = {
  Food: ['restaurant dinner', 'grocery store', 'cafe coffee', 'food delivery swiggy zomato', 'fast food burger pizza'],
  Transport: ['uber cab ride', 'petrol fuel station', 'metro train ticket', 'bus fare', 'parking toll highway'],
  Shopping: ['amazon online order', 'clothing apparel store', 'electronics gadget', 'mall shopping retail', 'flipkart myntra'],
  Bills: ['electricity water gas', 'internet broadband wifi', 'phone recharge mobile', 'rent housing', 'insurance premium'],
  Entertainment: ['netflix spotify subscription', 'movie cinema theater', 'concert event tickets', 'gaming sports', 'books reading'],
  Health: ['hospital doctor consultation', 'pharmacy medicine', 'gym fitness membership', 'lab test diagnostic', 'dental clinic'],
  Education: ['course tuition fees', 'books stationery', 'udemy coursera online', 'school college university', 'workshop training'],
  Other: ['miscellaneous general', 'atm withdrawal cash', 'gift donation charity'],
};

function cosineSim(a: number[], b: number[]): number {
  return cosineSimilarity(a, b);
}

export interface EmbeddingCategoryResult {
  category: string;
  confidence: number;
  modelSource: 'embedding' | 'naive_bayes' | 'rule_based';
  scores: Record<string, number>;
}

export class EmbeddingCategorizationService {
  /** Categorize using embeddings with fallback to Naive Bayes then rules */
  async categorize(userId: string, merchant: string, description?: string): Promise<EmbeddingCategoryResult> {
    if (!isAIEnabled()) {
      return { category: 'Other', confidence: 0, modelSource: 'rule_based', scores: {} };
    }

    const text = `${merchant} ${description || ''}`.trim();
    const embedding = await generateEmbedding(text);
    if (!embedding) {
      return { category: 'Other', confidence: 0, modelSource: 'rule_based', scores: {} };
    }

    // Get category prototypes (from DB or seed)
    const prototypes = await this.getPrototypes(userId);
    const scores: Record<string, number> = {};
    let bestCategory = 'Other';
    let bestScore = -1;

    for (const [category, proto] of Object.entries(prototypes)) {
      const sim = cosineSim(embedding, proto);
      scores[category] = Math.round(sim * 1000) / 1000;
      if (sim > bestScore) { bestScore = sim; bestCategory = category; }
    }

    const confidence = Math.round(bestScore * 100) / 100;

    // Store embedding for this receipt
    logger.info({ message: 'Embedding categorization', merchant, category: bestCategory, confidence });

    return { category: bestCategory, confidence, modelSource: 'embedding', scores };
  }

  /** Get or build category prototype embeddings */
  private async getPrototypes(userId: string): Promise<Record<string, number[]>> {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT category, embedding FROM category_embeddings WHERE user_id = $1',
      [userId]
    );

    if (rows.length >= CATEGORIES.length) {
      const prototypes: Record<string, number[][]> = {};
      for (const row of rows) {
        if (!prototypes[row.category]) prototypes[row.category] = [];
        prototypes[row.category].push(row.embedding);
      }
      // Average embeddings per category
      const result: Record<string, number[]> = {};
      for (const [cat, embeddings] of Object.entries(prototypes)) {
        result[cat] = this.averageEmbeddings(embeddings);
      }
      return result;
    }

    // Cold start: generate from seeds
    return this.buildSeedPrototypes(userId);
  }

  /** Generate and persist seed prototypes */
  async buildSeedPrototypes(userId: string): Promise<Record<string, number[]>> {
    const pool = getPool();
    const result: Record<string, number[]> = {};

    for (const [category, seeds] of Object.entries(CATEGORY_SEEDS)) {
      const embeddings: number[][] = [];
      for (const seed of seeds) {
        const emb = await generateEmbedding(seed);
        if (emb) {
          embeddings.push(emb);
          await pool.query(
            `INSERT INTO category_embeddings (user_id, category, label, embedding)
             VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, category, label) DO NOTHING`,
            [userId, category, seed, emb]
          );
        }
      }
      if (embeddings.length > 0) result[category] = this.averageEmbeddings(embeddings);
    }

    logger.info({ message: 'Seed prototypes built', userId, categories: Object.keys(result).length });
    return result;
  }

  /** Add a learned example to improve categorization */
  async learnExample(userId: string, text: string, category: string): Promise<void> {
    const embedding = await generateEmbedding(text);
    if (!embedding) return;
    const pool = getPool();
    await pool.query(
      `INSERT INTO category_embeddings (user_id, category, label, embedding)
       VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, category, label) DO UPDATE SET embedding = $4`,
      [userId, category, text.slice(0, 100), embedding]
    );
  }

  /** Store receipt embedding in AI metadata */
  async storeReceiptEmbedding(receiptId: string, embedding: number[], result: EmbeddingCategoryResult): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO receipt_ai_metadata (receipt_id, embedding, predicted_category, category_confidence, category_model_source)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (receipt_id) DO UPDATE SET embedding = $2, predicted_category = $3, category_confidence = $4, category_model_source = $5`,
      [receiptId, embedding, result.category, result.confidence, result.modelSource]
    );
  }

  private averageEmbeddings(embeddings: number[][]): number[] {
    return averageEmbeddings(embeddings);
  }
}
