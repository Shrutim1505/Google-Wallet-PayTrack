/**
 * ErrorBoundary tests — verifies the fallback UI on render errors,
 * custom fallbacks, and the reset behaviour.
 */
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders, screen, userEvent } from '@/test/utils';

import { ErrorBoundary } from './ErrorBoundary';

function Boom({ message = 'kaboom' }: { message?: string }): JSX.Element {
  throw new Error(message);
}

describe('ErrorBoundary', () => {
  it('shows the default fallback when a child throws', () => {
    // Suppress React's expected console.error noise for this test.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProviders(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    errorSpy.mockRestore();
  });

  it('renders children normally when nothing throws', () => {
    renderWithProviders(
      <ErrorBoundary>
        <div>all good</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  it('uses the custom fallback when provided', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProviders(
      <ErrorBoundary
        fallback={(error, reset) => (
          <div>
            <p>custom: {error.message}</p>
            <button onClick={reset}>retry</button>
          </div>
        )}
      >
        <Boom message="oops" />
      </ErrorBoundary>
    );

    expect(screen.getByText('custom: oops')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    errorSpy.mockRestore();
  });

  it('reset() lets the boundary re-attempt rendering its children', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();

    let shouldThrow = true;
    function MaybeBoom() {
      if (shouldThrow) throw new Error('first attempt');
      return <div>RECOVERED</div>;
    }

    renderWithProviders(
      <ErrorBoundary
        fallback={(_e, reset) => (
          <button
            onClick={() => {
              shouldThrow = false;
              reset();
            }}
          >
            try again
          </button>
        )}
      >
        <MaybeBoom />
      </ErrorBoundary>
    );

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByText('RECOVERED')).toBeInTheDocument();
    errorSpy.mockRestore();
  });
});
