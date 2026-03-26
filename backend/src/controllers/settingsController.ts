import { Request, Response } from 'express';
import { SettingsService } from '../services/settingsService.js';
import { getDatabase } from '../config/database.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { emitToUser } from '../config/websocket.js';

const settingsService = new SettingsService();

/**
 * Helper: Get user public profile
 */
async function getUserPublicProfile(userId: string) {
  const db = getDatabase();
  const row = await db.get('SELECT id, email, name FROM users WHERE id = ?', [userId]);
  return row
    ? { id: row.id, email: row.email, name: row.name }
    : { id: userId, email: '', name: 'User' };
}

/**
 * Get user settings
 * GET /api/settings
 */
export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  const [profile, settings] = await Promise.all([
    getUserPublicProfile(userId),
    settingsService.getUserSettings(userId),
  ]);

  logger.info({
    message: 'Settings retrieved',
    userId,
  });

  res.status(HTTP_STATUS.OK).json({
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
    message: 'Settings retrieved successfully',
  });
});

/**
 * Update user settings
 * PUT /api/settings
 */
export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const updates = req.body || {};

  // Update profile fields if provided (name, email validation done by middleware)
  if (updates.name || updates.email) {
    const db = getDatabase();
    await db.run(
      `UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [updates.name ?? null, updates.email ?? null, userId]
    );
  }

  const savedSettings = await settingsService.upsertUserSettings(userId, updates);
  const profile = await getUserPublicProfile(userId);

  logger.info({
    message: 'Settings updated',
    userId,
    updates: Object.keys(updates),
  });

  const settingsPayload = {
    name: profile.name,
    email: profile.email,
    monthlyBudget: savedSettings.monthlyBudget,
    notificationsEnabled: Boolean(savedSettings.notificationsEnabled),
    darkMode: Boolean(savedSettings.darkMode),
  };

  emitToUser(userId, 'settings:updated', { settings: settingsPayload });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { settings: settingsPayload },
    message: 'Settings updated successfully',
  });
});

