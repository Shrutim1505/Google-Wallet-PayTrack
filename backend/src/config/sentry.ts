import * as Sentry from '@sentry/node';
import { Express } from 'express';
import { environment } from './environment.js';
import { logger } from '../utils/logger.js';

const SENSITIVE_FIELDS = ['password', 'currentPassword', 'newPassword', 'token', 'refreshToken'];
const PRODUCTION_SAMPLE_RATE = 0.1;
const DEVELOPMENT_SAMPLE_RATE = 1.0;

export function initializeSentry(): void {
  if (!environment.SENTRY_DSN) {
    logger.info('Sentry not configured (SENTRY_DSN not set)');
    return;
  }

  const sampleRate = environment.NODE_ENV === 'production'
    ? PRODUCTION_SAMPLE_RATE
    : DEVELOPMENT_SAMPLE_RATE;

  Sentry.init({
    dsn: environment.SENTRY_DSN,
    environment: environment.NODE_ENV,
    tracesSampleRate: sampleRate,
    profilesSampleRate: sampleRate,
    beforeSend(event) {
      if (event.request?.data) {
        const data = event.request.data as Record<string, unknown>;
        for (const key of SENSITIVE_FIELDS) {
          if (data[key]) data[key] = '[REDACTED]';
        }
      }
      return event;
    },
  });

  logger.info({ msg: 'Sentry initialized', env: environment.NODE_ENV });
}

export function attachSentryRequestHandler(app: Express): void {
  if (!environment.SENTRY_DSN) return;
  Sentry.setupExpressErrorHandler(app);
}

export { Sentry };
