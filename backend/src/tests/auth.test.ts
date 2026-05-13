import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { AuthService, TokenPayload } from '../services/authService.js';
import { getPool } from '../config/database.js';
import { environment } from '../config/environment.js';
import { isTokenBlacklisted } from '../services/tokenBlacklist.js';

const authService = new AuthService();

describe('AuthService', () => {
  const testEmail = `test-${Date.now()}@example.com`;

  beforeEach(async () => {
    await getPool().query('DELETE FROM users WHERE email = $1', [testEmail]);
  });

  describe('register', () => {
    it('registers a new user with default role and embeds permissions in JWT', async () => {
      const result = await authService.register(testEmail, 'password123', 'Test User');

      expect(result.user.email).toBe(testEmail);
      expect(result.user.roles).toContain('user');
      expect(result.user.permissions.length).toBeGreaterThan(0);

      // Verify JWT contains roles AND permissions (no DB needed for authz)
      const decoded = jwt.decode(result.token) as TokenPayload;
      expect(decoded.sub).toBe(result.user.id);
      expect(decoded.roles).toEqual(result.user.roles);
      expect(decoded.permissions).toEqual(result.user.permissions);
      expect(decoded.type).toBe('access');
    });

    it('rejects duplicate emails', async () => {
      await authService.register(testEmail, 'password123', 'Test User');
      await expect(authService.register(testEmail, 'password456', 'Another')).rejects.toThrow(
        /already registered/i
      );
    });

    it('gives "user" role standard permissions', async () => {
      const result = await authService.register(testEmail, 'password123', 'Test User');
      expect(result.user.permissions).toContain('receipts:create');
      expect(result.user.permissions).toContain('receipts:read');
      expect(result.user.permissions).not.toContain('users:manage');
      expect(result.user.permissions).not.toContain('receipts:read_all');
    });
  });

  describe('login', () => {
    it('logs in with correct credentials and returns JWT with permissions', async () => {
      await authService.register(testEmail, 'password123', 'Test User');
      const result = await authService.login(testEmail, 'password123');

      const decoded = jwt.decode(result.token) as TokenPayload;
      expect(decoded.email).toBe(testEmail);
      expect(decoded.permissions.length).toBeGreaterThan(0);
    });

    it('rejects wrong password', async () => {
      await authService.register(testEmail, 'password123', 'Test User');
      await expect(authService.login(testEmail, 'wrong')).rejects.toThrow(/invalid/i);
    });

    it('returns same error for unknown email (prevents user enumeration)', async () => {
      await expect(authService.login('nobody@test.com', 'any')).rejects.toThrow(
        /Invalid email or password/i
      );
    });

    it('does not log in soft-deleted users', async () => {
      await authService.register(testEmail, 'password123', 'Test User');
      await getPool().query('UPDATE users SET deleted_at = NOW() WHERE email = $1', [testEmail]);
      await expect(authService.login(testEmail, 'password123')).rejects.toThrow(/invalid/i);
    });
  });

  describe('refresh', () => {
    it('refreshes and issues new tokens', async () => {
      const reg = await authService.register(testEmail, 'password123', 'Test User');
      const refreshed = await authService.refresh(reg.refreshToken);

      expect(refreshed.token).toBeDefined();
      expect(refreshed.refreshToken).toBeDefined();
    });

    it('blacklists the old refresh token on rotation', async () => {
      const reg = await authService.register(testEmail, 'password123', 'Test User');
      await authService.refresh(reg.refreshToken);

      // Old refresh token is now blacklisted
      expect(await isTokenBlacklisted(reg.refreshToken)).toBe(true);

      // Second use fails
      await expect(authService.refresh(reg.refreshToken)).rejects.toThrow(/revoked/i);
    });

    it('rejects using an access token as a refresh token', async () => {
      const reg = await authService.register(testEmail, 'password123', 'Test User');
      await expect(authService.refresh(reg.token)).rejects.toThrow(/not a refresh token/i);
    });

    it('rejects expired refresh tokens', async () => {
      // Sign a refresh token that's already expired
      const expired = jwt.sign(
        { sub: 'u1', email: 'e@test.com', type: 'refresh', roles: [], permissions: [] },
        environment.JWT_SECRET,
        { expiresIn: '-1s' }
      );
      await expect(authService.refresh(expired)).rejects.toThrow(/invalid or expired/i);
    });
  });

  describe('logout', () => {
    it('blacklists both access and refresh tokens', async () => {
      const reg = await authService.register(testEmail, 'password123', 'Test User');

      await authService.logout(reg.token, reg.refreshToken);

      expect(await isTokenBlacklisted(reg.token)).toBe(true);
      expect(await isTokenBlacklisted(reg.refreshToken)).toBe(true);
    });

    it('tolerates missing tokens gracefully', async () => {
      await expect(authService.logout(undefined, undefined)).resolves.not.toThrow();
    });

    it('tolerates malformed tokens gracefully', async () => {
      await expect(authService.logout('not-a-jwt', 'also-not-a-jwt')).resolves.not.toThrow();
    });
  });

  describe('changePassword', () => {
    it('changes password successfully', async () => {
      const reg = await authService.register(testEmail, 'password123', 'Test User');
      await authService.changePassword(reg.user.id, 'password123', 'newPassword456');
      const loggedIn = await authService.login(testEmail, 'newPassword456');
      expect(loggedIn.user.email).toBe(testEmail);
    });

    it('rejects wrong current password', async () => {
      const reg = await authService.register(testEmail, 'password123', 'Test User');
      await expect(
        authService.changePassword(reg.user.id, 'wrong', 'newPass')
      ).rejects.toThrow(/current password is incorrect/i);
    });
  });

  describe('verifyToken', () => {
    it('verifies a valid token and returns payload', async () => {
      const reg = await authService.register(testEmail, 'password123', 'Test User');
      const payload = await authService.verifyToken(reg.token);
      expect(payload.sub).toBe(reg.user.id);
      expect(payload.permissions).toEqual(reg.user.permissions);
    });

    it('rejects blacklisted tokens', async () => {
      const reg = await authService.register(testEmail, 'password123', 'Test User');
      await authService.logout(reg.token);
      await expect(authService.verifyToken(reg.token)).rejects.toThrow(/revoked/i);
    });
  });
});
