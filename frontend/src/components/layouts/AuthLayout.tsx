import React, { useState } from 'react';
import { Wallet } from 'lucide-react';

interface AuthLayoutProps {
  onLoginSuccess?: () => void;
}

export function AuthLayout({ onLoginSuccess }: AuthLayoutProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const login = async (loginEmail: string, loginPassword: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(payload?.error || payload?.message || 'Login failed');
      }

      // Express backend returns: { success: true, data: { user, token } }
      const user = payload?.data?.user;
      const token = payload?.data?.token;
      if (!user || !token) throw new Error('Invalid login response');

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('auth_token', token);

      onLoginSuccess?.();
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  const handleDemoLogin = () => {
    login('demo@example.com', 'password');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Receipt Manager</h1>
          <p className="text-center text-gray-600 mb-8">Smart Receipt Tracking</p>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
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
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
            {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Button */}
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full mt-4 border-2 border-blue-600 text-blue-600 font-medium py-2 rounded-lg hover:bg-blue-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Demo Login
          </button>
        </div>
      </div>
    </div>
  );
}