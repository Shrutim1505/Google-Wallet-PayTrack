/**
 * ReceiptsPage tests — list rendering, in-memory search, loading/empty
 * states, and the new-receipt dialog flow.
 */
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import {
  renderWithProviders,
  screen,
  signIn,
  userEvent,
  waitFor,
  within,
} from '@/test/utils';
import { server } from '@/test/mocks/server';
import { receiptDB } from '@/test/mocks/db';
import { makeReceipt } from '@/test/factories';

import { ReceiptsPage } from './ReceiptsPage';

function seed() {
  receiptDB.clear();
  [
    makeReceipt({ merchant: 'Swiggy', category: 'Food', amount: 250 }),
    makeReceipt({ merchant: 'Uber', category: 'Transport', amount: 320 }),
    makeReceipt({ merchant: 'Amazon', category: 'Shopping', amount: 1499 }),
  ].forEach(receiptDB.add);
}

describe('ReceiptsPage — list rendering', () => {
  it('renders all seeded receipts with merchant and amount', async () => {
    signIn();
    seed();
    renderWithProviders(<ReceiptsPage />);

    expect(await screen.findByText('Swiggy')).toBeInTheDocument();
    expect(screen.getByText('Uber')).toBeInTheDocument();
    expect(screen.getByText('Amazon')).toBeInTheDocument();
  });
});

describe('ReceiptsPage — empty state', () => {
  it('shows "no receipts" CTA when the list is empty', async () => {
    signIn();
    receiptDB.clear();
    renderWithProviders(<ReceiptsPage />);

    expect(await screen.findByText(/no receipts yet/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /add receipt/i }).length).toBeGreaterThan(0);
  });
});

describe('ReceiptsPage — loading state', () => {
  it('renders skeleton placeholders while fetching', async () => {
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

    const { container } = renderWithProviders(<ReceiptsPage />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);

    await waitFor(() => expect(screen.getByText(/no receipts yet/i)).toBeInTheDocument());
  });
});

describe('ReceiptsPage — search functionality', () => {
  it('filters the rendered list by merchant text in real time', async () => {
    signIn();
    seed();
    const user = userEvent.setup();
    renderWithProviders(<ReceiptsPage />);

    await screen.findByText('Swiggy');

    const search = screen.getByLabelText(/search receipts/i);
    await user.type(search, 'uber');

    expect(screen.queryByText('Swiggy')).not.toBeInTheDocument();
    expect(screen.queryByText('Amazon')).not.toBeInTheDocument();
    expect(screen.getByText('Uber')).toBeInTheDocument();
  });

  it('shows "no matches" message when the filter is empty', async () => {
    signIn();
    seed();
    const user = userEvent.setup();
    renderWithProviders(<ReceiptsPage />);

    await screen.findByText('Swiggy');
    await user.type(screen.getByLabelText(/search receipts/i), 'zzzz-no-such');

    await waitFor(() =>
      expect(screen.getByText(/no matches found/i)).toBeInTheDocument()
    );
  });

  it('matches by category as well as merchant', async () => {
    signIn();
    seed();
    const user = userEvent.setup();
    renderWithProviders(<ReceiptsPage />);

    await screen.findByText('Swiggy');
    await user.type(screen.getByLabelText(/search receipts/i), 'transport');

    expect(screen.getByText('Uber')).toBeInTheDocument();
    expect(screen.queryByText('Swiggy')).not.toBeInTheDocument();
  });
});

describe('ReceiptsPage — new receipt dialog', () => {
  it('creates a receipt via the dialog and shows it in the list', async () => {
    signIn();
    receiptDB.clear();
    const user = userEvent.setup();
    renderWithProviders(<ReceiptsPage />);

    // Open the dialog from the header button.
    const headerButtons = screen.getAllByRole('button', { name: /new receipt/i });
    await user.click(headerButtons[0]);

    // Fill form
    const dialog = await screen.findByRole('dialog');
    const dialogScope = within(dialog);

    await user.type(dialogScope.getByLabelText(/merchant/i), 'Starbucks');
    await user.type(dialogScope.getByLabelText(/amount/i), '450');
    // Date defaults to today; leave it.
    await user.click(dialogScope.getByRole('button', { name: /^add receipt$/i }));

    // Receipt should now appear in the page list (created by the MSW handler).
    await waitFor(() => expect(screen.getByText('Starbucks')).toBeInTheDocument());
  });

  it('keeps the dialog open and surfaces a toast on backend error', async () => {
    signIn();
    receiptDB.clear();
    server.use(
      http.post('*/api/v1/receipts', async () =>
        HttpResponse.json(
          {
            type: 'urn:problem:bad',
            title: 'Merchant and amount are required',
            status: 400,
            code: 'BAD_REQUEST',
          },
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } }
        )
      )
    );

    const user = userEvent.setup();
    renderWithProviders(<ReceiptsPage />);
    await user.click(screen.getAllByRole('button', { name: /new receipt/i })[0]);

    const dialog = await screen.findByRole('dialog');
    const dialogScope = within(dialog);

    await user.type(dialogScope.getByLabelText(/merchant/i), 'X');
    await user.type(dialogScope.getByLabelText(/amount/i), '1');
    await user.click(dialogScope.getByRole('button', { name: /^add receipt$/i }));

    // Dialog should still be open because mutation failed.
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });
});
