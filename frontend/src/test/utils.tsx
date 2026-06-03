/**
 * Custom render utilities for React Testing Library.
 *
 * Every UI test should call `renderWithProviders(<Component />)` so the
 * component sees the same QueryClient + Router context it would in the app.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { type ReactElement, type ReactNode } from 'react';
import {
  MemoryRouter,
  type MemoryRouterProps,
  Route,
  Routes,
} from 'react-router-dom';

import { useAuthStore, type AuthUser } from '@/features/auth/authStore';
import { makeUser } from './factories';

// ---------------------------------------------------------------------------
//  QueryClient — fresh per test, retries off so failures surface immediately
// ---------------------------------------------------------------------------

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

// ---------------------------------------------------------------------------
//  Auth helpers
// ---------------------------------------------------------------------------

export interface SignInOpts {
  user?: Partial<AuthUser>;
  token?: string;
  refreshToken?: string;
}

/**
 * Pre-populate the auth store as if the user has logged in.
 * Use in tests that need to render a protected component.
 */
export function signIn(opts: SignInOpts = {}): AuthUser {
  const user = makeUser(opts.user ?? {});
  useAuthStore.setState({
    user,
    token: opts.token ?? 'mock-access-token',
    refreshToken: opts.refreshToken ?? 'mock-refresh-token',
  });
  return user;
}

/** Clear the auth store. Useful when you want to re-render unauthenticated. */
export function signOut(): void {
  useAuthStore.setState({ user: null, token: null, refreshToken: null });
}

// ---------------------------------------------------------------------------
//  Render with providers
// ---------------------------------------------------------------------------

export interface ProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
  initialEntries?: MemoryRouterProps['initialEntries'];
  initialIndex?: number;
}

export function AppProviders({
  children,
  queryClient,
  initialEntries,
  initialIndex,
}: ProvidersProps) {
  const client = queryClient ?? createTestQueryClient();
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialEntries?: MemoryRouterProps['initialEntries'];
  initialIndex?: number;
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {}
): RenderResult & { queryClient: QueryClient } {
  const queryClient = options.queryClient ?? createTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AppProviders
      queryClient={queryClient}
      initialEntries={options.initialEntries}
      initialIndex={options.initialIndex}
    >
      {children}
    </AppProviders>
  );

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...options }),
  };
}

/**
 * Render a component at a specific route together with a sentinel route
 * for "redirected to /login" assertions.
 *
 * Usage:
 *   renderAtRoute(<ProtectedRoute><Secret/></ProtectedRoute>, {
 *     path: '/secret', initialEntries: ['/secret'],
 *     extraRoutes: <Route path="/login" element={<div>LOGIN_PAGE</div>} />
 *   });
 */
export function renderAtRoute(
  element: ReactElement,
  opts: {
    path?: string;
    initialEntries?: MemoryRouterProps['initialEntries'];
    extraRoutes?: ReactNode;
    queryClient?: QueryClient;
  } = {}
): RenderResult & { queryClient: QueryClient } {
  const queryClient = opts.queryClient ?? createTestQueryClient();
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={opts.initialEntries ?? [opts.path ?? '/']}>
          <Routes>
            <Route path={opts.path ?? '/'} element={element} />
            {opts.extraRoutes}
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    ),
  };
}

// Re-export the rest of RTL so tests only need one import.
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
