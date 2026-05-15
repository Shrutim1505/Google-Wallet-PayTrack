import { describe, it, expect } from 'vitest';
import { BloomFilter, receiptFingerprint } from '../algorithms/BloomFilter.js';

describe('BloomFilter', () => {
  describe('basic operations', () => {
    it('reports added items as present', () => {
      const bf = new BloomFilter({ expectedItems: 100 });
      bf.add('hello');
      expect(bf.has('hello')).toBe(true);
    });

    it('reports never-added items as absent (with high probability)', () => {
      const bf = new BloomFilter({ expectedItems: 100, falsePositiveRate: 0.01 });
      bf.add('apple');
      bf.add('banana');
      expect(bf.has('orange')).toBe(false);
    });

    it('NEVER returns false for an added item (no false negatives)', () => {
      const bf = new BloomFilter({ expectedItems: 1000, falsePositiveRate: 0.01 });
      const items: string[] = [];
      for (let i = 0; i < 500; i++) {
        const s = `item-${i}`;
        items.push(s);
        bf.add(s);
      }
      // Critical: every added item MUST be reported as present
      for (const item of items) {
        expect(bf.has(item)).toBe(true);
      }
    });
  });

  describe('false positive rate', () => {
    it('approximates the configured rate at full capacity', () => {
      const expectedItems = 1000;
      const targetFPR = 0.05;
      const bf = new BloomFilter({ expectedItems, falsePositiveRate: targetFPR });

      // Fill the filter
      for (let i = 0; i < expectedItems; i++) {
        bf.add(`real-item-${i}`);
      }

      // Test 5000 unseen items
      let falsePositives = 0;
      const probes = 5000;
      for (let i = 0; i < probes; i++) {
        if (bf.has(`unseen-item-${i}`)) falsePositives++;
      }

      const observedFPR = falsePositives / probes;
      // Allow 2× tolerance due to randomness
      expect(observedFPR).toBeLessThan(targetFPR * 2);
    });
  });

  describe('parameters', () => {
    it('chooses bit size and hash count based on n and p', () => {
      const bf = new BloomFilter({ expectedItems: 10000, falsePositiveRate: 0.01 });
      // Optimal m ≈ -n*ln(p)/(ln(2)^2) ≈ 95850 bits
      expect(bf.capacity).toBeGreaterThan(80000);
      expect(bf.capacity).toBeLessThan(120000);
      // Optimal k ≈ (m/n)*ln(2) ≈ 7
      expect(bf.hashes).toBeGreaterThanOrEqual(5);
      expect(bf.hashes).toBeLessThanOrEqual(10);
    });

    it('throws for invalid parameters', () => {
      expect(() => new BloomFilter({ expectedItems: 0 })).toThrow();
      expect(() => new BloomFilter({ expectedItems: 100, falsePositiveRate: 0 })).toThrow();
      expect(() => new BloomFilter({ expectedItems: 100, falsePositiveRate: 1 })).toThrow();
    });
  });

  describe('clear', () => {
    it('resets all bits and counter', () => {
      const bf = new BloomFilter({ expectedItems: 100 });
      bf.add('foo');
      expect(bf.has('foo')).toBe(true);
      bf.clear();
      expect(bf.has('foo')).toBe(false);
      expect(bf.size).toBe(0);
    });
  });

  describe('estimatedFalsePositiveRate', () => {
    it('grows as items are added', () => {
      const bf = new BloomFilter({ expectedItems: 1000, falsePositiveRate: 0.01 });

      const before = bf.estimatedFalsePositiveRate();
      for (let i = 0; i < 500; i++) bf.add(`x-${i}`);
      const after = bf.estimatedFalsePositiveRate();

      expect(after).toBeGreaterThan(before);
    });
  });
});

describe('receiptFingerprint', () => {
  it('produces same fingerprint for equivalent receipts', () => {
    const a = receiptFingerprint('Starbucks', 4.99, '2024-01-15');
    const b = receiptFingerprint('Starbucks', 4.99, '2024-01-15');
    expect(a).toBe(b);
  });

  it('normalizes case and whitespace in merchant', () => {
    const a = receiptFingerprint('  STARBUCKS  ', 4.99, '2024-01-15');
    const b = receiptFingerprint('Starbucks', 4.99, '2024-01-15');
    expect(a).toBe(b);
  });

  it('strips punctuation in merchant', () => {
    const a = receiptFingerprint("Starbucks Inc.", 4.99, '2024-01-15');
    const b = receiptFingerprint('Starbucks Inc', 4.99, '2024-01-15');
    expect(a).toBe(b);
  });

  it('produces different fingerprints for different amounts', () => {
    const a = receiptFingerprint('Starbucks', 4.99, '2024-01-15');
    const b = receiptFingerprint('Starbucks', 5.99, '2024-01-15');
    expect(a).not.toBe(b);
  });

  it('extracts only date portion of ISO timestamps', () => {
    const a = receiptFingerprint('X', 1, '2024-01-15');
    const b = receiptFingerprint('X', 1, '2024-01-15T13:45:00Z');
    expect(a).toBe(b);
  });
});
