import { describe, it, expect } from 'vitest';
import { MinHeap, topK, topKGroupedBy } from '../algorithms/MinHeap.js';

describe('MinHeap', () => {
  describe('basic operations', () => {
    it('returns the minimum element', () => {
      const heap = new MinHeap<number>((a, b) => a - b);
      [5, 3, 8, 1, 9, 2].forEach(n => heap.push(n));
      expect(heap.peek()).toBe(1);
    });

    it('extracts elements in ascending order', () => {
      const heap = new MinHeap<number>((a, b) => a - b);
      [5, 3, 8, 1, 9, 2].forEach(n => heap.push(n));

      const sorted: number[] = [];
      while (heap.size > 0) sorted.push(heap.pop()!);

      expect(sorted).toEqual([1, 2, 3, 5, 8, 9]);
    });

    it('handles single element', () => {
      const heap = new MinHeap<number>((a, b) => a - b);
      heap.push(42);
      expect(heap.peek()).toBe(42);
      expect(heap.pop()).toBe(42);
      expect(heap.size).toBe(0);
    });

    it('handles empty heap gracefully', () => {
      const heap = new MinHeap<number>((a, b) => a - b);
      expect(heap.pop()).toBeUndefined();
      expect(heap.peek()).toBeUndefined();
    });
  });

  describe('with custom comparator', () => {
    it('sorts objects by a field', () => {
      const heap = new MinHeap<{ name: string; price: number }>((a, b) => a.price - b.price);
      heap.push({ name: 'A', price: 30 });
      heap.push({ name: 'B', price: 10 });
      heap.push({ name: 'C', price: 20 });

      expect(heap.pop()?.name).toBe('B');
      expect(heap.pop()?.name).toBe('C');
      expect(heap.pop()?.name).toBe('A');
    });
  });

  describe('siftUp/siftDown invariants', () => {
    it('maintains heap property after many random ops', () => {
      const heap = new MinHeap<number>((a, b) => a - b);
      const reference: number[] = [];

      for (let i = 0; i < 1000; i++) {
        const n = Math.floor(Math.random() * 10000);
        heap.push(n);
        reference.push(n);
      }

      reference.sort((a, b) => a - b);
      const extracted: number[] = [];
      while (heap.size > 0) extracted.push(heap.pop()!);

      expect(extracted).toEqual(reference);
    });
  });
});

describe('topK', () => {
  it('returns the top K largest elements in descending order', () => {
    const items = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5];
    const result = topK(items, 3, n => n);
    expect(result).toEqual([9, 6, 5]);
  });

  it('returns all items when K >= N', () => {
    const items = [1, 2, 3];
    expect(topK(items, 10, n => n)).toEqual([3, 2, 1]);
  });

  it('returns empty for K=0', () => {
    expect(topK([1, 2, 3], 0, n => n)).toEqual([]);
  });

  it('returns empty for empty input', () => {
    expect(topK([], 5, (n: number) => n)).toEqual([]);
  });

  it('matches a full-sort solution for arbitrary inputs', () => {
    const items = Array.from({ length: 1000 }, () => Math.random() * 1000);
    const k = 25;

    const fullSort = [...items].sort((a, b) => b - a).slice(0, k);
    const heapTopK = topK(items, k, n => n);

    expect(heapTopK).toEqual(fullSort);
  });

  it('works with custom score function on objects', () => {
    const merchants = [
      { name: 'Amazon', revenue: 500 },
      { name: 'Google', revenue: 800 },
      { name: 'Apple', revenue: 1000 },
      { name: 'Tesla', revenue: 600 },
    ];

    const top2 = topK(merchants, 2, m => m.revenue);
    expect(top2.map(m => m.name)).toEqual(['Apple', 'Google']);
  });
});

describe('topKGroupedBy', () => {
  it('groups items and returns top groups by total', () => {
    const sales = [
      { merchant: 'A', amount: 100 },
      { merchant: 'B', amount: 50 },
      { merchant: 'A', amount: 200 },
      { merchant: 'C', amount: 30 },
      { merchant: 'B', amount: 75 },
    ];

    const top2 = topKGroupedBy(sales, 2, s => s.merchant, s => s.amount);
    expect(top2).toEqual([
      { key: 'A', total: 300, count: 2 },
      { key: 'B', total: 125, count: 2 },
    ]);
  });

  it('handles single group', () => {
    const result = topKGroupedBy(
      [{ k: 'X', v: 5 }],
      3,
      r => r.k,
      r => r.v
    );
    expect(result).toEqual([{ key: 'X', total: 5, count: 1 }]);
  });
});
