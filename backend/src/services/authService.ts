import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, runTransaction } from '../config/database.js';
import { environment } from '../config/environment.js';
import { AppError } from '../middleware/errorHandler.js';
import { HTTP_STATUS } from '../utils/constants.js';

interface AuthResult {
  user: { id: string; email: string; name: string };
  token: string;
}

export class AuthService {
  async register(email: string, password: string, name: string): Promise<AuthResult> {
    const db = getDatabase();

    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      throw new AppError(HTTP_STATUS.CONFLICT, 'Email already registered');
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);

    await runTransaction(async () => {
      await db.run(
        'INSERT INTO users (id, email, name, passwordhash) VALUES (?, ?, ?, ?)',
        [userId, email, name, passwordHash]
      );
      // Create default settings row so GET /settings never returns empty
      await db.run(
        'INSERT INTO user_settings (userId) VALUES (?)',
        [userId]
      );
    });

    const token = this.signToken(userId, email);
    return { user: { id: userId, email, name }, token };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const db = getDatabase();

    const user = await db.get('SELECT id, email, name, passwordhash FROM users WHERE email = ?', [email]);
    if (!user) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordhash);
    if (!valid) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Invalid email or password');
    }

    const token = this.signToken(user.id, user.email);
    return { user: { id: user.id, email: user.email, name: user.name }, token };
  }

  async verifyToken(token: string): Promise<{ userId: string; email: string }> {
    try {
      const decoded = jwt.verify(token, environment.JWT_SECRET) as { userId: string; email: string };
      // Confirm user still exists
      const db = getDatabase();
      const user = await db.get('SELECT id FROM users WHERE id = ?', [decoded.userId]);
      if (!user) throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'User no longer exists');
      return { userId: decoded.userId, email: decoded.email };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Invalid or expired token');
    }
  }

  private signToken(userId: string, email: string): string {
    return jwt.sign({ userId, email }, environment.JWT_SECRET, {
      expiresIn: environment.JWT_EXPIRY,
    } as any);
  }
}
