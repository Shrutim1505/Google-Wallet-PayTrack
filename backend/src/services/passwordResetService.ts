import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getPool } from '../config/database.js';
import { environment } from '../config/environment.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

/**
 * Secure password reset flow:
 * 1. User requests reset → generate random token, store hash, email the plain token
 * 2. User submits new password with token → verify token hash, update password, mark token used
 *
 * Tokens are single-use and expire after PASSWORD_RESET_TTL_MINUTES (default 30min).
 */
export class PasswordResetService {
  /**
   * Request a password reset. Always returns successfully (no user enumeration).
   * The plain token is returned so a background job / email service can send it.
   */
  async requestReset(email: string): Promise<{ token: string | null }> {
    const pool = getPool();
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);

    // Deliberately don't throw if user doesn't exist — prevents account enumeration
    if (rows.length === 0) {
      logger.info({ msg: 'Password reset requested for unknown email', email });
      return { token: null };
    }

    const userId = rows[0].id;
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + environment.PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

    await pool.query(
      'INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [tokenHash, userId, expiresAt]
    );

    logger.info({ msg: 'Password reset token issued', userId });
    return { token };
  }

  async confirmReset(token: string, newPassword: string): Promise<void> {
    const pool = getPool();
    const tokenHash = this.hashToken(token);

    const { rows } = await pool.query(`
      SELECT user_id, expires_at, used_at FROM password_resets WHERE token_hash = $1
    `, [tokenHash]);

    if (rows.length === 0) throw AppError.badRequest('Invalid or expired reset token');
    const reset = rows[0];

    if (reset.used_at) throw AppError.badRequest('Reset token already used');
    if (new Date(reset.expires_at) < new Date()) throw AppError.badRequest('Reset token expired');

    const newHash = await bcrypt.hash(newPassword, 12);

    await pool.query('BEGIN');
    try {
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newHash, reset.user_id]
      );
      await pool.query(
        'UPDATE password_resets SET used_at = NOW() WHERE token_hash = $1',
        [tokenHash]
      );
      await pool.query('COMMIT');
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }

    logger.info({ msg: 'Password reset completed', userId: reset.user_id });
  }

  /**
   * Cleanup expired tokens — call periodically from a cron job.
   */
  async cleanupExpired(): Promise<number> {
    const { rowCount } = await getPool().query('DELETE FROM password_resets WHERE expires_at < NOW()');
    return rowCount || 0;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
