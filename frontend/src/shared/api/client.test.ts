/**
 * apiClient (axios) tests — refresh-token interceptor.
 *
 * Drives the interceptor end-to-end via MSW: a protected request is
 * fired with an expired access token, the backend returns 401, the
 * interceptor calls /auth/refresh transparently, then retries the
 * original request.
 */
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import { server } from '@/test/mocks/server';
import { signIn } from '@/test/utils';
import { useAuthStore } from '@/features/auth/authStore';

import { apiClient } from './client';

describe('apiClient — refresh-token interceptor', () => {
  it('refreshes the token on 401 and retries the original request', async () => {
    signIn({ token: 'expired', refreshToken: 'good-refresh' });

    let calls = 0;
    server.use(
      http.get('*/api/v1/receipts', ({ request }) => {
        calls += 1;
        const auth = request.headers.get('Authorization');
        // First call has the stale token → 401. After refresh, retry has the new token.
        if (calls === 1 || auth?.includes('expired')) {
          return HttpResponse.json(
            { type: 'urn', title: 'expired', status: 401, code: 'UNAUTHORIZED' },
            { status: 401, headers: { 'Content-Type': 'application/problem+json' } }
          );
        }
        return HttpResponse.json({
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, hasMore: false },
        });
      }),
      http.post('*/api/v1/auth/refresh', () =>
        HttpResponse.json({
          success: true,
          data: {
            user: { id: '1', email: 'a@b.com', name: 'A', roles: ['user'], permissions: [] },
            token: 'rotated-access',
            refreshToken: 'rotated-refresh',
          },
        })
      )
    );

    const response = await apiClient.get('/receipts');
    expect(response.status).toBe(200);

    // Auth store should now hold the rotated tokens.
    expect(useAuthStore.getState().token).toBe('rotated-access');
    expect(useAuthStore.getState().refreshToken).toBe('rotated-refresh');
    // We expect at least 2 hits to /receipts: original 401, then retry.
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it('clears auth and rejects when the refresh itself fails', async () => {
    signIn({ token: 'expired', refreshToken: 'bad-refresh' });

    server.use(
      http.get('*/api/v1/receipts', () =>
        HttpResponse.json(
          { type: 'urn', title: 'expired', status: 401, code: 'UNAUTHORIZED' },
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } }
        )
      ),
      http.post('*/api/v1/auth/refresh', () =>
        HttpResponse.json(
          { type: 'urn', title: 'no good', status: 401, code: 'UNAUTHORIZED' },
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } }
        )
      )
    );

    await expect(apiClient.get('/receipts')).rejects.toBeDefined();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });
});
