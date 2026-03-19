import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database.js';
import { environment } from '../config/environment.js';

export class AuthService {
  async register(email: string, password: string, name: string) {
    const db = getDatabase();

    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await db.run(
      'INSERT INTO users (id, email, name, passwordhash) VALUES (?, ?, ?, ?)',
      [userId, email, name, passwordHash]
    );

    const token = jwt.sign(
      { userId, email } as any,
      environment.JWT_SECRET as any,
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
      throw new Error('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.passwordhash);

    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email } as any,
      environment.JWT_SECRET as any,
      { expiresIn: environment.JWT_EXPIRY } as any
    );

    return {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    };

  }
}