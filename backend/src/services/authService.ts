import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database.js';
import { environment } from '../config/environment.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export class AuthService {
  private generateAccessToken(userId: string, email: string): string {
    return jwt.sign({ userId, email }, environment.JWT_SECRET, {
      expiresIn: environment.JWT_EXPIRY,
    } as any);
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const db = getDatabase();
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + environment.REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    await db.run(
      `INSERT INTO refresh_tokens (id, userId, token, expiresAt) VALUES (?, ?, ?, ?)`,
      [uuidv4(), userId, token, expiresAt]
    );

    // Cleanup: keep max 5 refresh tokens per user
    await db.run(
      `DELETE FROM refresh_tokens WHERE userId = ? AND id NOT IN (
        SELECT id FROM refresh_tokens WHERE userId = ? ORDER BY createdAt DESC LIMIT 5
      )`,
      [userId, userId]
    );

    return token;
  }

  async register(email: string, password: string, name: string) {
    const db = getDatabase();

    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      throw new AppError(409, 'Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, environment.BCRYPT_ROUNDS);
    const userId = uuidv4();

    try {
      await db.run(
        'INSERT INTO users (id, email, name, passwordhash) VALUES (?, ?, ?, ?)',
        [userId, email, name, passwordHash]
      );
      await db.run('INSERT INTO user_settings (userId) VALUES (?)', [userId]);
    } catch (error: any) {
      logger.error({ message: 'Registration failed', error: error.message, email });
      throw new AppError(500, 'Failed to register user');
    }

    const accessToken = this.generateAccessToken(userId, email);
    const refreshToken = await this.generateRefreshToken(userId);

    return {
      user: { id: userId, email, name },
      token: accessToken,
      refreshToken,
    };
  }

  async login(email: string, password: string) {
    const db = getDatabase();

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.passwordhash);
    if (!isValid) {
      throw new AppError(401, 'Invalid email or password');
    }

    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      token: accessToken,
      refreshToken,
    };
  }

  async refreshAccessToken(refreshTokenValue: string) {
    const db = getDatabase();

    const stored = await db.get(
      'SELECT * FROM refresh_tokens WHERE token = ?',
      [refreshTokenValue]
    );

    if (!stored) {
      throw new AppError(401, 'Invalid refresh token');
    }

    if (new Date(stored.expiresAt) < new Date()) {
      await db.run('DELETE FROM refresh_tokens WHERE id = ?', [stored.id]);
      throw new AppError(401, 'Refresh token expired');
    }

    const user = await db.get('SELECT id, email, name FROM users WHERE id = ?', [stored.userId]);
    if (!user) {
      throw new AppError(401, 'User not found');
    }

    // Rotate: delete old, issue new
    await db.run('DELETE FROM refresh_tokens WHERE id = ?', [stored.id]);
    const newAccessToken = this.generateAccessToken(user.id, user.email);
    const newRefreshToken = await this.generateRefreshToken(user.id);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      token: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const db = getDatabase();

    const user = await db.get('SELECT passwordhash FROM users WHERE id = ?', [userId]);
    if (!user) throw new AppError(404, 'User not found');

    const isValid = await bcrypt.compare(currentPassword, user.passwordhash);
    if (!isValid) throw new AppError(401, 'Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, environment.BCRYPT_ROUNDS);
    await db.run('UPDATE users SET passwordhash = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [newHash, userId]);

    // Invalidate all refresh tokens (force re-login on other devices)
    await db.run('DELETE FROM refresh_tokens WHERE userId = ?', [userId]);
  }

  async logout(refreshTokenValue: string) {
    const db = getDatabase();
    await db.run('DELETE FROM refresh_tokens WHERE token = ?', [refreshTokenValue]);
  }
}
