import { describe, expect, it } from 'vitest';

import { render, screen } from '@/test/utils';

import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders a loading label by default', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders a full-screen variant when requested', () => {
    const { container } = render(<LoadingSpinner fullScreen />);
    expect(container.querySelector('.min-h-screen')).toBeTruthy();
  });
});
