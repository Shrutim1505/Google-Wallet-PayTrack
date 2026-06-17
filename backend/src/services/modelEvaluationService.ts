import { getPool } from '../config/database.js';
import { logger } from '../utils/logger.js';

export interface EvaluationMetrics {
  accuracy: number;
  precision: Record<string, number>;
  recall: Record<string, number>;
  f1: Record<string, number>;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  confusionMatrix: Record<string, Record<string, number>>;
  sampleSize: number;
}

export class ModelEvaluationService {
  /** Evaluate a model by comparing predictions against ground truth (user-corrected categories) */
  async evaluate(userId: string, modelName: string): Promise<EvaluationMetrics> {
    const pool = getPool();

    // Ground truth: receipts where user has explicitly set category (from ml_training_data corrections)
    const { rows: corrections } = await pool.query(
      'SELECT merchant, category FROM ml_training_data WHERE user_id = $1',
      [userId]
    );

    // Also use receipts that were manually created (isManualEntry = true) as ground truth
    const { rows: manualReceipts } = await pool.query(
      'SELECT merchant, category FROM receipts WHERE user_id = $1 AND is_manual_entry = true AND category IS NOT NULL',
      [userId]
    );

    // Get AI predictions from metadata
    const { rows: predictions } = await pool.query(
      `SELECT r.merchant, r.category as actual, m.predicted_category as predicted, m.category_model_source
       FROM receipts r JOIN receipt_ai_metadata m ON r.id = m.receipt_id
       WHERE r.user_id = $1 AND m.predicted_category IS NOT NULL`,
      [userId]
    );

    const groundTruth = [...corrections, ...manualReceipts];
    const allCategories = [...new Set([...groundTruth.map(r => r.category), ...predictions.map(r => r.actual)])];

    // Build confusion matrix
    const matrix: Record<string, Record<string, number>> = {};
    for (const cat of allCategories) { matrix[cat] = {}; for (const c of allCategories) matrix[cat][c] = 0; }

    let correct = 0;
    const evalPairs = predictions.filter(p => p.actual && p.predicted);

    for (const { actual, predicted } of evalPairs) {
      if (matrix[actual]) {
        matrix[actual][predicted] = (matrix[actual][predicted] || 0) + 1;
      }
      if (actual === predicted) correct++;
    }

    const accuracy = evalPairs.length > 0 ? correct / evalPairs.length : 0;

    // Per-class precision, recall, F1
    const precision: Record<string, number> = {};
    const recall: Record<string, number> = {};
    const f1: Record<string, number> = {};

    for (const cat of allCategories) {
      const tp = matrix[cat]?.[cat] || 0;
      const fp = allCategories.reduce((s, c) => s + (c !== cat ? (matrix[c]?.[cat] || 0) : 0), 0);
      const fn = allCategories.reduce((s, c) => s + (c !== cat ? (matrix[cat]?.[c] || 0) : 0), 0);

      precision[cat] = tp + fp > 0 ? tp / (tp + fp) : 0;
      recall[cat] = tp + fn > 0 ? tp / (tp + fn) : 0;
      f1[cat] = precision[cat] + recall[cat] > 0
        ? 2 * (precision[cat] * recall[cat]) / (precision[cat] + recall[cat]) : 0;
    }

    const categories = allCategories.filter(c => matrix[c] && Object.values(matrix[c]).some(v => v > 0));
    const macroPrecision = categories.length > 0 ? categories.reduce((s, c) => s + precision[c], 0) / categories.length : 0;
    const macroRecall = categories.length > 0 ? categories.reduce((s, c) => s + recall[c], 0) / categories.length : 0;
    const macroF1 = macroPrecision + macroRecall > 0 ? 2 * (macroPrecision * macroRecall) / (macroPrecision + macroRecall) : 0;

    const metrics: EvaluationMetrics = {
      accuracy: Math.round(accuracy * 1000) / 1000,
      precision, recall, f1,
      macroPrecision: Math.round(macroPrecision * 1000) / 1000,
      macroRecall: Math.round(macroRecall * 1000) / 1000,
      macroF1: Math.round(macroF1 * 1000) / 1000,
      confusionMatrix: matrix,
      sampleSize: evalPairs.length,
    };

    // Persist
    await pool.query(
      `INSERT INTO model_evaluations (user_id, model_name, accuracy, precision_score, recall_score, f1_score, confusion_matrix, sample_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, modelName, metrics.accuracy, metrics.macroPrecision, metrics.macroRecall, metrics.macroF1, JSON.stringify(matrix), metrics.sampleSize]
    );

    logger.info({ message: 'Model evaluated', userId, modelName, accuracy: metrics.accuracy, sampleSize: metrics.sampleSize });
    return metrics;
  }

  /** Get historical evaluation metrics */
  async getHistory(userId: string, limit = 20): Promise<any[]> {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT model_name, accuracy, precision_score, recall_score, f1_score, confusion_matrix, sample_size, evaluated_at
       FROM model_evaluations WHERE user_id = $1 ORDER BY evaluated_at DESC LIMIT $2`,
      [userId, limit]
    );
    return rows.map(r => ({
      modelName: r.model_name,
      accuracy: parseFloat(r.accuracy),
      precision: parseFloat(r.precision_score),
      recall: parseFloat(r.recall_score),
      f1: parseFloat(r.f1_score),
      confusionMatrix: r.confusion_matrix,
      sampleSize: r.sample_size,
      evaluatedAt: r.evaluated_at,
    }));
  }
}
