import { Request, Response } from 'express';
import { SettingsService } from '../services/settingsService.js';
import { getPool } from '../config/database.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { emitToUser } from '../config/websocket.js';

const settingsService = new SettingsService();

async function getUserPublicProfile(userId: string) {
  const pool = getPool();
  const { rows } = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [userId]);
  return rows[0] || { id: userId, email: '', name: 'User' };
}

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const [profile, settings] = await Promise.all([
    getUserPublicProfile(userId),
    settingsService.getUserSettings(userId),
  ]);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      settings: {
        name: profile.name, email: profile.email,
        monthlyBudget: settings.monthlyBudget,
        notificationsEnabled: settings.notificationsEnabled,
        darkMode: settings.darkMode,
      },
    },
    message: 'Settings retrieved successfully',
  });
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const updates = req.body || {};

  if (updates.name || updates.email) {
    const pool = getPool();
    await pool.query(
      `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), updated_at = NOW() WHERE id = $3`,
      [updates.name ?? null, updates.email ?? null, userId]
    );
  }

  const savedSettings = await settingsService.upsertUserSettings(userId, updates);
  const profile = await getUserPublicProfile(userId);

  const settingsPayload = {
    name: profile.name, email: profile.email,
    monthlyBudget: savedSettings.monthlyBudget,
    notificationsEnabled: savedSettings.notificationsEnabled,
    darkMode: savedSettings.darkMode,
  };

  emitToUser(userId, 'settings:updated', { settings: settingsPayload });
  res.status(HTTP_STATUS.OK).json({ success: true, data: { settings: settingsPayload }, message: 'Settings updated successfully' });
});
