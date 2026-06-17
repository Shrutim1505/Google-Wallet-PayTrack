/**
 * Default MSW handlers — happy-path responses for every endpoint the
 * frontend talks to.
 *
 * Tests can override individual handlers via `server.use(...)` for the
 * negative paths (errors, slow networks, empty lists, etc).
 */
import { HttpResponse, http } from 'msw';

import {
  makeAuthResponse,
  makeProblem,
  makeReceipt,
  makeReceiptList,
  makeUser,
} from '../factories';
import { receiptDB } from './db';

// The frontend reads VITE_API_URL or defaults to /api/v1
const BASE = '*/api/v1';

// Standard envelope helper
const ok = <T>(data: T, message = 'OK', extra: Record<string, unknown> = {}) =>
  HttpResponse.json({ success: true, data, message, ...extra });

const created = <T>(data: T, message = 'Created') =>
  HttpResponse.json({ success: true, data, message }, { status: 201 });

const problem = (
  status: number,
  code: string,
  title: string,
  errors?: Array<{ field: string; message: string }>
) =>
  HttpResponse.json(makeProblem({ status, code, title, errors }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });

export const handlers = [
  // -----------------------------------------------------------------------
  //  Auth
  // -----------------------------------------------------------------------
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };

    if (body.password === 'wrong-password') {
      return problem(401, 'UNAUTHORIZED', 'Invalid email or password');
    }
    if (body.email === 'fielderror@x.com') {
      return problem(422, 'VALIDATION_ERROR', 'Validation failed', [
        { field: 'email', message: 'Invalid email format' },
      ]);
    }
    return ok(makeAuthResponse({ user: makeUser({ email: body.email }) }), 'Login successful');
  }),

  http.post(`${BASE}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string; name: string };

    if (body.email === 'taken@x.com') {
      return problem(409, 'CONFLICT', 'Email already registered');
    }
    if (!body.password || body.password.length < 8) {
      return problem(422, 'VALIDATION_ERROR', 'Validation failed', [
        { field: 'password', message: 'Password must be at least 8 characters' },
      ]);
    }
    return new HttpResponse(
      JSON.stringify({
        success: true,
        message: 'Registration successful',
        data: makeAuthResponse({ user: makeUser({ email: body.email, name: body.name }) }),
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  }),

  http.post(`${BASE}/auth/logout`, async () =>
    HttpResponse.json({ success: true, message: 'Logged out' })
  ),

  http.post(`${BASE}/auth/refresh`, async ({ request }) => {
    const body = (await request.json()) as { refreshToken?: string };
    if (!body?.refreshToken) {
      return problem(400, 'BAD_REQUEST', 'refreshToken is required');
    }
    if (body.refreshToken === 'invalid') {
      return problem(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
    }
    return ok(makeAuthResponse());
  }),

  http.post(`${BASE}/auth/change-password`, async () =>
    HttpResponse.json({ success: true, message: 'Password changed successfully' })
  ),

  http.post(`${BASE}/auth/password-reset/request`, async () =>
    HttpResponse.json({ success: true, message: 'If the email exists, a reset link has been sent' })
  ),

  http.post(`${BASE}/auth/password-reset/confirm`, async () =>
    HttpResponse.json({ success: true, message: 'Password reset successfully' })
  ),

  http.get(`${BASE}/auth/verify`, async ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (!auth) return problem(401, 'UNAUTHORIZED', 'No token provided');
    return ok({
      userId: 'test-user-id',
      email: 'qa@paytrack-test.dev',
      roles: ['user'],
      permissions: ['receipts:read'],
    });
  }),

  // -----------------------------------------------------------------------
  //  Receipts
  // -----------------------------------------------------------------------
  http.get(`${BASE}/receipts`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const category = url.searchParams.get('category');
    const minAmount = Number(url.searchParams.get('minAmount') || 0);
    const maxAmount = Number(url.searchParams.get('maxAmount') || 0);

    let results = receiptDB.list();
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        r =>
          r.merchant.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
      );
    }
    if (category) results = results.filter(r => r.category === category);
    if (minAmount) results = results.filter(r => r.amount >= minAmount);
    if (maxAmount) results = results.filter(r => r.amount <= maxAmount);

    return HttpResponse.json({
      success: true,
      data: results,
      pagination: {
        page: 1,
        limit: 20,
        total: results.length,
        hasMore: false,
      },
      message: 'Receipts retrieved successfully',
    });
  }),

  http.get(`${BASE}/receipts/autocomplete`, ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').toLowerCase();
    if (!q) return ok([]);
    return ok(receiptDB.list().filter(r => r.merchant.toLowerCase().startsWith(q)).map(r => r.merchant));
  }),

  http.get(`${BASE}/receipts/export`, ({ request }) => {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';
    if (format === 'csv') {
      const header = 'id,merchant,amount,date,category\n';
      const rows = receiptDB.list().map(r =>
        `"${r.id}","${r.merchant}",${r.amount},"${r.date}","${r.category}"`
      ).join('\n');
      return new HttpResponse(header + rows, {
        status: 200,
        headers: { 'Content-Type': 'text/csv' },
      });
    }
    return ok(receiptDB.list());
  }),

  http.get(`${BASE}/receipts/:id`, ({ params }) => {
    const found = receiptDB.findById(params.id as string);
    if (!found) return problem(404, 'NOT_FOUND', 'Receipt not found');
    return ok(found);
  }),

  http.post(`${BASE}/receipts`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.merchant || (body as { merchant: string }).merchant.toString().trim() === '') {
      return problem(400, 'BAD_REQUEST', 'Merchant and amount are required');
    }
    const r = makeReceipt({
      merchant: String(body.merchant),
      amount: Number(body.amount),
      date: String(body.date),
      category: (body.category as string) ?? 'Other',
      items: [],
    });
    receiptDB.add(r);
    return created(r, 'Receipt created successfully');
  }),

  http.post(`${BASE}/receipts/upload`, async () => {
    const r = makeReceipt({ merchant: 'Uploaded Merchant', amount: 999, category: 'Other' });
    receiptDB.add(r);
    return created(r, 'Receipt processed successfully');
  }),

  http.put(`${BASE}/receipts/:id`, async ({ params, request }) => {
    const found = receiptDB.findById(params.id as string);
    if (!found) return problem(404, 'NOT_FOUND', 'Receipt not found');
    const updates = (await request.json()) as Record<string, unknown>;
    const updated = { ...found, ...updates } as typeof found;
    receiptDB.update(updated);
    return ok(updated, 'Receipt updated successfully');
  }),

  http.delete(`${BASE}/receipts/:id`, ({ params }) => {
    const removed = receiptDB.remove(params.id as string);
    if (!removed) return problem(404, 'NOT_FOUND', 'Receipt not found');
    return HttpResponse.json({
      success: true,
      data: null,
      message: 'Receipt deleted successfully',
    });
  }),

  // -----------------------------------------------------------------------
  //  Health (optional — we don't currently call from frontend, but cheap)
  // -----------------------------------------------------------------------
  http.get('*/health/live', () =>
    HttpResponse.json({ status: 'alive', uptime: 1, timestamp: new Date().toISOString() })
  ),

  // -----------------------------------------------------------------------
  //  Budgets
  // -----------------------------------------------------------------------
  http.get(`${BASE}/budgets/status`, () =>
    ok([
      { id: 'b1', category: 'Food', budgetAmount: 8000, spent: 6313, percentage: 79, period: 'monthly', alertEnabled: true, alertThreshold: 80, isOverBudget: false, isNearThreshold: false },
      { id: 'b2', category: 'Transport', budgetAmount: 3000, spent: 3200, percentage: 107, period: 'monthly', alertEnabled: true, alertThreshold: 80, isOverBudget: true, isNearThreshold: false },
    ])
  ),
  http.post(`${BASE}/budgets`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.category || !body.amount) return problem(400, 'BAD_REQUEST', 'category and amount required');
    return created({ id: 'new-budget', ...body }, 'Budget created');
  }),
  http.delete(`${BASE}/budgets/:id`, () => ok(null, 'Budget deleted')),

  // -----------------------------------------------------------------------
  //  Settings
  // -----------------------------------------------------------------------
  http.get(`${BASE}/settings`, () =>
    ok({ settings: { name: 'Demo User', email: 'demo@example.com', monthlyBudget: 50000, notificationsEnabled: true, darkMode: false } })
  ),
  http.put(`${BASE}/settings`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return ok({ settings: { name: 'Demo User', email: 'demo@example.com', monthlyBudget: 50000, notificationsEnabled: true, darkMode: false, ...body } }, 'Settings updated successfully');
  }),

  // -----------------------------------------------------------------------
  //  Currency
  // -----------------------------------------------------------------------
  http.post(`${BASE}/features/currency/convert`, async ({ request }) => {
    const body = (await request.json()) as { amount: number; from: string; to: string };
    const rate = body.from === body.to ? 1 : 94.6;
    return ok({ converted: Math.round(body.amount * rate * 100) / 100, rate });
  }),

  // -----------------------------------------------------------------------
  //  Smart Alerts
  // -----------------------------------------------------------------------
  http.get(`${BASE}/features/alerts`, () =>
    ok({
      alerts: [
        { id: 'a1', type: 'spending_spike', message: 'You spent 457% more on Food this week', severity: 'critical', data: {}, isRead: false, createdAt: new Date().toISOString() },
        { id: 'a2', type: 'budget_warning', message: 'Budget alert: 79% used this month', severity: 'warning', data: {}, isRead: true, createdAt: new Date().toISOString() },
      ],
      unreadCount: 1,
    })
  ),
  http.post(`${BASE}/features/alerts/read`, () => ok(null, 'Alerts marked as read')),

  // -----------------------------------------------------------------------
  //  Receipt AI metadata + category correction
  // -----------------------------------------------------------------------
  http.get(`${BASE}/receipts/:id/ai`, () =>
    ok({
      llmExtracted: null,
      ocrExtracted: { vendor: 'Cafe Mocha', amount: 1113, date: '2026-06-17', items: [] },
      discrepancies: {},
      predictedCategory: 'Food',
      confidence: 0.43,
      modelSource: 'naive_bayes',
      embeddingScore: 0,
      fallbackReason: 'embedding confidence 0 < 0.6',
      createdAt: new Date().toISOString(),
    })
  ),
  http.post(`${BASE}/receipts/:id/correct-category`, async ({ params, request }) => {
    const body = (await request.json()) as { category: string };
    const found = receiptDB.findById(params.id as string);
    const base = found || makeReceipt({ merchant: 'X', amount: 1 });
    return ok({ ...base, category: body.category }, 'Category corrected and model retrained');
  }),
];

/** Convenience seeders so tests can pre-populate data. */
export function seedReceipts(count = 5) {
  receiptDB.clear();
  makeReceiptList(count).forEach(receiptDB.add);
}
