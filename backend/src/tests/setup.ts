// Set env BEFORE any module imports
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://localhost:5432/paytrack_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-minimum-32-characters-long-abcdef';
process.env.NODE_ENV = 'test';

import { beforeAll, afterAll } from 'vitest';
import { initializeDatabase, closeDatabase } from '../config/database.js';
import { initializeCache, closeCache } from '../config/cache.js';

beforeAll(async () => {
  initializeCache();
  await initializeDatabase();
});

afterAll(async () => {
  await closeCache();
  await closeDatabase();
});
