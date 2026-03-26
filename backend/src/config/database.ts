import path from 'node:path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { environment } from './environment.js';

let db: Database;

export async function initializeDatabase() {
  const sqliteFilename = path.resolve(process.cwd(), environment.SQLITE_FILENAME);

  db = await open({
    filename: sqliteFilename,
    driver: sqlite3.Database,
  });

  // Performance & integrity pragmas
  await db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
  `);

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

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS splits (
      id TEXT PRIMARY KEY,
      receiptId TEXT NOT NULL,
      userId TEXT NOT NULL,
      shareToken TEXT UNIQUE NOT NULL,
      participants TEXT NOT NULL DEFAULT '[]',
      splitType TEXT DEFAULT 'equal',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(receiptId) REFERENCES receipts(id) ON DELETE CASCADE,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS smart_alerts (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT DEFAULT 'info',
      data TEXT DEFAULT '{}',
      isRead INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ml_training_data (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      merchant TEXT NOT NULL,
      items TEXT DEFAULT '',
      category TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Indexes for scalability
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_receipts_userId ON receipts(userId);
    CREATE INDEX IF NOT EXISTS idx_receipts_userId_date ON receipts(userId, date DESC);
    CREATE INDEX IF NOT EXISTS idx_receipts_userId_category ON receipts(userId, category);
    CREATE INDEX IF NOT EXISTS idx_budgets_userId ON budgets(userId);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_userId ON refresh_tokens(userId);
    CREATE INDEX IF NOT EXISTS idx_splits_shareToken ON splits(shareToken);
    CREATE INDEX IF NOT EXISTS idx_splits_receiptId ON splits(receiptId);
    CREATE INDEX IF NOT EXISTS idx_smart_alerts_userId ON smart_alerts(userId);
    CREATE INDEX IF NOT EXISTS idx_ml_training_userId ON ml_training_data(userId);
  `);

  // Seed demo user
  const demoEmail = 'demo@example.com';
  const existingDemo = await db.get('SELECT id FROM users WHERE email = ?', [demoEmail]);
  if (!existingDemo) {
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash('password', 12);
    await db.run(
      `INSERT INTO users (id, email, name, passwordhash) VALUES (?, ?, ?, ?)`,
      [userId, demoEmail, 'Demo User', passwordHash]
    );
    await db.run(`INSERT INTO user_settings (userId) VALUES (?)`, [userId]);
  }

  return db;
}

export function getDatabase(): Database {
  if (!db) throw new Error('Database not initialized. Call initializeDatabase() first.');
  return db;
}
