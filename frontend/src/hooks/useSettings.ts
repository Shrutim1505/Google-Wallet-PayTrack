import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';

export interface UserSettings {
  name: string;
  email: string;
  monthlyBudget: number;
  notificationsEnabled: boolean;
  darkMode: boolean;
}

const defaultSettings: UserSettings = {
  name: 'User',
  email: 'user@example.com',
  monthlyBudget: 50000,
  notificationsEnabled: true,
  darkMode: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('userSettings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });
  const [loading, setLoading] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await api.getSettings();
      const loaded = data?.settings || defaultSettings;
      setSettings(loaded);
      localStorage.setItem('userSettings', JSON.stringify(loaded));
    } catch {
      // Use local settings if API fails
    } finally {
      setLoading(false);
    }
  }, []);

  // Load from API on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = useCallback(async (newSettings: UserSettings) => {
    setLoading(true);
    try {
      try {
        await api.updateSettings(newSettings);
      } catch {
        // Continue locally if API fails
      }
      setSettings(newSettings);
      localStorage.setItem('userSettings', JSON.stringify(newSettings));
    } finally {
      setLoading(false);
    }
  }, []);

  return { settings, loading, saveSettings, loadSettings };
}
