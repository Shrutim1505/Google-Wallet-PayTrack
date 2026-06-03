/**
 * LoginPage tests — covers BOTH the login and the registration mode of
 * the same component. Drives the form via user-event and asserts both
 * happy and unhappy paths against MSW.
 */
import { describe, expect, it } from 'vitest';
import { Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';

import {
  renderAtRoute,
  screen,
  userEvent,
  waitFor,
} from '@/test/utils';
import { useAuthStore } from '@/features/auth/authStore';
import { server } from '@/test/mocks/server';
import { makeProblem } from '@/test/factories';

import { LoginPage } from './LoginPage';

const DASHBOARD = <div>DASHBOARD_MARKER</div>;
const renderLogin = () =>
  renderAtRoute(<LoginPage />, {
    path: '/login',
    initialEntries: ['/login'],
    extraRoutes: <Route path="/" element={DASHBOARD} />,
  });

describe('LoginPage — sign-in flow', () => {
  it('logs the user in and navigates to the dashboard', async () => {
    const user = userEvent.setup();
    renderLogin();

    expect(screen.getByText(/sign in to continue/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email/i), 'qa@x.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Sup3rSecret!');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(screen.getByText('DASHBOARD_MARKER')).toBeInTheDocument());

    const state = useAuthStore.getState();
    expect(state.user?.email).toBe('qa@x.com');
    expect(state.token).toBeTruthy();
  });

  it('surfaces 401 errors with a generic message and does not redirect', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'qa@x.com');
    await user.type(screen.getByLabelText(/^password$/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid email or password/i)
    );
    expect(screen.queryByText('DASHBOARD_MARKER')).not.toBeInTheDocument();
  });

  it('shows a loading state on the submit button while the mutation is in flight', async () => {
    server.use(
      http.post('*/api/v1/auth/login', async () => {
        await new Promise((r) => setTimeout(r, 80));
        return HttpResponse.json({
          success: true,
          data: {
            user: { id: '1', email: 'q@x.com', name: 'Q', roles: ['user'], permissions: [] },
            token: 't',
            refreshToken: 'r',
          },
        });
      })
    );

    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'q@x.com');
    await user.type(screen.getByLabelText(/^password$/i), 'pw1234567');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    // Button text is replaced by the spinner (Button component) — assert disabled.
    await waitFor(() => {
      const submit = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;
      expect(submit.disabled).toBe(true);
    });
  });

  it('renders the Demo Login button only on the sign-in screen', async () => {
    const user = userEvent.setup();
    renderLogin();
    expect(screen.getByRole('button', { name: /demo login/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /register/i }));
    expect(screen.queryByRole('button', { name: /demo login/i })).not.toBeInTheDocument();
  });
});

describe('LoginPage — registration flow', () => {
  it('toggles to register mode and registers a new user', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /register/i }));
    expect(screen.getByText(/create your account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^name$/i), 'New User');
    await user.type(screen.getByLabelText(/email/i), 'new@x.com');
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass1!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(screen.getByText('DASHBOARD_MARKER')).toBeInTheDocument());
    expect(useAuthStore.getState().user?.email).toBe('new@x.com');
  });

  it('shows server-supplied field-level errors on the field itself', async () => {
    server.use(
      http.post('*/api/v1/auth/register', async () =>
        HttpResponse.json(
          makeProblem({
            status: 422,
            code: 'VALIDATION_ERROR',
            title: 'Validation failed',
            errors: [
              { field: 'email', message: 'Email format invalid by policy' },
              { field: 'password', message: 'Password must be at least 8 characters' },
            ],
          }),
          { status: 422, headers: { 'Content-Type': 'application/problem+json' } }
        )
      )
    );

    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole('button', { name: /register/i }));

    // Use values that pass HTML5 validation (so the form actually submits to MSW).
    await user.type(screen.getByLabelText(/^name$/i), 'Mr Bad');
    await user.type(screen.getByLabelText(/email/i), 'looks-valid@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'longenough');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      // Field-level errors render as alerts inside the Input component.
      const alerts = screen.getAllByRole('alert');
      const messages = alerts.map((a) => a.textContent);
      expect(messages).toEqual(
        expect.arrayContaining([
          'Email format invalid by policy',
          expect.stringMatching(/at least 8 characters/i),
        ])
      );
    });
    expect(screen.queryByText('DASHBOARD_MARKER')).not.toBeInTheDocument();
  });

  it('shows a top-level error when the email is already taken', async () => {
    server.use(
      http.post('*/api/v1/auth/register', async () =>
        HttpResponse.json(
          makeProblem({
            status: 409,
            code: 'CONFLICT',
            title: 'Email already registered',
          }),
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } }
        )
      )
    );

    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole('button', { name: /register/i }));

    await user.type(screen.getByLabelText(/^name$/i), 'Duplicate');
    await user.type(screen.getByLabelText(/email/i), 'taken@x.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Sup3rSecret!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/email already registered/i)
      ).toBeInTheDocument()
    );
  });
});
