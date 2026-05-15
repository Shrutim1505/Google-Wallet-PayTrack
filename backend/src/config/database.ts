import pg from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { environment } from './environment.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

let pool: pg.Pool;

export function getPool(): pg.Pool {
  if (!pool) throw new Error('Database not initialized — call initializeDatabase() first');
  return pool;
}

export async function initializeDatabase(): Promise<pg.Pool> {
  pool = new Pool({
    connectionString: environment.DATABASE_URL,
    max: environment.DB_POOL_MAX,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Verify connection with retry logic
  let retries = 5;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      logger.info('PostgreSQL connected');
      break;
    } catch (err) {
      retries--;
      if (retries === 0) throw err;
      logger.warn({ msg: 'Database connection failed, retrying...', retries, err: (err as Error).message });
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Check if schema exists (migrations should have run by now)
  await ensureSchemaExists();
  await seedDemoUser();

  return pool;
}

async function ensureSchemaExists() {
  const { rows } = await pool.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'users'
    ) as exists
  `);

  if (!rows[0].exists) {
    if (environment.NODE_ENV === 'production') {
      throw new Error('Schema not found. Run migrations first: npm run migrate');
    }
    // Auto-run migrations in dev/test
    logger.info('Schema not found, running migrations automatically (dev mode)...');
    const { runner } = await import('node-pg-migrate');
    await runner({
      databaseUrl: environment.DATABASE_URL,
      dir: 'migrations',
      direction: 'up',
      migrationsTable: 'pgmigrations',
      log: () => {},
    });
    logger.info('Migrations complete');
  }
}

async function seedDemoUser() {
  const demoEmail = 'demo@example.com';
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [demoEmail]);
  if (rows.length > 0) return;

  const userId = uuidv4();
  const passwordHash = await bcrypt.hash('password', 12);

  try {
    await runTransaction(async (client) => {
      await client.query(
        `INSERT INTO users (id, email, name, password_hash, email_verified) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO NOTHING`,
        [userId, demoEmail, 'Demo User', passwordHash, true]
      );
      await client.query(
        `INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
      await client.query(`
        INSERT INTO user_roles (user_id, role_id)
        SELECT $1, id FROM roles WHERE name = 'user'
        ON CONFLICT DO NOTHING
      `, [userId]);
    });
    logger.info('Demo user seeded');
  } catch (err) {
    // Benign if another process seeded concurrently
    logger.debug({ msg: 'Demo user seed skipped', err: (err as Error).message });
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) await pool.end();
}

export async function runTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
