import React, { useState } from 'react';
import { Wallet } from 'lucide-react';
import { api } from '../../services/api';

interface AuthLayoutProps {
  onLoginSuccess?: () => void;
}

export function AuthLayout({ onLoginSuccess }: AuthLayoutProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (authEmail: string, authPassword: string, authName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result: any = isRegister
        ? await api.register(authEmail, authPassword, authName || '')
        : await api.login(authEmail, authPassword);

      const user = result?.user;
      const token = result?.token;
      if (!user || !token) throw new Error('Invalid response');

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('auth_token', token);
      if (result?.refreshToken) localStorage.setItem('refresh_token', result.refreshToken);
      onLoginSuccess?.();
    } catch (e: any) {
      setError(e?.message || (isRegister ? 'Registration failed' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAuth(email, password, name);
  };

  const handleDemoLogin = () => {
    handleAuth('demo@example.com', 'password');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Receipt Manager</h1>
          <p className="text-center text-gray-600 mb-8">
            {isRegister ? 'Create your account' : 'Smart Receipt Tracking'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength={isRegister ? 8 : undefined}
                disabled={loading}
              />
              {isRegister && (
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (isRegister ? 'Creating account...' : 'Signing in...') : (isRegister ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(null); }}
              disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </div>

          {!isRegister && (
            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full mt-4 border-2 border-blue-600 text-blue-600 font-medium py-2 rounded-lg hover:bg-blue-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Demo Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
