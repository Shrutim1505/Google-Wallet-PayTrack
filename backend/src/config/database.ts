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

  // Verify connection
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    logger.info('PostgreSQL connected');
  } finally {
    client.release();
  }

  await runMigrations();
  await seedDemoUser();
  return pool;
}

async function runMigrations() {
  await pool.query(`
    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      currency VARCHAR(3) DEFAULT 'INR',
      timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
      preferences JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- RBAC: Roles
    CREATE TABLE IF NOT EXISTS roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- RBAC: Permissions
    CREATE TABLE IF NOT EXISTS permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) UNIQUE NOT NULL,
      resource VARCHAR(50) NOT NULL,
      action VARCHAR(20) NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- RBAC: Role-Permission mapping
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
      permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );

    -- RBAC: User-Role mapping
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
      assigned_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, role_id)
    );

    -- User settings
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      monthly_budget NUMERIC(12,2) DEFAULT 50000,
      notifications_enabled BOOLEAN DEFAULT TRUE,
      dark_mode BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Receipts
    CREATE TABLE IF NOT EXISTS receipts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      merchant VARCHAR(255) NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'INR',
      date DATE NOT NULL,
      category VARCHAR(50) DEFAULT 'Other',
      items JSONB DEFAULT '[]',
      image_url TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      tags JSONB DEFAULT '[]',
      ocr_data JSONB,
      is_manual_entry BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Budgets
    CREATE TABLE IF NOT EXISTS budgets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category VARCHAR(50) NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      period VARCHAR(20) DEFAULT 'monthly',
      alert_enabled BOOLEAN DEFAULT TRUE,
      alert_threshold INTEGER DEFAULT 80,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, category, period)
    );

    -- Splits
    CREATE TABLE IF NOT EXISTS splits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      share_token VARCHAR(64) UNIQUE NOT NULL,
      participants JSONB DEFAULT '[]',
      split_type VARCHAR(20) DEFAULT 'equal',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Smart alerts
    CREATE TABLE IF NOT EXISTS smart_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      severity VARCHAR(20) DEFAULT 'info',
      data JSONB DEFAULT '{}',
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ML training data
    CREATE TABLE IF NOT EXISTS ml_training_data (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      merchant VARCHAR(255) NOT NULL,
      items TEXT DEFAULT '',
      category VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Indexes for optimized query performance
  await pool.query(`
    -- Receipt indexes: composite for common query patterns
    CREATE INDEX IF NOT EXISTS idx_receipts_user_date ON receipts(user_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_receipts_user_category ON receipts(user_id, category);
    CREATE INDEX IF NOT EXISTS idx_receipts_user_amount ON receipts(user_id, amount);
    CREATE INDEX IF NOT EXISTS idx_receipts_user_date_category ON receipts(user_id, date DESC, category);
    CREATE INDEX IF NOT EXISTS idx_receipts_merchant_trgm ON receipts USING gin(merchant gin_trgm_ops);

    -- Budget indexes
    CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);

    -- RBAC indexes
    CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
    CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);

    -- Alert indexes
    CREATE INDEX IF NOT EXISTS idx_smart_alerts_user_created ON smart_alerts(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_splits_user ON splits(user_id);
    CREATE INDEX IF NOT EXISTS idx_splits_token ON splits(share_token);
    CREATE INDEX IF NOT EXISTS idx_ml_training_user ON ml_training_data(user_id);
  `).catch(() => {
    // gin_trgm_ops requires pg_trgm extension, create without it if unavailable
    logger.warn('Trigram index creation failed — run CREATE EXTENSION pg_trgm; as superuser for full-text search optimization');
  });

  // Seed default roles and permissions
  await seedRBAC();
}

async function seedRBAC() {
  // Roles
  await pool.query(`
    INSERT INTO roles (name, description) VALUES
      ('admin', 'Full system access'),
      ('user', 'Standard user access'),
      ('viewer', 'Read-only access')
    ON CONFLICT (name) DO NOTHING
  `);

  // Permissions
  const permissions = [
    ['receipts:create', 'receipts', 'create', 'Create receipts'],
    ['receipts:read', 'receipts', 'read', 'Read own receipts'],
    ['receipts:update', 'receipts', 'update', 'Update own receipts'],
    ['receipts:delete', 'receipts', 'delete', 'Delete own receipts'],
    ['receipts:read_all', 'receipts', 'read_all', 'Read all users receipts'],
    ['budgets:create', 'budgets', 'create', 'Create budgets'],
    ['budgets:read', 'budgets', 'read', 'Read own budgets'],
    ['budgets:update', 'budgets', 'update', 'Update own budgets'],
    ['budgets:delete', 'budgets', 'delete', 'Delete own budgets'],
    ['analytics:read', 'analytics', 'read', 'View analytics'],
    ['settings:read', 'settings', 'read', 'Read settings'],
    ['settings:update', 'settings', 'update', 'Update settings'],
    ['users:manage', 'users', 'manage', 'Manage all users'],
    ['roles:manage', 'roles', 'manage', 'Manage roles and permissions'],
  ];

  for (const [name, resource, action, description] of permissions) {
    await pool.query(
      `INSERT INTO permissions (name, resource, action, description) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING`,
      [name, resource, action, description]
    );
  }

  // Assign permissions to roles
  // Admin gets everything
  await pool.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin'
    ON CONFLICT DO NOTHING
  `);

  // User gets standard CRUD on own resources
  const userPerms = [
    'receipts:create', 'receipts:read', 'receipts:update', 'receipts:delete',
    'budgets:create', 'budgets:read', 'budgets:update', 'budgets:delete',
    'analytics:read', 'settings:read', 'settings:update',
  ];
  await pool.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.name = 'user' AND p.name = ANY($1)
    ON CONFLICT DO NOTHING
  `, [userPerms]);

  // Viewer gets read-only
  const viewerPerms = ['receipts:read', 'budgets:read', 'analytics:read', 'settings:read'];
  await pool.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.name = 'viewer' AND p.name = ANY($1)
    ON CONFLICT DO NOTHING
  `, [viewerPerms]);
}

async function seedDemoUser() {
  const demoEmail = 'demo@example.com';
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [demoEmail]);
  if (rows.length > 0) return;

  const userId = uuidv4();
  const passwordHash = await bcrypt.hash('password', 10);

  await runTransaction(async (client) => {
    await client.query(
      'INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)',
      [userId, demoEmail, 'Demo User', passwordHash]
    );
    await client.query(
      'INSERT INTO user_settings (user_id) VALUES ($1)',
      [userId]
    );
    // Assign 'user' role to demo user
    await client.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT $1, id FROM roles WHERE name = 'user'
    `, [userId]);
  });
}

export async function closeDatabase(): Promise<void> {
  if (pool) await pool.end();
}

/**
 * Run multiple statements inside a PostgreSQL transaction.
 * Automatically rolls back on error. Provides ACID guarantees.
 */
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
