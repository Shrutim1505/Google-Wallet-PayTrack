import React, { useState } from 'react';
import { NotificationProvider } from './context/NotificationContext';
import { MainLayout } from './components/layouts/MainLayout';
import { AuthLayout } from './components/layouts/AuthLayout';
import { useAuth } from './hooks/useAuth';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { Toaster } from 'react-hot-toast';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [, setRefresh] = useState(0);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return isAuthenticated() ? (
    <MainLayout />
  ) : (
    <AuthLayout 
      onLoginSuccess={() => {
        setRefresh((prev) => prev + 1);
      }}
    />
  );
}

function App() {
  return (
    <NotificationProvider>
      <AppContent />
      <Toaster position="top-right" />
    </NotificationProvider>
  );
}

export default App;
