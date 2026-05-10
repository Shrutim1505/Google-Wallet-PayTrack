import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../services/authService.js';
import { getPool } from '../config/database.js';

const authService = new AuthService();

describe('AuthService', () => {
  const testEmail = `test-${Date.now()}@example.com`;

  beforeEach(async () => {
    // Clean up test user if exists
    await getPool().query('DELETE FROM users WHERE email = $1', [testEmail]);
  });

  describe('register', () => {
    it('should register a new user with default role', async () => {
      const result = await authService.register(testEmail, 'password123', 'Test User');

      expect(result.user.email).toBe(testEmail);
      expect(result.user.name).toBe('Test User');
      expect(result.user.roles).toContain('user');
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      await authService.register(testEmail, 'password123', 'Test User');
      await expect(authService.register(testEmail, 'password456', 'Another')).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should login with correct credentials', async () => {
      await authService.register(testEmail, 'password123', 'Test User');
      const result = await authService.login(testEmail, 'password123');

      expect(result.user.email).toBe(testEmail);
      expect(result.token).toBeDefined();
    });

    it('should reject wrong password', async () => {
      await authService.register(testEmail, 'password123', 'Test User');
      await expect(authService.login(testEmail, 'wrongpass')).rejects.toThrow('Invalid email or password');
    });

    it('should reject non-existent email', async () => {
      await expect(authService.login('nobody@test.com', 'pass')).rejects.toThrow('Invalid email or password');
    });
  });

  describe('token refresh', () => {
    it('should refresh token and rotate', async () => {
      const reg = await authService.register(testEmail, 'password123', 'Test User');
      const refreshed = await authService.refresh(reg.refreshToken);

      expect(refreshed.token).toBeDefined();
      expect(refreshed.refreshToken).toBeDefined();
      // Old refresh token should now be blacklisted
      await expect(authService.refresh(reg.refreshToken)).rejects.toThrow('Token has been revoked');
    });

    it('should reject reused refresh token', async () => {
      const email2 = `test2-${Date.now()}@example.com`;
      const reg = await authService.register(email2, 'password123', 'Test User 2');
      await authService.refresh(reg.refreshToken);
      await expect(authService.refresh(reg.refreshToken)).rejects.toThrow('Token has been revoked');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const reg = await authService.register(testEmail, 'password123', 'Test User');
      await authService.changePassword(reg.user.id, 'password123', 'newpass456');

      const login = await authService.login(testEmail, 'newpass456');
      expect(login.user.email).toBe(testEmail);
    });

    it('should reject wrong current password', async () => {
      const reg = await authService.register(testEmail, 'password123', 'Test User');
      await expect(authService.changePassword(reg.user.id, 'wrong', 'new')).rejects.toThrow('Current password is incorrect');
    });
  });
});
