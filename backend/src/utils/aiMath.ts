/**
 * Pure mathematical functions for the AI layer.
 * Separated from services (which handle I/O) so they can be unit-tested
 * in isolation without a database or external API.
 */

/** Cosine similarity between two equal-length vectors. Returns 0 for zero vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** Element-wise average of a list of equal-length vectors. */
export function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  const dim = embeddings[0].length;
  const avg = new Array(dim).fill(0);
  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) avg[i] += emb[i];
  }
  for (let i = 0; i < dim; i++) avg[i] /= embeddings.length;
  return avg;
}

/** Population standard deviation. */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Holt's linear exponential smoothing.
 * Returns `horizon` forecasted values (clamped at 0).
 */
export function exponentialSmoothing(data: number[], horizon: number, alpha = 0.3, beta = 0.1): number[] {
  if (data.length === 0) return new Array(horizon).fill(0);
  if (data.length === 1) return new Array(horizon).fill(Math.max(0, data[0]));

  let level = data[0];
  let trend = data[1] - data[0];

  for (let i = 1; i < data.length; i++) {
    const prevLevel = level;
    level = alpha * data[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  const forecasts: number[] = [];
  for (let i = 1; i <= horizon; i++) {
    forecasts.push(Math.max(0, level + trend * i));
  }
  return forecasts;
}

/** Simple moving average forecast — repeats the windowed mean. */
export function movingAverage(data: number[], horizon: number, window = 7): number[] {
  if (data.length === 0) return new Array(horizon).fill(0);
  const recent = data.slice(-window);
  const avg = recent.reduce((s, v) => s + v, 0) / recent.length;
  return new Array(horizon).fill(Math.round(avg));
}

export interface ClassificationMetrics {
  accuracy: number;
  precision: Record<string, number>;
  recall: Record<string, number>;
  f1: Record<string, number>;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  confusionMatrix: Record<string, Record<string, number>>;
}

/**
 * Compute classification metrics from (actual, predicted) pairs.
 * Builds a confusion matrix and derives per-class + macro precision/recall/F1.
 */
export function computeClassificationMetrics(pairs: Array<{ actual: string; predicted: string }>): ClassificationMetrics {
  const categories = [...new Set(pairs.flatMap(p => [p.actual, p.predicted]))];
  const matrix: Record<string, Record<string, number>> = {};
  for (const c of categories) { matrix[c] = {}; for (const c2 of categories) matrix[c][c2] = 0; }

  let correct = 0;
  for (const { actual, predicted } of pairs) {
    matrix[actual][predicted]++;
    if (actual === predicted) correct++;
  }

  const accuracy = pairs.length > 0 ? correct / pairs.length : 0;
  const precision: Record<string, number> = {};
  const recall: Record<string, number> = {};
  const f1: Record<string, number> = {};

  for (const cat of categories) {
    const tp = matrix[cat][cat];
    const fp = categories.reduce((s, c) => s + (c !== cat ? matrix[c][cat] : 0), 0);
    const fn = categories.reduce((s, c) => s + (c !== cat ? matrix[cat][c] : 0), 0);
    precision[cat] = tp + fp > 0 ? tp / (tp + fp) : 0;
    recall[cat] = tp + fn > 0 ? tp / (tp + fn) : 0;
    f1[cat] = precision[cat] + recall[cat] > 0 ? 2 * (precision[cat] * recall[cat]) / (precision[cat] + recall[cat]) : 0;
  }

  const n = categories.length || 1;
  const macroPrecision = categories.reduce((s, c) => s + precision[c], 0) / n;
  const macroRecall = categories.reduce((s, c) => s + recall[c], 0) / n;
  const macroF1 = macroPrecision + macroRecall > 0 ? 2 * (macroPrecision * macroRecall) / (macroPrecision + macroRecall) : 0;

  return { accuracy, precision, recall, f1, macroPrecision, macroRecall, macroF1, confusionMatrix: matrix };
}
