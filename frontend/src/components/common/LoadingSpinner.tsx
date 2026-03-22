import React from 'react';
import { Wallet } from 'lucide-react';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
}

export function LoadingSpinner({ fullScreen = false }: LoadingSpinnerProps) {
  const content = (
    <div className="text-center">
      <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
        <Wallet className="w-8 h-8 text-white" />
      </div>
      <p className="text-gray-600 font-medium">Loading...</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}