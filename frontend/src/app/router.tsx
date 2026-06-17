import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from './guards';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// Eager (auth + fallback)
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';

// Lazy (main app pages)
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ReceiptsPage = lazy(() => import('@/pages/ReceiptsPage').then(m => ({ default: m.ReceiptsPage })));
const ReceiptDetailPage = lazy(() => import('@/pages/ReceiptDetailPage').then(m => ({ default: m.ReceiptDetailPage })));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const WalletPage = lazy(() => import('@/pages/WalletPage').then(m => ({ default: m.WalletPage })));
const SplitsPage = lazy(() => import('@/pages/SplitsPage').then(m => ({ default: m.SplitsPage })));
const RecurringPage = lazy(() => import('@/pages/RecurringPage').then(m => ({ default: m.RecurringPage })));
const AIAnalyticsPage = lazy(() => import('@/pages/AIAnalyticsPage').then(m => ({ default: m.AIAnalyticsPage })));
const BudgetsPage = lazy(() => import('@/pages/BudgetsPage').then(m => ({ default: m.BudgetsPage })));

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <PublicOnlyRoute>
        <ForgotPasswordPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/', element: <LazyPage><DashboardPage /></LazyPage> },
      { path: '/receipts', element: <LazyPage><ReceiptsPage /></LazyPage> },
      { path: '/receipts/:id', element: <LazyPage><ReceiptDetailPage /></LazyPage> },
      { path: '/analytics', element: <LazyPage><AnalyticsPage /></LazyPage> },
      { path: '/settings', element: <LazyPage><SettingsPage /></LazyPage> },
      { path: '/wallet', element: <LazyPage><WalletPage /></LazyPage> },
      { path: '/splits', element: <LazyPage><SplitsPage /></LazyPage> },
      { path: '/recurring', element: <LazyPage><RecurringPage /></LazyPage> },
      { path: '/ai', element: <LazyPage><AIAnalyticsPage /></LazyPage> },
      { path: '/budgets', element: <LazyPage><BudgetsPage /></LazyPage> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
