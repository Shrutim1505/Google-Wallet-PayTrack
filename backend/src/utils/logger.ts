import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Keep logger dependency-free. If you want pretty logs, install `pino-pretty`
  // and set LOG_PRETTY=true.
  transport:
    process.env.LOG_PRETTY === 'true'
      ? {
          target: 'pino-pretty',
          options: { colorize: true },
        }
      : undefined,
});