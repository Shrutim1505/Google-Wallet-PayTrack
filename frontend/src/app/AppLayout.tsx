import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Receipt as ReceiptIcon, BarChart3, Wallet, Users, RefreshCw, Settings, LogOut } from 'lucide-react';
import { useAuth, useLogout } from '@/features/auth/hooks';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/receipts', label: 'Receipts', icon: ReceiptIcon },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/recurring', label: 'Recurring', icon: RefreshCw },
  { to: '/splits', label: 'Splits', icon: Users },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
];

export function AppLayout() {
  const { user } = useAuth();
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">PayTrack</h1>
              <p className="text-xs text-gray-500">Smart receipt management</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            )}
            <NavLink
              to="/settings"
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </NavLink>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout.mutate()}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white/60 backdrop-blur-sm border-b border-gray-100" aria-label="Main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition whitespace-nowrap',
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-blue-600 hover:border-blue-300'
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
