import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Card, CardTitle, Button, Input } from '@/shared/ui';
import { useSettings, useUpdateSettings } from '@/features/settings/hooks';
import { CurrencyConverter } from '@/components/common/CurrencyConverter';

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (settings) {
      setName(settings.name || '');
      setEmail(settings.email || '');
      setMonthlyBudget(settings.monthlyBudget ? String(settings.monthlyBudget) : '');
      setNotificationsEnabled(settings.notificationsEnabled ?? true);
    }
  }, [settings]);

  const handleSave = () => {
    const updates: Record<string, unknown> = { name, email, notificationsEnabled };
    if (monthlyBudget && Number(monthlyBudget) > 0) updates.monthlyBudget = Number(monthlyBudget);
    updateSettings.mutate(updates);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your profile and preferences</p>
      </header>

      {isLoading ? (
        <Card><div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div></Card>
      ) : (
        <>
          <Card>
            <CardTitle className="mb-4">Profile</CardTitle>
            <div className="space-y-4">
              <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
              <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
          </Card>

          <Card>
            <CardTitle className="mb-4">Preferences</CardTitle>
            <div className="space-y-4">
              <Input
                label="Monthly Budget (₹)"
                type="number"
                min="0"
                value={monthlyBudget}
                onChange={e => setMonthlyBudget(e.target.value)}
                placeholder="50000"
                helperText="Used for budget warnings and spending alerts"
              />
              <label className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">Notifications</p>
                  <p className="text-xs text-gray-500">Receive spending alerts and budget warnings</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notificationsEnabled}
                  onClick={() => setNotificationsEnabled(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition ${notificationsEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${notificationsEnabled ? 'translate-x-5' : ''}`} />
                </button>
              </label>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button variant="primary" leftIcon={<Save className="w-4 h-4" />} onClick={handleSave} loading={updateSettings.isPending}>
              Save Changes
            </Button>
          </div>

          <CurrencyConverter />
        </>
      )}
    </div>
  );
}
