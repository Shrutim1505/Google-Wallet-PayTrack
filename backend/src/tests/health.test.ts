import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import healthRoutes from '../routes/health.js';

describe('Health endpoints', () => {
  const app = express();
  app.use('/health', healthRoutes);

  describe('GET /health/live (liveness)', () => {
    it('always returns 200 when the process is alive', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('alive');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.uptime).toBeGreaterThanOrEqual(0);
      expect(res.body.timestamp).toBeTruthy();
    });

    it('response is fast (no heavy dependency checks)', async () => {
      const start = Date.now();
      await request(app).get('/health/live');
      expect(Date.now() - start).toBeLessThan(100);
    });
  });

  describe('GET /health/ready (readiness)', () => {
    it('returns 200 when all dependencies are healthy', async () => {
      const res = await request(app).get('/health/ready');
      // DB + cache are initialized by tests/setup.ts, so both should be ok
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.checks.database.status).toBe('ok');
      expect(res.body.checks.cache.status).toBe('ok');
      expect(typeof res.body.checks.database.latency).toBe('number');
    });
  });

  describe('GET /health (legacy)', () => {
    it('returns 200 for backward compat', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });
});
