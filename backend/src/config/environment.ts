import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: '.env.local' });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  // Critical secrets — no fallback in production
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Database
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql://')),
  DB_POOL_MAX: z.coerce.number().int().positive().default(20),

  // Redis (optional in dev, required in prod)
  REDIS_URL: z.string().optional(),

  // CORS
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),

  // Uploads
  MAX_FILE_SIZE: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  ALLOWED_FILE_TYPES: z.string().default('image/jpeg,image/png,application/pdf'),
  UPLOAD_STORAGE: z.enum(['local', 's3']).default('local'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),

  // Google Cloud Vision (optional)
  GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
  GOOGLE_CLOUD_KEY_FILE: z.string().optional(),

  // Google Wallet (optional)
  GOOGLE_WALLET_ISSUER_ID: z.string().optional(),

  // Observability
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_PRETTY: z.coerce.boolean().default(false),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  // Password reset
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),

  // Misc
  EXCHANGE_RATE_API_URL: z.string().url().default('https://open.er-api.com/v6/latest'),
});

export type Environment = z.infer<typeof envSchema>;

function loadEnvironment(): Environment {
  // Skip strict validation during tests if no real JWT_SECRET is set
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is required in production');
    }
    // Provide a dev-only secret that is clearly marked
    process.env.JWT_SECRET = 'dev-only-secret-do-not-use-in-production-minimum-32-chars';
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((e: any) => `  ${e.path.join('.')}: ${e.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  // Additional production-only checks
  if (parsed.data.NODE_ENV === 'production') {
    if (!parsed.data.REDIS_URL) {
      throw new Error('REDIS_URL is required in production');
    }
    if (parsed.data.JWT_SECRET === 'dev-only-secret-do-not-use-in-production-minimum-32-chars') {
      throw new Error('FATAL: Production cannot use the dev JWT secret');
    }
  }

  return parsed.data;
}

export const environment = loadEnvironment();
