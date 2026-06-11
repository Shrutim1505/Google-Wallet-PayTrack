import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from './guards';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// Eager (auth + fallback)
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Lazy (main app pages)
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ReceiptsPage = lazy(() => import('@/pages/ReceiptsPage').then(m => ({ default: m.ReceiptsPage })));
const ReceiptDetailPage = lazy(() => import('@/pages/ReceiptDetailPage').then(m => ({ default: m.ReceiptDetailPage })));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const WalletPage = lazy(() => import('@/pages/OtherPages').then(m => ({ default: m.WalletPage })));
const SplitsPage = lazy(() => import('@/pages/OtherPages').then(m => ({ default: m.SplitsPage })));
const RecurringPage = lazy(() => import('@/pages/OtherPages').then(m => ({ default: m.RecurringPage })));

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
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
