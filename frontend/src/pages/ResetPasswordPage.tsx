import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Wallet, CheckCircle } from 'lucide-react';
import { Button, Input } from '@/shared/ui';
import { authApi } from '@/features/auth/api';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.confirmPasswordReset(token, password),
    onSuccess: () => {
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    },
    onError: (e: Error) => toast.error(e.message || 'Reset failed — token may be expired'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    mutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>

          {done ? (
            <div className="text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <h1 className="text-xl font-bold text-gray-900">Password Reset</h1>
              <p className="text-gray-600 text-sm">Redirecting you to sign in...</p>
            </div>
          ) : !token ? (
            <div className="text-center space-y-3">
              <h1 className="text-xl font-bold text-gray-900">Invalid Link</h1>
              <p className="text-gray-600 text-sm">This reset link is missing a token.</p>
              <Link to="/forgot-password"><Button variant="primary" fullWidth>Request New Link</Button></Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">Set New Password</h1>
              <p className="text-center text-gray-600 mb-6">Choose a strong password</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="New Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} helperText="Minimum 8 characters" disabled={mutation.isPending} />
                <Input label="Confirm Password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required disabled={mutation.isPending} />
                <Button type="submit" variant="primary" fullWidth loading={mutation.isPending}>Reset Password</Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
