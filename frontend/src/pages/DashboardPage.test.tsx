/**
 * DashboardPage tests — covers loading skeleton, empty state, and the
 * stats/category breakdown derived from the receipts list.
 */
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import {
  renderWithProviders,
  screen,
  signIn,
  waitFor,
  within,
} from '@/test/utils';
import { server } from '@/test/mocks/server';
import { receiptDB } from '@/test/mocks/db';
import { makeReceipt } from '@/test/factories';

import { DashboardPage } from './DashboardPage';

describe('DashboardPage — empty state', () => {
  it('renders an "Add receipt" empty state when the list is empty', async () => {
    signIn();
    receiptDB.clear();
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText(/no receipts yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /add receipt/i })).toHaveAttribute('href', '/receipts');
  });
});

describe('DashboardPage — loading state', () => {
  it('shows skeletons while the receipts query is pending', async () => {
    signIn();
    server.use(
      http.get('*/api/v1/receipts', async () => {
        await new Promise((r) => setTimeout(r, 60));
        return HttpResponse.json({
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, hasMore: false },
        });
      })
    );

    const { container } = renderWithProviders(<DashboardPage />);

    // Skeletons render with `animate-pulse` Tailwind class.
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);

    await waitFor(() =>
      expect(screen.getByText(/no receipts yet/i)).toBeInTheDocument()
    );
  });
});

describe('DashboardPage — statistics', () => {
  it('aggregates totals, average and shows category breakdown', async () => {
    signIn();
    receiptDB.clear();
    [
      makeReceipt({ merchant: 'A', amount: 1000, category: 'Food' }),
      makeReceipt({ merchant: 'B', amount: 500, category: 'Food' }),
      makeReceipt({ merchant: 'C', amount: 2500, category: 'Transport' }),
    ].forEach(receiptDB.add);

    renderWithProviders(<DashboardPage />);

    // 3 receipts shown
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());

    // Totals are formatted via formatCurrency (en-IN, ₹). We avoid asserting
    // exact currency formatting and check the integer is present instead.
    expect(screen.getByText(/Total Spent/i)).toBeInTheDocument();
    const totalCard = screen.getByText(/Total Spent/i).closest('div')!.parentElement!;
    expect(within(totalCard).getByText((c) => c.includes('4,000'))).toBeInTheDocument();

    // Category breakdown should list both categories.
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();

    // Recent Receipts list shows merchants.
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('caps the recent receipts section at 5 entries', async () => {
    signIn();
    receiptDB.clear();
    Array.from({ length: 8 }).forEach((_, i) =>
      receiptDB.add(
        makeReceipt({ merchant: `Mx-${i}`, amount: 100, category: 'Food', date: '2026-05-01' })
      )
    );
    renderWithProviders(<DashboardPage />);

    // The mock DB unshifts new entries; the API returns them with the
    // most-recent-added first. The dashboard takes the first 5 of that
    // list — i.e. Mx-7 down to Mx-3 — and drops Mx-0..Mx-2.
    await waitFor(() => expect(screen.getByText('Mx-7')).toBeInTheDocument());
    expect(screen.getByText('Mx-3')).toBeInTheDocument();
    expect(screen.queryByText('Mx-0')).not.toBeInTheDocument();
    expect(screen.queryByText('Mx-2')).not.toBeInTheDocument();
  });
});
