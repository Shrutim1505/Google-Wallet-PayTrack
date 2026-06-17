import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, signIn } from '@/test/utils';
import { server } from '@/test/mocks/server';
import { BudgetsPage } from './BudgetsPage';

describe('BudgetsPage', () => {
  it('renders budget cards with spending vs limit', async () => {
    signIn();
    renderWithProviders(<BudgetsPage />);

    expect(await screen.findByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    // percentage text
    expect(screen.getByText(/79% used/i)).toBeInTheDocument();
  });

  it('flags an over-budget category', async () => {
    signIn();
    renderWithProviders(<BudgetsPage />);
    await screen.findByText('Transport');
    expect(screen.getByText(/over/i)).toBeInTheDocument();
  });

  it('shows empty state when no budgets', async () => {
    signIn();
    server.use(
      http.get('*/api/v1/budgets/status', () =>
        HttpResponse.json({ success: true, data: [] })
      )
    );
    renderWithProviders(<BudgetsPage />);
    expect(await screen.findByText(/no budgets yet/i)).toBeInTheDocument();
  });
});
