import { useState, useEffect } from 'react';
import { Wallet, Bell, Settings, LogOut, User, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../context/RealtimeContext';
import { api } from '../../services/api';

interface HeaderProps {
  onSettingsClick?: () => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  const { logout } = useAuth();
  const [insightCount, setInsightCount] = useState(0);

  let connected = false;
  let subscribe: ((event: string, handler: (data: any) => void) => () => void) | undefined;
  try {
    const rt = useRealtime();
    connected = rt.connected;
    subscribe = rt.subscribe;
  } catch {
    // Not in RealtimeProvider
  }

  const userName = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.name || '';
    } catch { return ''; }
  })();

  useEffect(() => {
    api.getSmartAlerts()
      .then((data: any) => {
        setInsightCount(data?.unreadCount || 0);
      })
      .catch(() => {
        api.getAIInsights()
          .then((data: any) => {
            const count = (data?.tips?.length || 0) + (data?.anomalies?.length || 0);
            setInsightCount(count);
          })
          .catch(() => {});
      });
  }, []);

  // Real-time: increment alert count when new alerts arrive
  useEffect(() => {
    if (!subscribe) return;
    return subscribe('alert:new', (data: any) => {
      const newAlerts = data?.alerts?.length || 1;
      setInsightCount(prev => prev + newAlerts);
    });
  }, [subscribe]);

  return (
    <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Receipt Manager
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> AI Powered
                </span>
              </div>
              <span className="text-xs text-gray-500 font-medium">Smart Receipt Tracking</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" title={connected ? 'Real-time connected' : 'Connecting...'}>
              {connected ? (
                <><Wifi className="w-3 h-3 text-green-500" /><span className="text-green-600 hidden sm:inline">Live</span></>
              ) : (
                <><WifiOff className="w-3 h-3 text-gray-400" /><span className="text-gray-400 hidden sm:inline">Offline</span></>
              )}
            </div>
            <button className="relative p-2 hover:bg-blue-50 rounded-xl transition-all duration-200 group">
              <Bell className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
              {insightCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center px-1">
                  {insightCount}
                </span>
              )}
            </button>
            <button 
              onClick={onSettingsClick}
              className="p-2 hover:bg-blue-50 rounded-xl transition-all duration-200 group"
            >
              <Settings className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
            </button>
            <button 
              onClick={logout}
              className="p-2 hover:bg-red-50 rounded-xl transition-all duration-200 group"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5 text-gray-600 group-hover:text-red-600" />
            </button>
            <button className="p-2 hover:bg-blue-50 rounded-xl transition-all duration-200 group flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              {userName && <span className="text-sm font-medium text-gray-700 hidden sm:block">{userName}</span>}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
