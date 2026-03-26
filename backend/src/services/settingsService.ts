import { getDatabase } from '../config/database.js';

export class SettingsService {
  async getUserSettings(userId: string) {
    const db = getDatabase();
    const row = await db.get(
      'SELECT monthlyBudget, notificationsEnabled, darkMode FROM user_settings WHERE userId = ?',
      [userId]
    );

    if (!row) {
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

    // Merge with existing settings so omitted fields aren't reset to defaults
    const existing = await this.getUserSettings(userId);
    const monthlyBudget = updates.monthlyBudget != null ? Number(updates.monthlyBudget) : existing.monthlyBudget;
    const notificationsEnabled = updates.notificationsEnabled != null ? (updates.notificationsEnabled ? 1 : 0) : existing.notificationsEnabled;
    const darkMode = updates.darkMode != null ? (updates.darkMode ? 1 : 0) : existing.darkMode;

    await db.run(
      `INSERT INTO user_settings (userId, monthlyBudget, notificationsEnabled, darkMode)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(userId) DO UPDATE SET
         monthlyBudget = excluded.monthlyBudget,
         notificationsEnabled = excluded.notificationsEnabled,
         darkMode = excluded.darkMode,
         updatedAt = CURRENT_TIMESTAMP`,
      [userId, monthlyBudget, notificationsEnabled, darkMode]
    );

    return { monthlyBudget, notificationsEnabled, darkMode };
  }
}
