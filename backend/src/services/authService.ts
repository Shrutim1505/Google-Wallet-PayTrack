import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database.js';
import { environment } from '../config/environment.js';

export class AuthService {
  async register(email: string, password: string, name: string) {
    const db = getDatabase();

    const existingUser = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await db.query(
      'INSERT INTO users (id, email, name, passwordhash) VALUES ($1, $2, $3, $4)',
      [userId, email, name, passwordHash]
    );

    const token = jwt.sign(
      { userId, email },
      environment.JWT_SECRET as string,
      { expiresIn: environment.JWT_EXPIRY }
    );

    

    return {
      user: { id: userId, email, name },
      token,
    };
  }

  async login(email: string, password: string) {
    const db = getDatabase();

    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.passwordhash);

    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      environment.JWT_SECRET as string,
      { expiresIn: environment.JWT_EXPIRY }
    );

    return {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    };
  }
}