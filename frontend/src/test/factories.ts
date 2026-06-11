import type { AuthUser } from '@/features/auth/authStore';
import type { Receipt } from '@/features/receipts/types';

let _idCounter = 1;

export function nextId(): string {
  const padded = String(_idCounter).padStart(12, '0');
  _idCounter += 1;
  return '00000000-0000-0000-0000-' + padded;
}

export const USER_PERMISSIONS: string[] = [
  'receipts:create',
  'receipts:read',
  'receipts:update',
  'receipts:delete',
  'budgets:create',
  'budgets:read',
  'budgets:update',
  'budgets:delete',
  'analytics:read',
  'settings:read',
  'settings:update',
];

export const ADMIN_PERMISSIONS: string[] = [
  'receipts:create',
  'receipts:read',
  'receipts:read_all',
  'receipts:update',
  'receipts:delete',
  'budgets:create',
  'budgets:read',
  'budgets:update',
  'budgets:delete',
  'analytics:read',
  'settings:read',
  'settings:update',
  'users:manage',
  'roles:manage',
];

export const VIEWER_PERMISSIONS: string[] = [
  'receipts:read',
  'budgets:read',
  'analytics:read',
  'settings:read',
];

export function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: overrides.id || nextId(),
    email: overrides.email || 'qa@paytrack-test.dev',
    name: overrides.name || 'Test User',
    roles: overrides.roles || ['user'],
    permissions: overrides.permissions || USER_PERMISSIONS,
  };
}

export function makeAdmin(): AuthUser {
  return makeUser({
    email: 'admin@paytrack-test.dev',
    name: 'Admin User',
    roles: ['admin'],
    permissions: ADMIN_PERMISSIONS,
  });
}

export function makeViewer(): AuthUser {
  return makeUser({
    email: 'viewer@paytrack-test.dev',
    name: 'Viewer User',
    roles: ['viewer'],
    permissions: VIEWER_PERMISSIONS,
  });
}

interface AuthResp {
  user: AuthUser;
  token: string;
  refreshToken: string;
}

export function makeAuthResponse(opts: Partial<AuthResp> = {}): AuthResp {
  return {
    user: opts.user || makeUser(),
    token: opts.token || ('mock-access-token-' + nextId()),
    refreshToken: opts.refreshToken || ('mock-refresh-token-' + nextId()),
  };
}

export function makeReceipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    id: overrides.id || nextId(),
    merchant: overrides.merchant || 'Acme Corp',
    amount: overrides.amount === undefined ? 1234.56 : overrides.amount,
    date: overrides.date || '2026-05-01',
    category: overrides.category || 'Food',
    items: overrides.items || [],
    notes: overrides.notes,
    imageUrl: overrides.imageUrl,
  };
}

export function makeReceiptList(count: number): Receipt[] {
  const cats = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment'];
  const out: Receipt[] = [];
  for (let i = 0; i < count; i++) {
    const day = String(i + 1).padStart(2, '0');
    out.push(
      makeReceipt({
        merchant: 'Merchant ' + (i + 1),
        amount: (i + 1) * 100,
        category: cats[i % cats.length],
        date: '2026-05-' + day,
      })
    );
  }
  return out;
}

interface ProblemOpts {
  status: number;
  code: string;
  title: string;
  errors?: Array<{ field: string; message: string }>;
}

export function makeProblem(opts: ProblemOpts) {
  const slug = opts.code.toLowerCase().replace(/_/g, '-');
  const out: Record<string, unknown> = {
    type: 'https://paytrack.dev/errors/' + slug,
    title: opts.title,
    status: opts.status,
    code: opts.code,
    traceId: 'test-trace',
    instance: '/test',
  };
  if (opts.errors) {
    out.errors = opts.errors;
  }
  return out;
}
