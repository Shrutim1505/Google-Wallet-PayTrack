import { Request, Response } from 'express';
import { SettingsService } from '../services/settingsService.js';
import { getDatabase } from '../config/database.js';

const settingsService = new SettingsService();

async function getUserPublicProfile(userId: string) {
  const db = getDatabase();
  const row = await db.get('SELECT id, email, name FROM users WHERE id = ?', [userId]);
  return row ? { id: row.id, email: row.email, name: row.name } : { id: userId, email: '', name: 'User' };
}

export async function getSettings(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const [profile, settings] = await Promise.all([getUserPublicProfile(userId), settingsService.getUserSettings(userId)]);

    // Keep response shape compatible with frontend's `data.settings`.
    res.json({
      success: true,
      data: {
        settings: {
          name: profile.name,
          email: profile.email,
          monthlyBudget: settings.monthlyBudget,
          notificationsEnabled: Boolean(settings.notificationsEnabled),
          darkMode: Boolean(settings.darkMode),
        },
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function updateSettings(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const updates = req.body || {};

    // Update profile fields if provided.
    if (updates.name || updates.email) {
      const db = getDatabase();
      await db.run(
        `UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?`,
        [updates.name ?? null, updates.email ?? null, userId]
      );
    }

    const savedSettings = await settingsService.upsertUserSettings(userId, updates);
    const profile = await getUserPublicProfile(userId);

    res.json({
      success: true,
      data: {
        settings: {
          name: profile.name,
          email: profile.email,
          monthlyBudget: savedSettings.monthlyBudget,
          notificationsEnabled: Boolean(savedSettings.notificationsEnabled),
          darkMode: Boolean(savedSettings.darkMode),
        },
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

