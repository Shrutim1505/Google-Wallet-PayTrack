export interface JWTPayload {
  userId: string;
  email: string;
  name?: string;
  exp?: number;
}

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1])) as JWTPayload;
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;
  return decoded.exp < Date.now() / 1000;
};

export const getTokenFromStorage = (): string | null => {
  return localStorage.getItem('auth_token');
};

export const removeTokenFromStorage = (): void => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('userSettings');
};
