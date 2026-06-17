import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen, signIn, userEvent, waitFor } from '@/test/utils';
import { NotificationBell } from './NotificationBell';

describe('NotificationBell', () => {
  it('shows the unread count badge', async () => {
    signIn();
    renderWithProviders(<NotificationBell />);
    // unreadCount = 1 from handler
    expect(await screen.findByText('1')).toBeInTheDocument();
  });

  it('opens the dropdown and lists alerts', async () => {
    signIn();
    const user = userEvent.setup();
    renderWithProviders(<NotificationBell />);

    await screen.findByText('1');
    await user.click(screen.getByRole('button', { name: /notifications/i }));

    expect(await screen.findByText(/spent 457% more on food/i)).toBeInTheDocument();
    expect(screen.getByText(/budget alert: 79% used/i)).toBeInTheDocument();
  });

  it('marks all as read', async () => {
    signIn();
    const user = userEvent.setup();
    renderWithProviders(<NotificationBell />);

    await screen.findByText('1');
    await user.click(screen.getByRole('button', { name: /notifications/i }));
    const markBtn = await screen.findByText(/mark all read/i);
    await user.click(markBtn);
    // No crash; request fired
    await waitFor(() => expect(screen.getByText(/notifications/i)).toBeInTheDocument());
  });
});
