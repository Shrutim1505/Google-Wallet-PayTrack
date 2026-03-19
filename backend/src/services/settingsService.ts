import { getDatabase } from '../config/database.js';

export class SettingsService {
  async getUserSettings(userId: string) {
    const db = getDatabase();
    const row = await db.get(
      'SELECT monthlyBudget, notificationsEnabled, darkMode FROM user_settings WHERE userId = ?',
      [userId]
    );

    if (!row) {
      // Default settings for new users.
      return { monthlyBudget: 50000, notificationsEnabled: 1, darkMode: 0 };
    }

    return {
      monthlyBudget: Number(row.monthlyBudget),
      notificationsEnabled: Number(row.notificationsEnabled),
      darkMode: Number(row.darkMode),
    };
  }

  async upsertUserSettings(userId: string, updates: any) {
    const db = getDatabase();

    const monthlyBudget = Number(updates.monthlyBudget ?? 50000);
    const notificationsEnabled = updates.notificationsEnabled ? 1 : 0;
    const darkMode = updates.darkMode ? 1 : 0;

    await db.run(
      `INSERT INTO user_settings (userId, monthlyBudget, notificationsEnabled, darkMode)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(userId) DO UPDATE SET
         monthlyBudget = excluded.monthlyBudget,
         notificationsEnabled = excluded.notificationsEnabled,
         darkMode = excluded.darkMode`,
      [userId, monthlyBudget, notificationsEnabled, darkMode]
    );

    return {
      monthlyBudget,
      notificationsEnabled,
      darkMode,
    };
  }
}

