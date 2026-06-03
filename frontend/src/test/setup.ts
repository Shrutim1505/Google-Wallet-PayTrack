/**
 * Global test setup — runs once per worker before any test.
 *
 *   1. Loads `@testing-library/jest-dom` matchers (toBeInTheDocument, etc).
 *   2. Spins up the MSW node server and tears it down after the run.
 *   3. Resets handler overrides + per-test mock DB between tests.
 *   4. Polyfills DOM bits JSDOM does not implement (matchMedia, IntersectionObserver).
 *   5. Resets the Zustand auth store + localStorage so each test
 *      starts from a clean slate.
 */
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

import { useAuthStore } from '@/features/auth/authStore';

import { receiptDB } from './mocks/db';
import { server } from './mocks/server';

// -----------------------------------------------------------------------
//  MSW lifecycle
// -----------------------------------------------------------------------
beforeAll(() =>
  server.listen({
    // Loud mode — any unhandled request fails the test rather than
    // silently 200-ing or hitting the real network.
    onUnhandledRequest: 'error',
  })
);

afterEach(() => {
  server.resetHandlers();
  receiptDB.clear();
  cleanup();
  // Reset auth store to its zero state.
  useAuthStore.setState({ user: null, token: null, refreshToken: null });
  localStorage.clear();
  sessionStorage.clear();
});

afterAll(() => server.close());

// -----------------------------------------------------------------------
//  JSDOM polyfills
// -----------------------------------------------------------------------
beforeEach(() => {
  // matchMedia — used by Tailwind components, recharts, headless UI.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated but recharts uses it
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // IntersectionObserver — used by virtualised lists, lazy components.
  if (!('IntersectionObserver' in window)) {
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    };
  }

  // ResizeObserver — used by recharts.
  if (!('ResizeObserver' in window)) {
    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  // crypto.randomUUID — used by axios idempotency-key generation.
  if (!('randomUUID' in (globalThis.crypto || {}))) {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        ...globalThis.crypto,
        randomUUID: () => `00000000-0000-0000-0000-${Date.now().toString(16).padStart(12, '0')}`,
      },
    });
  }
});

// -----------------------------------------------------------------------
//  Default API base — make sure axios hits the MSW handlers.
// -----------------------------------------------------------------------
process.env.VITE_API_URL = 'http://localhost:5000/api/v1';
// Mirror for vite-style import.meta.env where reachable.
(import.meta as unknown as { env: Record<string, string> }).env = {
  ...((import.meta as unknown as { env?: Record<string, string> }).env || {}),
  VITE_API_URL: 'http://localhost:5000/api/v1',
  DEV: 'true',
  MODE: 'test',
};
