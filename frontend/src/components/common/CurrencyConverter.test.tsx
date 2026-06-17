import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen, signIn, userEvent, waitFor } from '@/test/utils';
import { CurrencyConverter } from './CurrencyConverter';

describe('CurrencyConverter', () => {
  it('converts an amount using live rates', async () => {
    signIn();
    const user = userEvent.setup();
    renderWithProviders(<CurrencyConverter />);

    await user.click(screen.getByRole('button', { name: /^convert$/i }));

    // 100 * 94.6 = 9460 (handler rate)
    await waitFor(() => expect(screen.getByText(/= 9,460/)).toBeInTheDocument());
    expect(screen.getByText(/live exchange rates/i)).toBeInTheDocument();
  });
});
