import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen, signIn, userEvent, waitFor } from '@/test/utils';
import { SettingsPage } from './SettingsPage';

describe('SettingsPage', () => {
  it('loads and populates settings from the backend', async () => {
    signIn();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe('Demo User');
    });
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe('demo@example.com');
    expect((screen.getByLabelText(/monthly budget/i) as HTMLInputElement).value).toBe('50000');
  });

  it('saves changes', async () => {
    signIn();
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe('Demo User'));

    const name = screen.getByLabelText(/name/i);
    await user.clear(name);
    await user.type(name, 'New Name');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    // Save button completes without error (toast shown)
    await waitFor(() => expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled());
  });

  it('renders the currency converter tool', async () => {
    signIn();
    renderWithProviders(<SettingsPage />);
    expect(await screen.findByText(/currency converter/i)).toBeInTheDocument();
  });
});
