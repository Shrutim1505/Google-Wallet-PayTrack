import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary — catches render errors in the component tree
 * and displays a fallback UI instead of crashing the whole app.
 *
 * In production, errors should be reported to Sentry or similar.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console in dev, send to Sentry in prod
    console.error('ErrorBoundary caught:', error, errorInfo);

    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      return (
        <div style={{
          padding: '2rem',
          maxWidth: '600px',
          margin: '4rem auto',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem',
          }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1f2937' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            An unexpected error occurred. Our team has been notified.
          </p>
          {import.meta.env.DEV && (
            <details style={{
              textAlign: 'left',
              padding: '1rem',
              background: '#fef2f2',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              color: '#991b1b',
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                Error details (dev only)
              </summary>
              <pre style={{ marginTop: '0.5rem', overflow: 'auto', fontSize: '0.75rem' }}>
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={this.reset}
              style={{
                padding: '0.5rem 1rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '0.5rem 1rem',
                background: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Go home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
