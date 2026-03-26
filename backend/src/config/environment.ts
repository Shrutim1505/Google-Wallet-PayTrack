import dotenv from 'dotenv';
import crypto from 'node:crypto';

dotenv.config({ path: '.env.local' });

const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-key-min-32-chars';
const refreshSecret = process.env.REFRESH_SECRET || crypto.createHash('sha256').update(jwtSecret + '-refresh').digest('hex');

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}

export const environment = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  SQLITE_FILENAME: process.env.SQLITE_FILENAME || 'paytrack.sqlite',
  JWT_SECRET: jwtSecret,
  REFRESH_SECRET: refreshSecret,
  JWT_EXPIRY: process.env.JWT_EXPIRY || '15m',
  REFRESH_EXPIRY_DAYS: parseInt(process.env.REFRESH_EXPIRY_DAYS || '7', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  ALLOWED_FILE_TYPES: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,application/pdf')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
