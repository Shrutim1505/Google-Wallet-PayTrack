/**
 * LRU Cache with TTL — bounded-size cache with two eviction triggers:
 *   1. Least Recently Used (when at capacity)
 *   2. Time-To-Live (lazy expiration on access)
 *
 * Implementation: HashMap + Doubly-Linked List
 *   • get / set / delete: O(1)
 *   • Memory: O(capacity)
 *
 * Use case in PayTrack: caching currency exchange rates from external API.
 *   • Without cache: every conversion → external HTTP call (~200ms, rate-limited)
 *   • With LRU+TTL: 99% cache hit, ~1ms lookup, fresh data every 5 minutes
 *
 * Why hand-rolled instead of using a library?
 *   • Full control over eviction events (for metrics)
 *   • Deterministic memory ceiling
 *   • No external dependency
 *   • Demonstrates understanding of the underlying data structure
 */

interface Node<K, V> {
  key: K;
  value: V;
  expiresAt: number | null;
  prev: Node<K, V> | null;
  next: Node<K, V> | null;
}

export interface LRUCacheOptions {
  /** Maximum entries before LRU eviction kicks in. */
  capacity: number;
  /** Default TTL in milliseconds. Set per-entry via `set(key, value, ttl)`. 0 = no expiry. */
  defaultTtlMs?: number;
  /** Called when an entry is evicted (for metrics). */
  onEvict?: <K, V>(key: K, value: V, reason: 'lru' | 'ttl' | 'manual') => void;
}

export class LRUCache<K, V> {
  private readonly map = new Map<K, Node<K, V>>();
  private head: Node<K, V> | null = null; // Most recently used
  private tail: Node<K, V> | null = null; // Least recently used
  private readonly capacity: number;
  private readonly defaultTtlMs: number;
  private readonly onEvict?: LRUCacheOptions['onEvict'];

  // Stats for metrics / observability
  private _hits = 0;
  private _misses = 0;
  private _evictions = 0;

  constructor(options: LRUCacheOptions) {
    if (options.capacity <= 0) throw new Error('capacity must be positive');
    this.capacity = options.capacity;
    this.defaultTtlMs = options.defaultTtlMs ?? 0;
    this.onEvict = options.onEvict;
  }

  get size(): number {
    return this.map.size;
  }

  get stats() {
    const total = this._hits + this._misses;
    return {
      hits: this._hits,
      misses: this._misses,
      evictions: this._evictions,
      hitRate: total > 0 ? this._hits / total : 0,
      size: this.map.size,
      capacity: this.capacity,
    };
  }

  /**
   * Look up a value. Promotes the entry to most-recently-used.
   * Returns undefined if missing or expired.
   * Time: O(1).
   */
  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) {
      this._misses++;
      return undefined;
    }

    // Lazy TTL eviction
    if (node.expiresAt !== null && node.expiresAt <= Date.now()) {
      this.removeNode(node);
      this.map.delete(key);
      this._evictions++;
      this.onEvict?.(node.key, node.value, 'ttl');
      this._misses++;
      return undefined;
    }

    this._hits++;
    this.moveToHead(node);
    return node.value;
  }

  /**
   * Insert or update a value.
   * Evicts the LRU entry if at capacity.
   * Time: O(1).
   */
  set(key: K, value: V, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtlMs;
    const expiresAt = ttl > 0 ? Date.now() + ttl : null;

    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      existing.expiresAt = expiresAt;
      this.moveToHead(existing);
      return;
    }

    // Evict LRU if at capacity
    if (this.map.size >= this.capacity && this.tail) {
      const evicted = this.tail;
      this.removeNode(evicted);
      this.map.delete(evicted.key);
      this._evictions++;
      this.onEvict?.(evicted.key, evicted.value, 'lru');
    }

    const node: Node<K, V> = { key, value, expiresAt, prev: null, next: null };
    this.map.set(key, node);
    this.addToHead(node);
  }

  /** Remove a specific entry. Time: O(1). */
  delete(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    this.removeNode(node);
    this.map.delete(key);
    this.onEvict?.(node.key, node.value, 'manual');
    return true;
  }

  has(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    if (node.expiresAt !== null && node.expiresAt <= Date.now()) {
      this.delete(key);
      return false;
    }
    return true;
  }

  clear(): void {
    this.map.clear();
    this.head = this.tail = null;
  }

  /** Iterate from MRU to LRU (most recently used first). */
  *entries(): IterableIterator<[K, V]> {
    let node = this.head;
    while (node) {
      yield [node.key, node.value];
      node = node.next;
    }
  }

  // ─── Doubly-linked list helpers ───

  private moveToHead(node: Node<K, V>): void {
    if (node === this.head) return;
    this.removeNode(node);
    this.addToHead(node);
  }

  private addToHead(node: Node<K, V>): void {
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  private removeNode(node: Node<K, V>): void {
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (node === this.head) this.head = node.next;
    if (node === this.tail) this.tail = node.prev;
    node.prev = node.next = null;
  }
}
