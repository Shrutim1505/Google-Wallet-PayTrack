import path from 'node:path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

let db: any;

export async function initializeDatabase() {
  const sqliteFilename = process.env.SQLITE_FILENAME
    ? path.resolve(process.cwd(), process.env.SQLITE_FILENAME)
    : path.resolve(process.cwd(), 'paytrack.sqlite');

  db = await open({
    filename: sqliteFilename,
    driver: sqlite3.Database,
  });

  await db.exec(`PRAGMA foreign_keys = ON;`);

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
  `);

  const demoEmail = 'demo@example.com';
  const demoPassword = 'password';
  const demoName = 'Demo User';

  const existingDemo = await db.get('SELECT id FROM users WHERE email = ?', [demoEmail]);
  if (!existingDemo) {
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(demoPassword, 10);
    await db.run(
      `INSERT INTO users (id, email, name, passwordhash)
       VALUES (?, ?, ?, ?)`,
      [userId, demoEmail, demoName, passwordHash]
    );

    await db.run(
      `INSERT INTO user_settings (userId, monthlyBudget, notificationsEnabled, darkMode)
       VALUES (?, ?, ?, ?)`,
      [userId, 50000, 1, 0]
    );
  }

  return db;
}

export function getDatabase() {
  return db;
}