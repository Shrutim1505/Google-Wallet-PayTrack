import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity, averageEmbeddings, standardDeviation,
  exponentialSmoothing, movingAverage, computeClassificationMetrics,
} from '../utils/aiMath.js';

describe('aiMath', () => {
  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
    });

    it('returns 0 for orthogonal vectors', () => {
      expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
    });

    it('returns -1 for opposite vectors', () => {
      expect(cosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1, 5);
    });

    it('returns 0 for zero vector (no division by zero)', () => {
      expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
    });

    it('returns 0 for mismatched lengths', () => {
      expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    });

    it('is symmetric', () => {
      const a = [0.5, 0.3, 0.9];
      const b = [0.1, 0.8, 0.2];
      expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 10);
    });
  });

  describe('averageEmbeddings', () => {
    it('averages element-wise', () => {
      expect(averageEmbeddings([[0, 0], [2, 4]])).toEqual([1, 2]);
    });

    it('returns empty for empty input', () => {
      expect(averageEmbeddings([])).toEqual([]);
    });

    it('returns the same vector for a single embedding', () => {
      expect(averageEmbeddings([[1, 2, 3]])).toEqual([1, 2, 3]);
    });
  });

  describe('standardDeviation', () => {
    it('is 0 for constant values', () => {
      expect(standardDeviation([5, 5, 5])).toBe(0);
    });

    it('computes population std dev', () => {
      // values [2,4,4,4,5,5,7,9] -> std dev = 2
      expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 5);
    });

    it('returns 0 for empty', () => {
      expect(standardDeviation([])).toBe(0);
    });
  });

  describe('exponentialSmoothing', () => {
    it('forecasts a flat series as roughly constant', () => {
      const f = exponentialSmoothing([100, 100, 100, 100], 3);
      expect(f).toHaveLength(3);
      f.forEach(v => expect(v).toBeCloseTo(100, 0));
    });

    it('captures an increasing trend', () => {
      const f = exponentialSmoothing([10, 20, 30, 40, 50], 3);
      // Forecast should continue upward
      expect(f[2]).toBeGreaterThan(f[0]);
      expect(f[0]).toBeGreaterThan(50 - 30); // some forward projection
    });

    it('never returns negative values', () => {
      const f = exponentialSmoothing([100, 50, 10, 1], 10);
      f.forEach(v => expect(v).toBeGreaterThanOrEqual(0));
    });

    it('handles single data point', () => {
      expect(exponentialSmoothing([42], 3)).toEqual([42, 42, 42]);
    });

    it('handles empty data', () => {
      expect(exponentialSmoothing([], 2)).toEqual([0, 0]);
    });
  });

  describe('movingAverage', () => {
    it('returns the window mean repeated', () => {
      expect(movingAverage([10, 20, 30], 2, 3)).toEqual([20, 20]);
    });

    it('handles empty data', () => {
      expect(movingAverage([], 2)).toEqual([0, 0]);
    });
  });

  describe('computeClassificationMetrics', () => {
    it('reports perfect metrics for perfect predictions', () => {
      const pairs = [
        { actual: 'Food', predicted: 'Food' },
        { actual: 'Transport', predicted: 'Transport' },
        { actual: 'Food', predicted: 'Food' },
      ];
      const m = computeClassificationMetrics(pairs);
      expect(m.accuracy).toBe(1);
      expect(m.macroF1).toBeCloseTo(1, 5);
      expect(m.precision['Food']).toBe(1);
      expect(m.recall['Food']).toBe(1);
    });

    it('computes accuracy correctly for mixed predictions', () => {
      const pairs = [
        { actual: 'Food', predicted: 'Food' },      // correct
        { actual: 'Food', predicted: 'Transport' },  // wrong
        { actual: 'Transport', predicted: 'Transport' }, // correct
        { actual: 'Transport', predicted: 'Transport' }, // correct
      ];
      const m = computeClassificationMetrics(pairs);
      expect(m.accuracy).toBe(0.75);
    });

    it('builds a correct confusion matrix', () => {
      const pairs = [
        { actual: 'A', predicted: 'A' },
        { actual: 'A', predicted: 'B' },
        { actual: 'B', predicted: 'B' },
      ];
      const m = computeClassificationMetrics(pairs);
      expect(m.confusionMatrix['A']['A']).toBe(1);
      expect(m.confusionMatrix['A']['B']).toBe(1);
      expect(m.confusionMatrix['B']['B']).toBe(1);
    });

    it('computes precision and recall for a class correctly', () => {
      // Class A: predicted A 2 times, 1 correct -> precision 0.5
      //          actual A 1 time, 1 correct -> recall 1.0
      const pairs = [
        { actual: 'A', predicted: 'A' },
        { actual: 'B', predicted: 'A' },
        { actual: 'B', predicted: 'B' },
      ];
      const m = computeClassificationMetrics(pairs);
      expect(m.precision['A']).toBeCloseTo(0.5, 5);
      expect(m.recall['A']).toBeCloseTo(1.0, 5);
      expect(m.f1['A']).toBeCloseTo(2 * (0.5 * 1) / (0.5 + 1), 5);
    });

    it('handles empty input', () => {
      const m = computeClassificationMetrics([]);
      expect(m.accuracy).toBe(0);
      expect(m.macroF1).toBe(0);
    });
  });
});
