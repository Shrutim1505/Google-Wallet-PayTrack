import { useState, useCallback } from 'react';
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

  const saveSettings = useCallback(async (newSettings: UserSettings) => {
    setLoading(true);
    try {
      // Try API save
      try {
        await api.updateSettings(newSettings);
      } catch {
        // Continue locally if API fails
      }
      setSettings(newSettings);
      localStorage.setItem('userSettings', JSON.stringify(newSettings));
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data.settings || defaultSettings);
    } catch {
      // Use local settings if API fails
    } finally {
      setLoading(false);
    }
  }, []);

  return { settings, loading, saveSettings, loadSettings };
}