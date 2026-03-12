import React, { useState } from 'react';
import { Wallet } from 'lucide-react';

interface AuthLayoutProps {
  onLoginSuccess?: () => void;
}

export function AuthLayout({ onLoginSuccess }: AuthLayoutProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = { id: '1', email, name: 'User' };
    localStorage.setItem('user', JSON.stringify(user));
    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  const handleDemoLogin = () => {
    const user = { id: '1', email: 'demo@example.com', name: 'Demo User' };
    localStorage.setItem('user', JSON.stringify(user));
    if (onLoginSuccess) {
      onLoginSuccess();
    }
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
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
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              Sign In
            </button>
          </form>

          {/* Demo Button */}
          <button
            onClick={handleDemoLogin}
            className="w-full mt-4 border-2 border-blue-600 text-blue-600 font-medium py-2 rounded-lg hover:bg-blue-50 transition-all"
          >
            Demo Login
          </button>
        </div>
      </div>
    </div>
  );
}