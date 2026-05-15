import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../config/database.js';
import { PasswordResetService } from '../services/passwordResetService.js';

const resetService = new PasswordResetService();

describe('PasswordResetService', () => {
  let userId: string;
  const userEmail = `reset-test-${Date.now()}@example.com`;
  const originalPassword = 'originalPass123';

  beforeAll(async () => {
    userId = uuidv4();
    const hash = await bcrypt.hash(originalPassword, 10);
    await getPool().query(
      'INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)',
      [userId, userEmail, 'Reset Tester', hash]
    );
  });

  beforeEach(async () => {
    // Clean up any stale reset tokens between tests
    await getPool().query('DELETE FROM password_resets WHERE user_id = $1', [userId]);
  });

  describe('requestReset', () => {
    it('returns a token for a known email', async () => {
      const { token } = await resetService.requestReset(userEmail);
      expect(token).toBeTruthy();
      expect(token!.length).toBeGreaterThan(32); // 32-byte hex = 64 chars
    });

    it('stores the hashed token, not plain', async () => {
      const { token } = await resetService.requestReset(userEmail);
      const { rows } = await getPool().query(
        'SELECT token_hash FROM password_resets WHERE user_id = $1',
        [userId]
      );
      expect(rows[0].token_hash).not.toBe(token); // hashed, not stored plain
      expect(rows[0].token_hash).toHaveLength(64); // sha256 hex
    });

    it('returns null token for unknown email (no enumeration)', async () => {
      const { token } = await resetService.requestReset('nobody@nowhere.test');
      expect(token).toBeNull();
    });

    it('sets expires_at in the future', async () => {
      await resetService.requestReset(userEmail);
      const { rows } = await getPool().query(
        'SELECT expires_at FROM password_resets WHERE user_id = $1',
        [userId]
      );
      expect(new Date(rows[0].expires_at).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('confirmReset', () => {
    it('rejects invalid tokens', async () => {
      await expect(resetService.confirmReset('garbage-token', 'newPass123')).rejects.toThrow(
        /invalid or expired reset token/i
      );
    });

    it('completes the reset and new password works', async () => {
      const { token } = await resetService.requestReset(userEmail);
      expect(token).toBeTruthy();

      await resetService.confirmReset(token!, 'brandNewPass456');

      // Verify the new password is stored (hashed)
      const { rows } = await getPool().query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );
      const valid = await bcrypt.compare('brandNewPass456', rows[0].password_hash);
      expect(valid).toBe(true);
    });

    it('marks the token as used (single-use)', async () => {
      const { token } = await resetService.requestReset(userEmail);
      await resetService.confirmReset(token!, 'singleUseTest123');

      // Second use should fail
      await expect(resetService.confirmReset(token!, 'anotherPass')).rejects.toThrow(
        /already used/i
      );
    });

    it('rejects an expired token', async () => {
      const { token } = await resetService.requestReset(userEmail);

      // Manually backdate the token
      await getPool().query(
        `UPDATE password_resets SET expires_at = NOW() - INTERVAL '1 minute' WHERE user_id = $1`,
        [userId]
      );

      await expect(resetService.confirmReset(token!, 'tooLate123')).rejects.toThrow(/expired/i);
    });
  });

  describe('cleanupExpired', () => {
    it('deletes expired tokens', async () => {
      // Seed an expired token
      const hash = 'a'.repeat(64);
      await getPool().query(
        `INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() - INTERVAL '1 hour')`,
        [hash, userId]
      );

      const deleted = await resetService.cleanupExpired();
      expect(deleted).toBeGreaterThanOrEqual(1);

      const { rows } = await getPool().query(
        'SELECT COUNT(*)::int as c FROM password_resets WHERE token_hash = $1',
        [hash]
      );
      expect(rows[0].c).toBe(0);
    });
  });
});
