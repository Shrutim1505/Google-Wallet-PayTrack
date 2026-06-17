import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { AppError, errorHandler } from '../middleware/errorHandler.js';
import { requestIdMiddleware } from '../middleware/requestId.js';

describe('AppError', () => {
  describe('static helpers', () => {
    it('badRequest() creates 400', () => {
      const e = AppError.badRequest('bad');
      expect(e.statusCode).toBe(400);
      expect(e.code).toBe('BAD_REQUEST');
      expect(e.message).toBe('bad');
    });

    it('unauthorized() creates 401', () => {
      const e = AppError.unauthorized();
      expect(e.statusCode).toBe(401);
      expect(e.code).toBe('UNAUTHORIZED');
    });

    it('forbidden() creates 403', () => {
      expect(AppError.forbidden().statusCode).toBe(403);
    });

    it('notFound() includes resource name', () => {
      const e = AppError.notFound('User');
      expect(e.statusCode).toBe(404);
      expect(e.message).toBe('User not found');
    });

    it('conflict() creates 409', () => {
      expect(AppError.conflict('exists').statusCode).toBe(409);
    });

    it('validation() creates 422 with field errors', () => {
      const errors = [{ field: 'email', message: 'invalid' }];
      const e = AppError.validation(errors);
      expect(e.statusCode).toBe(422);
      expect(e.errors).toEqual(errors);
    });

    it('internal() creates 500', () => {
      expect(AppError.internal().statusCode).toBe(500);
    });
  });

  describe('legacy 2-arg constructor', () => {
    it('infers code from status when only (status, message) provided', () => {
      const e = new AppError(404, 'Not found');
      expect(e.statusCode).toBe(404);
      expect(e.code).toBe('NOT_FOUND');
      expect(e.message).toBe('Not found');
    });
  });

  describe('new 3-arg constructor', () => {
    it('uses explicit code', () => {
      const e = new AppError(418, 'TEAPOT', "I'm a teapot");
      expect(e.code).toBe('TEAPOT');
      expect(e.message).toBe("I'm a teapot");
    });
  });
});

describe('errorHandler (RFC 7807 Problem Details)', () => {
  function buildApp() {
    const app = express();
    app.use(requestIdMiddleware);
    app.get('/throw-app-error', (_req, _res, next) =>
      next(AppError.forbidden('No way'))
    );
    app.get('/throw-validation', (_req, _res, next) =>
      next(AppError.validation([{ field: 'email', message: 'required' }]))
    );
    app.get('/throw-generic', (_req, _res, next) =>
      next(new Error('something broke'))
    );
    app.use(errorHandler);
    return app;
  }

  it('AppError responses are RFC 7807 Problem Details', async () => {
    const res = await request(buildApp()).get('/throw-app-error');

    expect(res.status).toBe(403);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body).toMatchObject({
      type: expect.stringContaining('paytrack.dev/errors/'),
      title: 'No way',
      status: 403,
      code: 'FORBIDDEN',
      instance: 'GET /throw-app-error',
    });
    expect(res.body.traceId).toBeTruthy();
  });

  it('validation errors include field-level errors array', async () => {
    const res = await request(buildApp()).get('/throw-validation');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.errors).toEqual([{ field: 'email', message: 'required' }]);
  });

  it('trace ID from X-Request-Id header is propagated', async () => {
    const res = await request(buildApp())
      .get('/throw-app-error')
      .set('X-Request-Id', 'custom-trace-abc');

    expect(res.body.traceId).toBe('custom-trace-abc');
  });

  it('unknown errors become 500 INTERNAL_ERROR', async () => {
    const res = await request(buildApp()).get('/throw-generic');

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      status: 500,
      code: 'INTERNAL_ERROR',
      title: 'Internal server error',
    });
  });
});
