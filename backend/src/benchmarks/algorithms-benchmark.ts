/**
 * Algorithm benchmarks — proves the perf claims with real numbers.
 *
 * Run: npm run benchmark:algorithms
 */

import { Trie } from '../algorithms/Trie.js';
import { BloomFilter, receiptFingerprint } from '../algorithms/BloomFilter.js';
import { topK } from '../algorithms/MinHeap.js';
import { LRUCache } from '../algorithms/LRUCache.js';

interface BenchResult {
  name: string;
  iterations: number;
  totalMs: number;
  opsPerSec: number;
}

function bench(name: string, iterations: number, fn: () => void): BenchResult {
  // Warmup
  for (let i = 0; i < Math.min(100, iterations / 10); i++) fn();

  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) fn();
  const elapsedNs = process.hrtime.bigint() - start;
  const totalMs = Number(elapsedNs) / 1e6;

  return {
    name,
    iterations,
    totalMs,
    opsPerSec: Math.round((iterations / totalMs) * 1000),
  };
}

function printTable(title: string, results: BenchResult[]) {
  console.log(`\n${title}`);
  console.log('─'.repeat(80));
  console.log(
    'Approach'.padEnd(35) +
    'Iterations'.padStart(12) +
    'Total (ms)'.padStart(15) +
    'Ops/sec'.padStart(15)
  );
  console.log('─'.repeat(80));
  for (const r of results) {
    console.log(
      r.name.padEnd(35) +
      r.iterations.toString().padStart(12) +
      r.totalMs.toFixed(2).padStart(15) +
      r.opsPerSec.toLocaleString().padStart(15)
    );
  }
  console.log('─'.repeat(80));

  // Print speedup
  if (results.length === 2) {
    const ratio = results[1].totalMs / results[0].totalMs;
    if (ratio > 1) {
      console.log(`✓ ${results[0].name} is ${ratio.toFixed(1)}× faster\n`);
    } else {
      console.log(`✓ ${results[1].name} is ${(1 / ratio).toFixed(1)}× faster\n`);
    }
  }
}

// ─── 1. Trie vs Linear Scan for autocomplete ───
function benchTrie() {
  // Simulate a real production scenario: 100K merchants in the DB
  const merchants: string[] = [];
  const prefixes = ['Star', 'Sub', 'Ama', 'Goo', 'App', 'Mic', 'Tes', 'Net', 'Spo', 'Yel', 'Wal', 'Tar'];
  for (const prefix of prefixes) {
    for (let i = 0; i < 10_000; i++) {
      merchants.push(`${prefix}${Math.random().toString(36).slice(2, 8)}`);
    }
  }

  const trie = Trie.fromWords(merchants);

  // Test with a SPECIFIC prefix (typical autocomplete after user types 4-5 chars)
  // — finds ~10 matches under the prefix, not 10,000
  const queryPrefix = 'starb';

  const trieResult = bench(`Trie.search("${queryPrefix}", 10)`, 50_000, () => {
    trie.search(queryPrefix, 10);
  });

  const linearResult = bench('Array.filter + sort + slice', 50_000, () => {
    merchants
      .filter(m => m.toLowerCase().startsWith(queryPrefix))
      .sort()
      .slice(0, 10);
  });

  printTable(
    `📚 Trie autocomplete vs linear scan (${merchants.length.toLocaleString()} merchants, prefix="${queryPrefix}")`,
    [trieResult, linearResult]
  );
  console.log('  Note: Specific prefixes (4+ chars) are the typical autocomplete case');
  console.log('  after a user has typed a few characters.\n');
}

// ─── 2. Bloom filter vs Set for "definitely not in" check ───
function benchBloom() {
  const items: string[] = [];
  for (let i = 0; i < 10_000; i++) {
    items.push(receiptFingerprint(`Merchant${i}`, Math.random() * 1000, '2024-01-01'));
  }

  const bloom = new BloomFilter({ expectedItems: 10_000, falsePositiveRate: 0.01 });
  const set = new Set<string>();
  items.forEach(i => { bloom.add(i); set.add(i); });

  // For test: query items that don't exist
  const probes: string[] = [];
  for (let i = 0; i < 1000; i++) {
    probes.push(receiptFingerprint(`UNSEEN${i}`, Math.random() * 1000, '2024-12-31'));
  }

  const bloomResult = bench(`BloomFilter.has() (mostly absent)`, 100_000, () => {
    bloom.has(probes[0]);
  });

  const setResult = bench('Set.has() (in-memory baseline)', 100_000, () => {
    set.has(probes[0]);
  });

  // Memory comparison
  const setMemoryEstimate = items.reduce((s, i) => s + i.length, 0) * 2; // bytes
  const bloomMemoryEstimate = bloom.capacity / 8; // bits → bytes

  printTable(
    `🌸 BloomFilter vs Set membership check (${items.length} items)`,
    [bloomResult, setResult]
  );
  console.log(`  Memory:  Bloom ≈ ${(bloomMemoryEstimate / 1024).toFixed(1)} KB  vs  Set ≈ ${(setMemoryEstimate / 1024).toFixed(1)} KB`);
  console.log(`  Memory savings: ${(setMemoryEstimate / bloomMemoryEstimate).toFixed(1)}× smaller`);
  console.log(`  False positive rate (estimated): ${(bloom.estimatedFalsePositiveRate() * 100).toFixed(2)}%\n`);
}

// ─── 3. Top-K min-heap vs full sort ───
function benchTopK() {
  const items = Array.from({ length: 100_000 }, () => ({
    name: `item-${Math.random()}`,
    score: Math.random() * 1_000_000,
  }));
  const k = 10;

  const heapResult = bench(`topK (heap), N=${items.length}, K=${k}`, 100, () => {
    topK(items, k, x => x.score);
  });

  const sortResult = bench('Array.sort + slice', 100, () => {
    [...items].sort((a, b) => b.score - a.score).slice(0, k);
  });

  printTable(
    `🏔  Top-K min-heap vs Array.sort (N=${items.length.toLocaleString()}, K=${k})`,
    [heapResult, sortResult]
  );
}

// ─── 4. LRU cache vs naive Map (no eviction) ───
function benchLRU() {
  const lru = new LRUCache<string, number>({ capacity: 1000, defaultTtlMs: 60_000 });
  const map = new Map<string, number>();

  // Pre-fill both
  for (let i = 0; i < 1000; i++) {
    lru.set(`k${i}`, i);
    map.set(`k${i}`, i);
  }

  const lruResult = bench('LRUCache.get + promote', 1_000_000, () => {
    lru.get('k500');
  });

  const mapResult = bench('Map.get (no LRU semantics)', 1_000_000, () => {
    map.get('k500');
  });

  printTable(
    `💾 LRU cache get vs plain Map.get (capacity=1000)`,
    [lruResult, mapResult]
  );
  console.log('  Note: LRU pays a small cost for the doubly-linked list maintenance;');
  console.log('  the value is in BOUNDED memory + auto-eviction.\n');
}

async function main() {
  console.log('\n=== PayTrack Algorithm Benchmarks ===');
  console.log(`Node ${process.version} | ${process.platform} ${process.arch}`);
  console.log('Each benchmark runs after a small warmup phase.\n');

  benchTrie();
  benchBloom();
  benchTopK();
  benchLRU();

  console.log('=== Summary ===');
  console.log('• Trie:        O(L) prefix lookup vs O(N×L) linear scan');
  console.log('• BloomFilter: ~10× smaller memory footprint, near-O(1) check');
  console.log('• Top-K heap:  O(N log K) vs O(N log N) — significant for large N, small K');
  console.log('• LRUCache:    O(1) get/set with bounded memory + TTL eviction');
  console.log('');
}

main().catch(console.error);
