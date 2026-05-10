/**
 * Database Performance Benchmark
 * Measures query latency with and without indexes to validate optimization claims.
 *
 * Usage: npx tsx src/benchmarks/db-benchmark.ts
 */
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { environment } from '../config/environment.js';
import { initializeDatabase, closeDatabase, getPool } from '../config/database.js';

let pool: pg.Pool;

interface BenchmarkResult {
  name: string;
  withIndex: number;
  withoutIndex: number;
  improvement: string;
}

async function seedBenchmarkData(userId: string, count: number) {
  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'];
  const merchants = ['Amazon', 'Flipkart', 'Swiggy', 'Uber', 'BigBasket', 'PharmEasy', 'Netflix'];

  console.log(`Seeding ${count} receipts for benchmarking...`);
  const batchSize = 500;

  for (let i = 0; i < count; i += batchSize) {
    const values: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    for (let j = 0; j < batchSize && i + j < count; j++) {
      const date = new Date(2023, Math.floor(Math.random() * 24), Math.floor(Math.random() * 28) + 1);
      values.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5})`);
      params.push(
        uuidv4(), userId,
        merchants[Math.floor(Math.random() * merchants.length)],
        Math.round(Math.random() * 5000 * 100) / 100,
        date.toISOString().split('T')[0],
        categories[Math.floor(Math.random() * categories.length)]
      );
      paramIdx += 6;
    }

    await pool.query(
      `INSERT INTO receipts (id, user_id, merchant, amount, date, category) VALUES ${values.join(',')}`,
      params
    );
  }
  console.log(`Seeded ${count} receipts.`);
}

async function timeQuery(label: string, query: string, params: any[]): Promise<number> {
  // Warm up
  await pool.query(query, params);

  const iterations = 50;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await pool.query(query, params);
  }
  const elapsed = (performance.now() - start) / iterations;
  return Math.round(elapsed * 100) / 100;
}

async function runBenchmarks() {
  console.log('\n=== PayTrack Database Performance Benchmark ===\n');
  console.log(`Database: PostgreSQL`);
  console.log(`Connection: ${environment.DATABASE_URL.replace(/:[^:@]+@/, ':***@')}\n`);

  // Ensure schema exists
  await initializeDatabase();
  pool = getPool();

  // Create a benchmark user
  const userId = uuidv4();
  await pool.query(
    `INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)`,
    [userId, `bench-${Date.now()}@test.com`, 'Benchmark User', 'hash']
  );

  await seedBenchmarkData(userId, 50000);

  // Update planner statistics
  await pool.query('ANALYZE receipts');

  const results: BenchmarkResult[] = [];

  // Benchmark 1: Receipts by user + date range (uses idx_receipts_user_date)
  const q1 = `SELECT * FROM receipts WHERE user_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date DESC LIMIT 20`;
  const p1 = [userId, '2024-01-01', '2024-06-30'];

  const withIdx1 = await timeQuery('Receipts by date range (indexed)', q1, p1);
  await pool.query('DROP INDEX IF EXISTS idx_receipts_user_date');
  await pool.query('ANALYZE receipts');
  const withoutIdx1 = await timeQuery('Receipts by date range (no index)', q1, p1);
  await pool.query('CREATE INDEX idx_receipts_user_date ON receipts(user_id, date DESC)');
  await pool.query('ANALYZE receipts');

  results.push({
    name: 'Receipts by date range',
    withIndex: withIdx1,
    withoutIndex: withoutIdx1,
    improvement: `${Math.round((1 - withIdx1 / withoutIdx1) * 100)}%`,
  });

  // Benchmark 2: Receipts by category (uses idx_receipts_user_category)
  const q2 = `SELECT * FROM receipts WHERE user_id = $1 AND category = $2 ORDER BY date DESC LIMIT 20`;
  const p2 = [userId, 'Food'];

  const withIdx2 = await timeQuery('Receipts by category (indexed)', q2, p2);
  await pool.query('DROP INDEX IF EXISTS idx_receipts_user_category');
  const withoutIdx2 = await timeQuery('Receipts by category (no index)', q2, p2);
  await pool.query('CREATE INDEX idx_receipts_user_category ON receipts(user_id, category)');

  results.push({
    name: 'Receipts by category',
    withIndex: withIdx2,
    withoutIndex: withoutIdx2,
    improvement: `${Math.round((1 - withIdx2 / withoutIdx2) * 100)}%`,
  });

  // Benchmark 3: Analytics aggregation
  const q3 = `SELECT category, SUM(amount)::numeric as total, COUNT(*)::int as count
              FROM receipts WHERE user_id = $1 AND date BETWEEN $2 AND $3 GROUP BY category`;
  const p3 = [userId, '2024-01-01', '2024-12-31'];

  const withIdx3 = await timeQuery('Analytics aggregation (indexed)', q3, p3);
  await pool.query('DROP INDEX IF EXISTS idx_receipts_user_date_category');
  const withoutIdx3 = await timeQuery('Analytics aggregation (no index)', q3, p3);
  await pool.query('CREATE INDEX idx_receipts_user_date_category ON receipts(user_id, date DESC, category)');

  results.push({
    name: 'Analytics aggregation',
    withIndex: withIdx3,
    withoutIndex: withoutIdx3,
    improvement: `${Math.round((1 - withIdx3 / withoutIdx3) * 100)}%`,
  });

  // Benchmark 4: Amount range filter
  const q4 = `SELECT * FROM receipts WHERE user_id = $1 AND amount BETWEEN $2 AND $3 LIMIT 20`;
  const p4 = [userId, 100, 1000];

  const withIdx4 = await timeQuery('Amount range filter (indexed)', q4, p4);
  await pool.query('DROP INDEX IF EXISTS idx_receipts_user_amount');
  const withoutIdx4 = await timeQuery('Amount range filter (no index)', q4, p4);
  await pool.query('CREATE INDEX idx_receipts_user_amount ON receipts(user_id, amount)');

  results.push({
    name: 'Amount range filter',
    withIndex: withIdx4,
    withoutIndex: withoutIdx4,
    improvement: `${Math.round((1 - withIdx4 / withoutIdx4) * 100)}%`,
  });

  // Print results
  console.log('\n┌─────────────────────────────┬────────────┬──────────────┬─────────────┐');
  console.log('│ Query                       │ With Index │ Without Index│ Improvement │');
  console.log('├─────────────────────────────┼────────────┼──────────────┼─────────────┤');
  for (const r of results) {
    console.log(`│ ${r.name.padEnd(27)} │ ${(r.withIndex + 'ms').padEnd(10)} │ ${(r.withoutIndex + 'ms').padEnd(12)} │ ${r.improvement.padEnd(11)} │`);
  }
  console.log('└─────────────────────────────┴────────────┴──────────────┴─────────────┘');

  const avgImprovement = results.reduce((sum, r) => {
    return sum + (1 - r.withIndex / r.withoutIndex);
  }, 0) / results.length;

  console.log(`\nAverage latency improvement: ${Math.round(avgImprovement * 100)}%`);

  // Cleanup
  await pool.query('DELETE FROM receipts WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  await closeDatabase();
}

runBenchmarks().catch(err => {
  console.error('Benchmark failed:', err.message);
  process.exit(1);
});
