// Set env BEFORE any module imports
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/paytrack_test';

import { beforeAll, afterAll } from 'vitest';
import { initializeDatabase, closeDatabase } from '../config/database.js';

beforeAll(async () => {
  await initializeDatabase();
});

afterAll(async () => {
  await closeDatabase();
});
