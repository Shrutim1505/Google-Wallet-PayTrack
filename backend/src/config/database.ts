import path from 'node:path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { environment } from './environment.js';

let db: Database;

export async function initializeDatabase(): Promise<Database> {
  const sqliteFilename = path.resolve(process.cwd(), environment.SQLITE_FILENAME);

  db = await open({
    filename: sqliteFilename,
    driver: sqlite3.Database,
  });

  await db.exec('PRAGMA foreign_keys = ON;');
  await db.exec('PRAGMA journal_mode = WAL;');  // Better concurrent read performance

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      passwordhash TEXT NOT NULL,
      currency TEXT DEFAULT 'INR',
      timezone TEXT DEFAULT 'Asia/Kolkata',
      preferences TEXT DEFAULT '{}',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      userId TEXT PRIMARY KEY,
      monthlyBudget REAL NOT NULL DEFAULT 50000,
      notificationsEnabled INTEGER NOT NULL DEFAULT 1,
      darkMode INTEGER NOT NULL DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      merchant TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      date TEXT NOT NULL,
      category TEXT DEFAULT 'Other',
      items TEXT DEFAULT '[]',
      imageUrl TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      ocrData TEXT,
      isManualEntry INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      period TEXT DEFAULT 'monthly',
      alertEnabled INTEGER DEFAULT 1,
      alertThreshold INTEGER DEFAULT 80,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Indexes for common query patterns
    CREATE INDEX IF NOT EXISTS idx_receipts_userId_date ON receipts(userId, date DESC);
    CREATE INDEX IF NOT EXISTS idx_receipts_userId_category ON receipts(userId, category);
    CREATE INDEX IF NOT EXISTS idx_budgets_userId ON budgets(userId);
  `);

  await seedDemoUser();

  return db;
}

async function seedDemoUser() {
  const demoEmail = 'demo@example.com';
  const existing = await db.get('SELECT id FROM users WHERE email = ?', [demoEmail]);
  if (existing) return;

  const userId = uuidv4();
  const passwordHash = await bcrypt.hash('password', 10);

  await runTransaction(async () => {
    await db.run(
      'INSERT INTO users (id, email, name, passwordhash) VALUES (?, ?, ?, ?)',
      [userId, demoEmail, 'Demo User', passwordHash]
    );
    await db.run(
      'INSERT INTO user_settings (userId, monthlyBudget, notificationsEnabled, darkMode) VALUES (?, ?, ?, ?)',
      [userId, 50000, 1, 0]
    );
  });
}

export function getDatabase(): Database {
  if (!db) throw new Error('Database not initialized — call initializeDatabase() first');
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) await db.close();
}

/**
 * Run multiple statements inside a single SQLite transaction.
 * Automatically rolls back on error.
 */
export async function runTransaction(fn: () => Promise<void>): Promise<void> {
  await db.exec('BEGIN');
  try {
    await fn();
    await db.exec('COMMIT');
  } catch (err) {
    await db.exec('ROLLBACK');
    throw err;
  }
}
