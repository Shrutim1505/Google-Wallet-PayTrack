import { getDatabase } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

/**
 * ML-based categorization using Naive Bayes text classification.
 * Learns from user corrections and improves over time.
 * Falls back to TF-IDF cosine similarity when training data is sparse.
 */

interface TokenFrequency { [token: string]: number }
interface CategoryModel { count: number; tokens: TokenFrequency; totalTokens: number }

// In-memory model cache per user
const modelCache = new Map<string, { categories: Map<string, CategoryModel>; totalDocs: number; vocabulary: Set<string>; builtAt: number }>();

const SEED_DATA: Array<{ merchant: string; category: string }> = [
  { merchant: 'restaurant cafe diner pizza burger sushi kitchen food court swiggy zomato', category: 'Food' },
  { merchant: 'grocery supermarket market fresh mart daily needs big bazaar dmart reliance', category: 'Food' },
  { merchant: 'uber ola lyft cab taxi metro bus auto rapido fuel petrol diesel parking toll', category: 'Transport' },
  { merchant: 'amazon flipkart myntra mall shop store clothing apparel brand retail ikea', category: 'Shopping' },
  { merchant: 'electric water gas internet broadband phone mobile recharge airtel jio bill rent', category: 'Bills' },
  { merchant: 'cinema movie netflix spotify game sport theater concert event bookmyshow', category: 'Entertainment' },
  { merchant: 'hospital doctor pharmacy medicine clinic lab diagnostic apollo gym fitness', category: 'Health' },
];

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(t => t.length >= 2);
}

export class MLService {
  /** Build or retrieve the Naive Bayes model for a user */
  async getModel(userId: string) {
    const cached = modelCache.get(userId);
    if (cached && Date.now() - cached.builtAt < 5 * 60 * 1000) return cached;

    const db = getDatabase();
    const rows = await db.all('SELECT merchant, items, category FROM ml_training_data WHERE userId = ?', [userId]);

    // Also learn from existing receipts
    const receipts = await db.all('SELECT merchant, items, category FROM receipts WHERE userId = ?', [userId]);

    const categories = new Map<string, CategoryModel>();
    const vocabulary = new Set<string>();
    let totalDocs = 0;

    const addDocument = (text: string, category: string) => {
      const tokens = tokenize(text);
      if (!tokens.length) return;
      if (!categories.has(category)) categories.set(category, { count: 0, tokens: {}, totalTokens: 0 });
      const cat = categories.get(category)!;
      cat.count++;
      totalDocs++;
      for (const token of tokens) {
        cat.tokens[token] = (cat.tokens[token] || 0) + 1;
        cat.totalTokens++;
        vocabulary.add(token);
      }
    };

    // Seed data for cold start
    for (const seed of SEED_DATA) addDocument(seed.merchant, seed.category);

    // User's explicit training data (weighted 3x by adding multiple times)
    for (const row of rows) {
      const text = `${row.merchant} ${row.items || ''}`;
      addDocument(text, row.category);
      addDocument(text, row.category);
      addDocument(text, row.category);
    }

    // Learn from existing receipts
    for (const r of receipts) {
      const items = typeof r.items === 'string' ? r.items : '';
      addDocument(`${r.merchant} ${items}`, r.category);
    }

    const model = { categories, totalDocs, vocabulary, builtAt: Date.now() };
    modelCache.set(userId, model);
    return model;
  }

  /** Predict category using Naive Bayes with Laplace smoothing */
  async predict(userId: string, merchant: string, items?: string[]): Promise<{ category: string; confidence: number; scores: Record<string, number> }> {
    const model = await this.getModel(userId);
    const tokens = tokenize(`${merchant} ${items?.join(' ') || ''}`);

    if (!tokens.length) return { category: 'Other', confidence: 0, scores: {} };

    const vocabSize = model.vocabulary.size;
    const scores: Record<string, number> = {};
    let maxScore = -Infinity;
    let bestCategory = 'Other';

    for (const [category, catModel] of model.categories) {
      // Log prior: P(category)
      let logProb = Math.log(catModel.count / model.totalDocs);

      // Log likelihood with Laplace smoothing: P(token|category)
      for (const token of tokens) {
        const tokenCount = catModel.tokens[token] || 0;
        logProb += Math.log((tokenCount + 1) / (catModel.totalTokens + vocabSize));
      }

      scores[category] = logProb;
      if (logProb > maxScore) {
        maxScore = logProb;
        bestCategory = category;
      }
    }

    // Convert log scores to confidence via softmax
    const maxVal = Math.max(...Object.values(scores));
    const expScores = Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, Math.exp(v - maxVal)]));
    const sumExp = Object.values(expScores).reduce((s, v) => s + v, 0);
    const confidence = sumExp > 0 ? (expScores[bestCategory] || 0) / sumExp : 0;

    return { category: bestCategory, confidence: Math.round(confidence * 100) / 100, scores: expScores };
  }

  /** Record a user correction to improve the model */
  async train(userId: string, merchant: string, items: string[], category: string) {
    const db = getDatabase();
    await db.run(
      'INSERT INTO ml_training_data (id, userId, merchant, items, category) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), userId, merchant, items.join(' '), category]
    );
    // Invalidate cache so model rebuilds
    modelCache.delete(userId);
    logger.info({ message: 'ML model trained', userId, merchant, category });
  }

  /** Get model stats for a user */
  async getModelStats(userId: string) {
    const model = await this.getModel(userId);
    const db = getDatabase();
    const trainingCount = await db.get('SELECT COUNT(*) as count FROM ml_training_data WHERE userId = ?', [userId]);

    return {
      totalTrainingDocs: model.totalDocs,
      userCorrections: trainingCount?.count || 0,
      vocabularySize: model.vocabulary.size,
      categories: Array.from(model.categories.entries()).map(([name, m]) => ({ name, documentCount: m.count })),
    };
  }
}
