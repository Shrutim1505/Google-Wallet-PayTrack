export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  profileImage?: string;
  currency: string;
  timezone: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  darkMode: boolean;
  language: string;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  budgetAlerts: boolean;
}

export interface AuthRequest {
  email: string;
  password: string;
  name?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}