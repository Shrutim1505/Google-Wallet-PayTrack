import React from 'react';
import { Wallet, Bell, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Header() {
  const { logout } = useAuth();

  return (
    <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Receipt Manager
              </h1>
              <span className="text-xs text-gray-500 font-medium">Smart Receipt Tracking</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="relative p-2 hover:bg-blue-50 rounded-xl transition-all duration-200 group">
              <Bell className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
            </button>
            <button className="p-2 hover:bg-blue-50 rounded-xl transition-all duration-200 group">
              <Settings className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
            </button>
            <button 
              onClick={logout}
              className="p-2 hover:bg-red-50 rounded-xl transition-all duration-200 group"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5 text-gray-600 group-hover:text-red-600" />
            </button>
            <button className="p-2 hover:bg-blue-50 rounded-xl transition-all duration-200 group">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}