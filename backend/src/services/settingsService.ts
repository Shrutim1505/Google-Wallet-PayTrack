import { getPool } from '../config/database.js';

export class SettingsService {
  async getUserSettings(userId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT monthly_budget, notifications_enabled, dark_mode FROM user_settings WHERE user_id = $1',
      [userId]
    );

    if (rows.length === 0) {
      return { monthlyBudget: 50000, notificationsEnabled: true, darkMode: false };
    }

    return {
      monthlyBudget: parseFloat(rows[0].monthly_budget),
      notificationsEnabled: rows[0].notifications_enabled,
      darkMode: rows[0].dark_mode,
    };
  }

  async upsertUserSettings(userId: string, updates: any) {
    const pool = getPool();
    const existing = await this.getUserSettings(userId);

    const monthlyBudget = updates.monthlyBudget != null ? Number(updates.monthlyBudget) : existing.monthlyBudget;
    const notificationsEnabled = updates.notificationsEnabled != null ? !!updates.notificationsEnabled : existing.notificationsEnabled;
    const darkMode = updates.darkMode != null ? !!updates.darkMode : existing.darkMode;

    await pool.query(
      `INSERT INTO user_settings (user_id, monthly_budget, notifications_enabled, dark_mode)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         monthly_budget = EXCLUDED.monthly_budget,
         notifications_enabled = EXCLUDED.notifications_enabled,
         dark_mode = EXCLUDED.dark_mode,
         updated_at = NOW()`,
      [userId, monthlyBudget, notificationsEnabled, darkMode]
    );

    return { monthlyBudget, notificationsEnabled, darkMode };
  }
}
