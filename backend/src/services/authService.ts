import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getPool, runTransaction } from '../config/database.js';
import { environment } from '../config/environment.js';
import { AppError } from '../middleware/errorHandler.js';
import { HTTP_STATUS } from '../utils/constants.js';

interface AuthResult {
  user: { id: string; email: string; name: string; roles: string[] };
  token: string;
  refreshToken: string;
}

// In-memory blacklist for logged-out tokens (use Redis in production)
const tokenBlacklist = new Set<string>();

export class AuthService {
  async register(email: string, password: string, name: string): Promise<AuthResult> {
    const pool = getPool();

    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) throw new AppError(HTTP_STATUS.CONFLICT, 'Email already registered');

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);

    await runTransaction(async (client) => {
      await client.query(
        'INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)',
        [userId, email, name, passwordHash]
      );
      await client.query('INSERT INTO user_settings (user_id) VALUES ($1)', [userId]);
      // Assign default 'user' role
      await client.query(`
        INSERT INTO user_roles (user_id, role_id)
        SELECT $1, id FROM roles WHERE name = 'user'
      `, [userId]);
    });

    const roles = await this.getUserRoles(userId);
    return { user: { id: userId, email, name, roles }, ...this.generateTokens(userId, email) };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email]
    );
    if (rows.length === 0) throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Invalid email or password');

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Invalid email or password');

    const roles = await this.getUserRoles(user.id);
    return { user: { id: user.id, email: user.email, name: user.name, roles }, ...this.generateTokens(user.id, user.email) };
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    if (tokenBlacklist.has(refreshToken)) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Token has been revoked');
    }

    try {
      const decoded = jwt.verify(refreshToken, environment.JWT_SECRET) as { userId: string; email: string; type?: string };
      if (decoded.type !== 'refresh') throw new Error('Not a refresh token');

      const pool = getPool();
      const { rows } = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [decoded.userId]);
      if (rows.length === 0) throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'User no longer exists');

      tokenBlacklist.add(refreshToken);
      const user = rows[0];
      const roles = await this.getUserRoles(user.id);
      return { user: { id: user.id, email: user.email, name: user.name, roles }, ...this.generateTokens(user.id, user.email) };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Invalid or expired refresh token');
    }
  }

  async logout(refreshToken?: string) {
    if (refreshToken) tokenBlacklist.add(refreshToken);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const pool = getPool();
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (rows.length === 0) throw new AppError(HTTP_STATUS.NOT_FOUND, 'User not found');

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);
  }

  async verifyToken(token: string): Promise<{ userId: string; email: string }> {
    try {
      const decoded = jwt.verify(token, environment.JWT_SECRET) as { userId: string; email: string };
      const pool = getPool();
      const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [decoded.userId]);
      if (rows.length === 0) throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'User no longer exists');
      return { userId: decoded.userId, email: decoded.email };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Invalid or expired token');
    }
  }

  isBlacklisted(token: string): boolean {
    return tokenBlacklist.has(token);
  }

  private async getUserRoles(userId: string): Promise<string[]> {
    const pool = getPool();
    const { rows } = await pool.query(`
      SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1
    `, [userId]);
    return rows.map(r => r.name);
  }

  private generateTokens(userId: string, email: string) {
    const token = jwt.sign({ userId, email }, environment.JWT_SECRET, { expiresIn: '15m' } as any);
    const refreshToken = jwt.sign({ userId, email, type: 'refresh' }, environment.JWT_SECRET, { expiresIn: '7d' } as any);
    return { token, refreshToken };
  }
}
