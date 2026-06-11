/**
 * Tests for the route guards.
 *
 * - `ProtectedRoute` redirects unauthenticated users to /login.
 * - `PublicOnlyRoute` redirects authenticated users to /.
 */
import { describe, expect, it } from 'vitest';
import { Route } from 'react-router-dom';

import { renderAtRoute, screen, signIn, signOut } from '@/test/utils';

import { ProtectedRoute, PublicOnlyRoute } from './guards';

describe('ProtectedRoute', () => {
  it('renders children when authenticated', () => {
    signIn();
    renderAtRoute(
      <ProtectedRoute>
        <div>secret area</div>
      </ProtectedRoute>,
      { path: '/secret', initialEntries: ['/secret'] }
    );

    expect(screen.getByText('secret area')).toBeInTheDocument();
  });

  it('redirects to /login when unauthenticated', () => {
    signOut();
    renderAtRoute(
      <ProtectedRoute>
        <div>secret area</div>
      </ProtectedRoute>,
      {
        path: '/secret',
        initialEntries: ['/secret'],
        extraRoutes: <Route path="/login" element={<div>LOGIN_MARKER</div>} />,
      }
    );

    expect(screen.queryByText('secret area')).not.toBeInTheDocument();
    expect(screen.getByText('LOGIN_MARKER')).toBeInTheDocument();
  });
});

describe('PublicOnlyRoute', () => {
  it('renders children when unauthenticated', () => {
    signOut();
    renderAtRoute(
      <PublicOnlyRoute>
        <div>login form</div>
      </PublicOnlyRoute>,
      { path: '/login', initialEntries: ['/login'] }
    );

    expect(screen.getByText('login form')).toBeInTheDocument();
  });

  it('redirects to / when already authenticated', () => {
    signIn();
    renderAtRoute(
      <PublicOnlyRoute>
        <div>login form</div>
      </PublicOnlyRoute>,
      {
        path: '/login',
        initialEntries: ['/login'],
        extraRoutes: <Route path="/" element={<div>DASHBOARD_MARKER</div>} />,
      }
    );

    expect(screen.queryByText('login form')).not.toBeInTheDocument();
    expect(screen.getByText('DASHBOARD_MARKER')).toBeInTheDocument();
  });
});
