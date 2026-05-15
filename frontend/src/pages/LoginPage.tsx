import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { Button, Input } from '@/shared/ui';
import { useLogin, useRegister } from '@/features/auth/hooks';
import type { ApiError } from '@/shared/api/ApiError';

export function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const location = useLocation();

  const login = useLogin();
  const register = useRegister();

  const mutation = isRegister ? register : login;
  const error = mutation.error as ApiError | null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      register.mutate({ email, password, name });
    } else {
      login.mutate({ email, password });
    }
  };

  const handleDemoLogin = () => {
    login.mutate({ email: 'demo@example.com', password: 'password' });
  };

  const fieldError = (field: string) =>
    error?.fieldErrors?.find((e) => e.field === field)?.message;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">PayTrack</h1>
          <p className="text-center text-gray-600 mb-8">
            {isRegister ? 'Create your account' : 'Sign in to continue'}
          </p>

          {location.state?.from && !isRegister && (
            <div className="mb-4 px-4 py-2 rounded-lg bg-blue-50 text-sm text-blue-700">
              Please sign in to continue
            </div>
          )}

          {error && !error.fieldErrors?.length && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
              {error.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <Input
                label="Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                disabled={mutation.isPending}
                error={fieldError('name')}
              />
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={mutation.isPending}
              error={fieldError('email')}
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={isRegister ? 8 : undefined}
              helperText={isRegister ? 'Minimum 8 characters' : undefined}
              disabled={mutation.isPending}
              error={fieldError('password')}
            />

            <Button type="submit" variant="primary" fullWidth loading={mutation.isPending}>
              {isRegister ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            disabled={mutation.isPending}
            className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700"
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
          </button>

          {!isRegister && (
            <Button variant="outline" fullWidth className="mt-4" onClick={handleDemoLogin} disabled={mutation.isPending}>
              Demo Login
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
