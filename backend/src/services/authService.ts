import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getPool, runTransaction } from '../config/database.js';
import { environment } from '../config/environment.js';
import { AppError } from '../middleware/errorHandler.js';
import { blacklistToken, isTokenBlacklisted, remainingTokenLifetime } from './tokenBlacklist.js';

export interface TokenPayload {
  sub: string;           // user id
  email: string;
  roles: string[];
  permissions: string[];
  type?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  user: { id: string; email: string; name: string; roles: string[]; permissions: string[] };
  token: string;
  refreshToken: string;
}

export class AuthService {
  async register(email: string, password: string, name: string): Promise<AuthResult> {
    const pool = getPool();

    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
    if (existing.length > 0) {
      throw AppError.conflict('Email already registered');
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);

    await runTransaction(async (client) => {
      await client.query(
        'INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)',
        [userId, email, name, passwordHash]
      );
      await client.query('INSERT INTO user_settings (user_id) VALUES ($1)', [userId]);
      await client.query(`
        INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE name = 'user'
      `, [userId]);
    });

    return this.buildAuthResult(userId, email, name);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );

    if (rows.length === 0) {
      // Same error for missing user and wrong password — prevents user enumeration
      throw AppError.unauthorized('Invalid email or password');
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw AppError.unauthorized('Invalid email or password');

    return this.buildAuthResult(user.id, user.email, user.name);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    if (await isTokenBlacklisted(refreshToken)) {
      throw AppError.unauthorized('Token has been revoked');
    }

    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(refreshToken, environment.JWT_SECRET) as TokenPayload;
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    if (decoded.type !== 'refresh') {
      throw AppError.unauthorized('Not a refresh token');
    }

    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1 AND deleted_at IS NULL',
      [decoded.sub]
    );
    if (rows.length === 0) throw AppError.unauthorized('User no longer exists');

    // Rotate: blacklist old refresh token for its remaining lifetime
    if (decoded.exp) {
      await blacklistToken(refreshToken, remainingTokenLifetime(decoded.exp));
    }

    const user = rows[0];
    return this.buildAuthResult(user.id, user.email, user.name);
  }

  async logout(accessToken?: string, refreshToken?: string): Promise<void> {
    const tokens = [accessToken, refreshToken].filter(Boolean) as string[];
    for (const token of tokens) {
      try {
        const decoded = jwt.decode(token) as TokenPayload | null;
        if (decoded?.exp) {
          await blacklistToken(token, remainingTokenLifetime(decoded.exp));
        }
      } catch {
        // Token is malformed, ignore
      }
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const pool = getPool();
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL', [userId]);
    if (rows.length === 0) throw AppError.notFound('User');

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) throw AppError.unauthorized('Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);
  }

  async verifyToken(token: string): Promise<TokenPayload> {
    if (await isTokenBlacklisted(token)) {
      throw AppError.unauthorized('Token has been revoked');
    }
    try {
      return jwt.verify(token, environment.JWT_SECRET) as TokenPayload;
    } catch {
      throw AppError.unauthorized('Invalid or expired token');
    }
  }

  private async getUserRolesAndPermissions(userId: string): Promise<{ roles: string[]; permissions: string[] }> {
    const pool = getPool();
    const [rolesResult, permsResult] = await Promise.all([
      pool.query(
        `SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT DISTINCT p.name FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.id
         JOIN user_roles ur ON ur.role_id = rp.role_id
         WHERE ur.user_id = $1`,
        [userId]
      ),
    ]);
    return {
      roles: rolesResult.rows.map(r => r.name),
      permissions: permsResult.rows.map(p => p.name),
    };
  }

  private async buildAuthResult(userId: string, email: string, name: string): Promise<AuthResult> {
    const { roles, permissions } = await this.getUserRolesAndPermissions(userId);
    const tokens = this.generateTokens(userId, email, roles, permissions);
    return {
      user: { id: userId, email, name, roles, permissions },
      ...tokens,
    };
  }

  private generateTokens(userId: string, email: string, roles: string[], permissions: string[]): { token: string; refreshToken: string } {
    const accessOpts: SignOptions = { expiresIn: environment.JWT_ACCESS_EXPIRY as any };
    const refreshOpts: SignOptions = { expiresIn: environment.JWT_REFRESH_EXPIRY as any };

    const token = jwt.sign(
      { sub: userId, email, roles, permissions, type: 'access' } satisfies TokenPayload,
      environment.JWT_SECRET,
      accessOpts
    );
    const refreshToken = jwt.sign(
      { sub: userId, email, roles, permissions, type: 'refresh' } satisfies TokenPayload,
      environment.JWT_SECRET,
      refreshOpts
    );
    return { token, refreshToken };
  }
}
