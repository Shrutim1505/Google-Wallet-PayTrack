import { generateToken, verifyToken, getTokenFromStorage, setTokenToStorage, removeTokenFromStorage } from './jwt';

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name: string;
}

class AuthService {
  private currentUser: User | null = null;

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth() {
    const token = getTokenFromStorage();
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        this.currentUser = {
          id: payload.userId,
          email: payload.email,
          name: payload.name
        };
      } else {
        // Token is invalid, remove it
        removeTokenFromStorage();
      }
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Simulate API call to backend
      const response = await this.simulateLogin(credentials);
      
      if (response.success && response.user) {
        const { user } = response;
        const token = generateToken({
          userId: user.id,
          email: user.email,
          name: user.name
        });

        this.currentUser = user;
        setTokenToStorage(token);

        return { success: true, user, token };
      }

      return { success: false, error: response.error };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login' };
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      // Simulate API call to backend
      const response = await this.simulateRegister(credentials);
      
      if (response.success && response.user) {
        const { user } = response;
        const token = generateToken({
          userId: user.id,
          email: user.email,
          name: user.name
        });

        this.currentUser = user;
        setTokenToStorage(token);

        return { success: true, user, token };
      }

      return { success: false, error: response.error || 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'An error occurred during registration' };
    }
  }

  async logout(): Promise<void> {
    this.currentUser = null;
    removeTokenFromStorage();
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    const token = getTokenFromStorage();
    if (!token) return false;

    const payload = verifyToken(token);
    if (!payload) {
      removeTokenFromStorage();
      return false;
    }

    return true;
  }

  getToken(): string | null {
    return getTokenFromStorage();
  }

  // Simulated backend API calls
  private async simulateLogin(credentials: LoginCredentials): Promise<AuthResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock validation - allow any email with 'password' as password
    if (credentials.password === 'password') {
      return {
        success: true,
        user: {
          id: 'demo-user-123',
          email: credentials.email,
          name: credentials.email.split('@')[0]
        }
      };
    }

    return {
      success: false,
      error: 'Invalid password. Use "password" for demo.'
    };
  }

  private async simulateRegister(credentials: RegisterCredentials): Promise<AuthResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock validation
    if (credentials.email.includes('@')) {
      return {
        success: true,
        user: {
          id: `user-${Date.now()}`,
          email: credentials.email,
          name: credentials.name
        }
      };
    }

    return {
      success: false,
      error: 'Invalid email address'
    };
  }
}

export const authService = new AuthService();