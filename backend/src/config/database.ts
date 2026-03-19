import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db: any;

export async function initializeDatabase() {
  db = await open({
    filename: ':memory:',
    driver: sqlite3.Database,
  });

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      currency TEXT DEFAULT 'INR',
      timezone TEXT DEFAULT 'Asia/Kolkata',
      preferences TEXT DEFAULT '{}',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      vendor TEXT NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      currency TEXT DEFAULT 'INR',
      date DATE NOT NULL,
      category TEXT DEFAULT 'other',
      items TEXT,
      imageUrl TEXT,
      notes TEXT,
      tags TEXT,
      ocrData TEXT,
      isManualEntry INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      category TEXT NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      period TEXT DEFAULT 'monthly',
      alertEnabled INTEGER DEFAULT 1,
      alertThreshold INTEGER DEFAULT 80,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id)
    );
  `);

  return db;
}

export function getDatabase() {
  return db;
}