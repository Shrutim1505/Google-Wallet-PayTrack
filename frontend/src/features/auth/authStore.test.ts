/**
 * Tests for the Zustand auth store — RBAC, authentication state, persistence.
 */
import { describe, expect, it } from 'vitest';

import {
  ADMIN_PERMISSIONS,
  USER_PERMISSIONS,
  VIEWER_PERMISSIONS,
  makeAdmin,
  makeUser,
  makeViewer,
} from '@/test/factories';

import {
  clearAuth,
  getAuthToken,
  getRefreshToken,
  useAuthStore,
} from './authStore';

describe('authStore — initial state', () => {
  it('starts unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated()).toBe(false);
  });
});

describe('authStore — setAuth / clearAuth', () => {
  it('records the authenticated user and tokens', () => {
    const user = makeUser();
    useAuthStore.getState().setAuth({ user, token: 't', refreshToken: 'r' });

    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().token).toBe('t');
    expect(useAuthStore.getState().refreshToken).toBe('r');
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);
  });

  it('clearAuth resets everything', () => {
    useAuthStore.getState().setAuth({ user: makeUser(), token: 't', refreshToken: 'r' });
    useAuthStore.getState().clearAuth();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });

  it('updateTokens rotates without dropping the user', () => {
    const user = makeUser();
    useAuthStore.getState().setAuth({ user, token: 't1', refreshToken: 'r1' });
    useAuthStore.getState().updateTokens({ token: 't2', refreshToken: 'r2' });

    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().token).toBe('t2');
    expect(useAuthStore.getState().refreshToken).toBe('r2');
  });
});

describe('authStore — isAuthenticated edge cases', () => {
  it('requires both token and user', () => {
    useAuthStore.setState({ user: null, token: 'token-only', refreshToken: null });
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);

    useAuthStore.setState({ user: makeUser(), token: null, refreshToken: null });
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });
});

describe('authStore — RBAC: hasPermission / hasRole', () => {
  it('default user has the standard permission set, not admin perms', () => {
    useAuthStore.getState().setAuth({
      user: makeUser({ permissions: USER_PERMISSIONS, roles: ['user'] }),
      token: 't',
      refreshToken: 'r',
    });

    const { hasPermission, hasRole } = useAuthStore.getState();
    expect(hasPermission('receipts:create')).toBe(true);
    expect(hasPermission('settings:update')).toBe(true);
    expect(hasPermission('users:manage')).toBe(false);
    expect(hasPermission('roles:manage')).toBe(false);
    expect(hasRole('user')).toBe(true);
    expect(hasRole('admin')).toBe(false);
  });

  it('admin inherits user perms and gains management perms', () => {
    useAuthStore.getState().setAuth({
      user: makeAdmin(),
      token: 't',
      refreshToken: 'r',
    });

    const { hasPermission, hasRole } = useAuthStore.getState();
    expect(hasPermission('users:manage')).toBe(true);
    expect(hasPermission('roles:manage')).toBe(true);
    expect(hasPermission('receipts:read_all')).toBe(true);
    expect(hasRole('admin')).toBe(true);
    // admins still get the regular user perms
    expect(hasPermission('receipts:create')).toBe(true);
  });

  it('viewer is read-only', () => {
    useAuthStore.getState().setAuth({
      user: makeViewer(),
      token: 't',
      refreshToken: 'r',
    });

    const { hasPermission, hasRole } = useAuthStore.getState();
    expect(hasPermission('receipts:read')).toBe(true);
    expect(hasPermission('receipts:create')).toBe(false);
    expect(hasPermission('receipts:delete')).toBe(false);
    expect(hasPermission('settings:update')).toBe(false);
    expect(hasRole('viewer')).toBe(true);
  });

  it('returns false for missing user', () => {
    useAuthStore.setState({ user: null, token: null, refreshToken: null });
    expect(useAuthStore.getState().hasPermission('anything')).toBe(false);
    expect(useAuthStore.getState().hasRole('user')).toBe(false);
  });

  it('viewer permission set matches the documented contract', () => {
    expect(VIEWER_PERMISSIONS.sort()).toEqual([
      'analytics:read',
      'budgets:read',
      'receipts:read',
      'settings:read',
    ]);
    expect(ADMIN_PERMISSIONS).toContain('users:manage');
  });
});

describe('authStore — non-hook accessors', () => {
  it('getAuthToken / getRefreshToken / clearAuth read the live store', () => {
    useAuthStore.getState().setAuth({ user: makeUser(), token: 'abc', refreshToken: 'def' });
    expect(getAuthToken()).toBe('abc');
    expect(getRefreshToken()).toBe('def');

    clearAuth();
    expect(getAuthToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});

describe('authStore — persistence', () => {
  it('writes to localStorage under the namespaced key', () => {
    useAuthStore.getState().setAuth({ user: makeUser(), token: 't', refreshToken: 'r' });
    const raw = localStorage.getItem('paytrack-auth');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed?.state?.token).toBe('t');
  });
});
