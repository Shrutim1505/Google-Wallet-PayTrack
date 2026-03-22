import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database.js';
import { environment } from '../config/environment.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export class AuthService {
  async register(email: string, password: string, name: string) {
    const db = getDatabase();

    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      throw new AppError(409, 'Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    try {
      await db.run(
        'INSERT INTO users (id, email, name, passwordhash) VALUES (?, ?, ?, ?)',
        [userId, email, name, passwordHash]
      );
    } catch (error: any) {
      logger.error({
        message: 'Database error during user registration',
        error: error.message,
        email,
      });
      throw new AppError(500, 'Failed to register user');
    }

    const token = jwt.sign(
      { userId, email },
      environment.JWT_SECRET,
      { expiresIn: environment.JWT_EXPIRY } as any
    );

    return {
      user: { id: userId, email, name },
      token,
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

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      environment.JWT_SECRET,
      { expiresIn: environment.JWT_EXPIRY } as any
    );

    return {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    };
  }
}