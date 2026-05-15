import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getPool } from '../config/database.js';
import { environment } from '../config/environment.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const TOKEN_BYTES = 32;
const BCRYPT_ROUNDS = 12;

export class PasswordResetService {
  async requestReset(email: string): Promise<{ token: string | null }> {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );

    if (rows.length === 0) {
      logger.info({ msg: 'Password reset requested for unknown email', email });
      return { token: null };
    }

    const userId = rows[0].id;
    const token = randomBytes(TOKEN_BYTES).toString('hex');
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

    const { rows } = await pool.query(
      'SELECT user_id, expires_at, used_at FROM password_resets WHERE token_hash = $1',
      [tokenHash]
    );

    if (rows.length === 0) throw AppError.badRequest('Invalid or expired reset token');

    const reset = rows[0];
    if (reset.used_at) throw AppError.badRequest('Reset token already used');
    if (new Date(reset.expires_at) < new Date()) throw AppError.badRequest('Reset token expired');

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

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

  async cleanupExpired(): Promise<number> {
    const { rowCount } = await getPool().query(
      'DELETE FROM password_resets WHERE expires_at < NOW()'
    );
    return rowCount || 0;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
