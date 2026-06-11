import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth.js';
import { requirePermission, requireAnyPermission, requireRole } from '../middleware/rbac.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { requestIdMiddleware } from '../middleware/requestId.js';
import { environment } from '../config/environment.js';

/**
 * These tests verify that permissions baked into the JWT are respected
 * without any DB lookups — the big perf win of the new architecture.
 */
describe('RBAC middleware (from JWT claims)', () => {
  function signToken(payload: Record<string, any>) {
    return jwt.sign({ ...payload, type: 'access' }, environment.JWT_SECRET, { expiresIn: '15m' });
  }

  function buildApp() {
    const app = express();
    app.use(requestIdMiddleware);
    app.use(authMiddleware);

    app.get('/read', requirePermission('receipts:read'), (_req, res) => res.json({ ok: true }));
    app.get('/admin', requirePermission('users:manage'), (_req, res) => res.json({ ok: true }));
    app.get('/either', requireAnyPermission('receipts:read', 'receipts:read_all'), (_req, res) =>
      res.json({ ok: true })
    );
    app.get('/admin-role', requireRole('admin'), (_req, res) => res.json({ ok: true }));

    app.use(errorHandler);
    return app;
  }

  it('allows access when JWT contains the required permission', async () => {
    const app = buildApp();
    const token = signToken({
      sub: 'user-1',
      email: 'u@test.com',
      roles: ['user'],
      permissions: ['receipts:read', 'receipts:create'],
    });

    const res = await request(app).get('/read').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('rejects with 403 when JWT lacks the required permission', async () => {
    const app = buildApp();
    const token = signToken({
      sub: 'user-1',
      email: 'u@test.com',
      roles: ['user'],
      permissions: ['receipts:read'], // does NOT include users:manage
    });

    const res = await request(app).get('/admin').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(res.body.title).toContain('users:manage');
  });

  it('rejects with 401 when no token provided', async () => {
    const res = await request(buildApp()).get('/read');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('rejects with 401 when token is malformed', async () => {
    const res = await request(buildApp())
      .get('/read')
      .set('Authorization', 'Bearer garbage.token.here');
    expect(res.status).toBe(401);
  });

  it('requireAnyPermission passes if any one permission is present', async () => {
    const app = buildApp();
    const token = signToken({
      sub: 'user-1',
      email: 'u@test.com',
      roles: ['user'],
      permissions: ['receipts:read_all'], // has one of the two required
    });

    const res = await request(app).get('/either').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('requireAnyPermission rejects if none of the permissions present', async () => {
    const app = buildApp();
    const token = signToken({
      sub: 'user-1',
      email: 'u@test.com',
      roles: ['user'],
      permissions: ['budgets:read'], // none of the required
    });

    const res = await request(app).get('/either').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('requireRole passes when role is in JWT', async () => {
    const app = buildApp();
    const token = signToken({
      sub: 'user-1',
      email: 'u@test.com',
      roles: ['admin', 'user'],
      permissions: [],
    });

    const res = await request(app).get('/admin-role').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('requireRole rejects when role is not in JWT', async () => {
    const app = buildApp();
    const token = signToken({
      sub: 'user-1',
      email: 'u@test.com',
      roles: ['user'],
      permissions: [],
    });

    const res = await request(app).get('/admin-role').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
