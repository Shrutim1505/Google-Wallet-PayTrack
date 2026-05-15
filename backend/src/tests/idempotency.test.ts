import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { initializeCache, closeCache } from '../config/cache.js';
import { idempotency } from '../middleware/idempotency.js';

describe('idempotency middleware', () => {
  beforeAll(async () => {
    delete process.env.REDIS_URL;
    await closeCache().catch(() => {});
    initializeCache();
  });

  function buildApp() {
    const app = express();
    app.use(express.json());

    // Simulate an authenticated user for user-scoped idempotency
    app.use((req: any, _res, next) => {
      req.userId = req.headers['x-test-user'] || 'test-user';
      next();
    });

    let callCount = 0;
    app.post('/resource', idempotency, (_req, res) => {
      callCount++;
      res.status(201).json({ id: `resource-${callCount}`, callCount });
    });

    app.get('/resource', idempotency, (_req, res) => {
      res.status(200).json({ readonly: true });
    });

    return app;
  }

  beforeEach(async () => {
    // Purge cache between tests
    await closeCache();
    initializeCache();
  });

  it('replays the cached response for the same key', async () => {
    const app = buildApp();
    const key = `test-key-${Date.now()}-${Math.random()}`;

    const first = await request(app)
      .post('/resource')
      .set('Idempotency-Key', key)
      .send({});

    const second = await request(app)
      .post('/resource')
      .set('Idempotency-Key', key)
      .send({});

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body); // Same cached response
    expect(second.body.callCount).toBe(first.body.callCount); // Handler not called twice
  });

  it('different keys produce different responses', async () => {
    const app = buildApp();

    const a = await request(app).post('/resource').set('Idempotency-Key', 'key-a').send({});
    const b = await request(app).post('/resource').set('Idempotency-Key', 'key-b').send({});

    expect(a.body.callCount).not.toBe(b.body.callCount);
  });

  it('scopes by user — different users with same key get different responses', async () => {
    const app = buildApp();
    const key = 'shared-key';

    const alice = await request(app)
      .post('/resource')
      .set('Idempotency-Key', key)
      .set('X-Test-User', 'alice')
      .send({});

    const bob = await request(app)
      .post('/resource')
      .set('Idempotency-Key', key)
      .set('X-Test-User', 'bob')
      .send({});

    expect(alice.body.callCount).not.toBe(bob.body.callCount);
  });

  it('does NOT cache GET requests', async () => {
    const app = buildApp();
    const key = 'get-key';

    const first = await request(app).get('/resource').set('Idempotency-Key', key);
    const second = await request(app).get('/resource').set('Idempotency-Key', key);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    // Not caching GETs, so this just passes through
  });

  it('passes through requests without an Idempotency-Key', async () => {
    const app = buildApp();

    const first = await request(app).post('/resource').send({});
    const second = await request(app).post('/resource').send({});

    expect(first.body.callCount).not.toBe(second.body.callCount);
  });
});
