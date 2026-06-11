import { Card, CardTitle } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks';

export function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </header>

      <Card>
        <CardTitle className="mb-4">Account</CardTitle>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Name</dt>
            <dd className="text-sm font-medium text-gray-900">{user?.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Email</dt>
            <dd className="text-sm font-medium text-gray-900">{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Roles</dt>
            <dd className="text-sm font-medium text-gray-900">{user?.roles.join(', ')}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Permissions</dt>
            <dd className="text-sm font-medium text-gray-900">{user?.permissions.length ?? 0} permissions</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
