import { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertTriangle, TrendingUp, Info, BookOpen } from 'lucide-react';
import { api } from '../../../services/api';
import { useRealtime } from '../../../context/RealtimeContext';
import toast from 'react-hot-toast';

interface SmartAlert {
  id: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  isRead: boolean;
  createdAt: string;
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', icon: <AlertTriangle className="w-4 h-4 text-red-600" /> },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: <TrendingUp className="w-4 h-4 text-amber-600" /> },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: <Info className="w-4 h-4 text-blue-600" /> },
};

export function SmartAlertsPanel() {
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const { subscribe } = useRealtime();

  const fetchAlerts = () => {
    api.getSmartAlerts()
      .then((data: any) => {
        setAlerts(data?.alerts || []);
        setUnreadCount(data?.unreadCount || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAlerts(); }, []);

  // Real-time: prepend new alerts as they arrive
  useEffect(() => {
    return subscribe('alert:new', (data: any) => {
      const newAlerts = data?.alerts || [];
      if (newAlerts.length) {
        setAlerts(prev => [...newAlerts.map((a: any) => ({ ...a, isRead: false })), ...prev]);
        setUnreadCount(prev => prev + newAlerts.length);
      }
    });
  }, [subscribe]);

  const markAllRead = async () => {
    try {
      await api.markAlertsRead();
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
      setUnreadCount(0);
      toast.success('All alerts marked as read');
    } catch { toast.error('Failed to mark alerts'); }
  };

  const generateDigest = async () => {
    try {
      await api.generateDigest();
      toast.success('Weekly digest generated!');
      fetchAlerts();
    } catch { toast.error('Failed to generate digest'); }
  };

  if (loading) {
    return <div className="animate-pulse space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Smart Alerts</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">{unreadCount}</span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={generateDigest}
            className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
            <BookOpen className="w-3 h-3" /> Digest
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <CheckCircle className="w-3 h-3" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-sm">No alerts yet. They'll appear as you add receipts.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {alerts.map(alert => {
            const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
            return (
              <div key={alert.id}
                className={`${style.bg} ${style.border} border rounded-lg p-3 ${alert.isRead ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">{style.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(alert.createdAt).toLocaleString()}</p>
                  </div>
                  {!alert.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
