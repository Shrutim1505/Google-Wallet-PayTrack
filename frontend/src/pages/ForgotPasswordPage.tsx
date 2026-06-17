import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ArrowLeft, Mail } from 'lucide-react';
import { Button, Input } from '@/shared/ui';
import { authApi } from '@/features/auth/api';
import { useMutation } from '@tanstack/react-query';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (email: string) => authApi.requestPasswordReset(email),
    onSuccess: (res) => {
      setSubmitted(true);
      if (res._dev_token) setDevToken(res._dev_token);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(email);
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

          <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">Reset Password</h1>
          <p className="text-center text-gray-600 mb-6">Enter your email to receive a reset link</p>

          {submitted ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 text-green-700 text-sm">
                <Mail className="w-5 h-5 shrink-0" />
                <span>If an account exists for <strong>{email}</strong>, a reset link has been sent.</span>
              </div>
              {devToken && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <p className="font-medium mb-1">Dev mode — email delivery not configured</p>
                  <Link to={`/reset-password?token=${devToken}`} className="text-blue-600 underline break-all">
                    Click here to reset your password
                  </Link>
                </div>
              )}
              <Link to="/login">
                <Button variant="outline" fullWidth>Back to Sign In</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required disabled={mutation.isPending} />
              <Button type="submit" variant="primary" fullWidth loading={mutation.isPending}>Send Reset Link</Button>
            </form>
          )}

          <Link to="/login" className="mt-4 text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
