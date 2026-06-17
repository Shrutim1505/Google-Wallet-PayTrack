/**
 * Binary Min-Heap implementation backed by a flat array.
 *
 * Provides O(log N) insert and extract-min operations.
 * Used as the building block for the Top-K algorithm below.
 */
export class MinHeap<T> {
  private heap: T[] = [];

  constructor(private readonly compare: (a: T, b: T) => number) {}

  get size(): number {
    return this.heap.length;
  }

  /** O(1) — peek at the minimum without removing it. */
  peek(): T | undefined {
    return this.heap[0];
  }

  /** O(log N) — insert a new item. */
  push(item: T): void {
    this.heap.push(item);
    this.siftUp(this.heap.length - 1);
  }

  /** O(log N) — remove and return the minimum item. */
  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  toArray(): T[] {
    return [...this.heap];
  }

  private siftUp(idx: number): void {
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (this.compare(this.heap[idx], this.heap[parent]) < 0) {
        [this.heap[idx], this.heap[parent]] = [this.heap[parent], this.heap[idx]];
        idx = parent;
      } else {
        break;
      }
    }
  }

  private siftDown(idx: number): void {
    const n = this.heap.length;
    while (true) {
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      let smallest = idx;

      if (left < n && this.compare(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < n && this.compare(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }
      if (smallest === idx) break;

      [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
      idx = smallest;
    }
  }
}

/**
 * Find the top-K items from an iterable using a min-heap.
 *
 * Time: O(N log K)  vs.  O(N log N) for full sort
 * Space: O(K)       vs.  O(N) for full sort
 *
 * For typical analytics use (K=10 over N=10000 items):
 *   • Sort-then-slice: ~133,000 comparisons
 *   • Top-K heap:       ~33,000 comparisons (~4× faster)
 *
 * Algorithm:
 *   • Maintain a min-heap of size K
 *   • For each new item, if heap size < K → push; else if new item > min → pop min, push new
 *   • Final heap contains the K largest items
 */
export function topK<T>(
  items: Iterable<T>,
  k: number,
  scoreFn: (item: T) => number
): T[] {
  if (k <= 0) return [];

  // Min-heap ordered by score ascending — the smallest in the heap is at the top
  const heap = new MinHeap<{ item: T; score: number }>((a, b) => a.score - b.score);

  for (const item of items) {
    const score = scoreFn(item);
    if (heap.size < k) {
      heap.push({ item, score });
    } else {
      const min = heap.peek()!;
      if (score > min.score) {
        heap.pop();
        heap.push({ item, score });
      }
    }
  }

  // Drain heap; reverse to get descending order
  const result: T[] = [];
  while (heap.size > 0) {
    result.push(heap.pop()!.item);
  }
  return result.reverse();
}

/** Group items by key and find the top-K groups by aggregate score. */
export function topKGroupedBy<T>(
  items: Iterable<T>,
  k: number,
  keyFn: (item: T) => string,
  scoreFn: (item: T) => number
): Array<{ key: string; total: number; count: number }> {
  const groups = new Map<string, { total: number; count: number }>();

  for (const item of items) {
    const key = keyFn(item);
    const score = scoreFn(item);
    const existing = groups.get(key);
    if (existing) {
      existing.total += score;
      existing.count++;
    } else {
      groups.set(key, { total: score, count: 1 });
    }
  }

  return topK(
    Array.from(groups.entries()).map(([key, v]) => ({ key, total: v.total, count: v.count })),
    k,
    (g) => g.total
  );
}
