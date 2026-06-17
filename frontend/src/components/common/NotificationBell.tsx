import { useState, useRef, useEffect } from 'react';
import { Bell, AlertTriangle, TrendingUp, Info, Check } from 'lucide-react';
import { useAlerts, useMarkAlertsRead } from '@/features/alerts/hooks';

const SEVERITY_ICON: Record<string, React.ReactNode> = {
  critical: <AlertTriangle className="w-4 h-4 text-red-500" />,
  warning: <TrendingUp className="w-4 h-4 text-amber-500" />,
  info: <Info className="w-4 h-4 text-blue-500" />,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data } = useAlerts();
  const markRead = useMarkAlertsRead();
  const ref = useRef<HTMLDivElement>(null);

  const alerts = data?.alerts || [];
  const unreadCount = data?.unreadCount || 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={() => markRead.mutate(undefined)} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">No notifications yet</div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${!alert.isRead ? 'bg-blue-50/40' : ''}`}>
                  <div className="flex gap-2">
                    <div className="mt-0.5">{SEVERITY_ICON[alert.severity] || SEVERITY_ICON.info}</div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(alert.createdAt).toLocaleString()}</p>
                    </div>
                    {!alert.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
