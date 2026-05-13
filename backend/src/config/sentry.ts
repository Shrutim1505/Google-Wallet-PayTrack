import * as Sentry from '@sentry/node';
import { Express } from 'express';
import { environment } from './environment.js';
import { logger } from '../utils/logger.js';

export function initializeSentry(): void {
  if (!environment.SENTRY_DSN) {
    logger.info('Sentry not configured (SENTRY_DSN not set)');
    return;
  }

  Sentry.init({
    dsn: environment.SENTRY_DSN,
    environment: environment.NODE_ENV,
    tracesSampleRate: environment.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: environment.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Scrub sensitive data
      if (event.request?.data) {
        const data = event.request.data as Record<string, unknown>;
        for (const key of ['password', 'currentPassword', 'newPassword', 'token', 'refreshToken']) {
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
