import { useState, useEffect } from 'react';
import { Wallet, RefreshCw, CheckCircle, Clock, XCircle } from 'lucide-react';
import { api } from '../../../services/api';
import { Receipt } from '../../../types/receipt';
import toast from 'react-hot-toast';

interface WalletStatus {
  connected?: boolean;
  lastSync?: string;
  syncedCount?: number;
}

interface WalletSyncPanelProps {
  receipts: Receipt[];
}

export function WalletSyncPanel({ receipts }: WalletSyncPanelProps) {
  const [status, setStatus] = useState<WalletStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getWalletStatus() as WalletStatus;
      setStatus(data);
    } catch {
      setStatus({ connected: false, syncedCount: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleSyncAll = async () => {
    setSyncing(true);
    let synced = 0;
    for (const r of receipts) {
      try {
        await api.syncToWallet(r.id);
        synced++;
      } catch { /* skip failed */ }
    }
    toast.success(`Synced ${synced}/${receipts.length} receipts to Google Wallet`);
    setSyncing(false);
    fetchStatus();
  };

  const syncedCount = status?.syncedCount || 0;
  const pendingCount = receipts.length - syncedCount;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Google Wallet</h2>
        <p className="text-gray-600 mt-1">Sync your receipts to Google Wallet</p>
      </div>

      {/* Connection Card */}
      <div className="bg-gradient-to-br from-teal-50 to-green-50 rounded-xl p-6 border border-teal-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-green-500 rounded-xl flex items-center justify-center text-2xl">
              💳
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Google Wallet</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {status?.connected !== false ? (
                  <><CheckCircle className="w-3.5 h-3.5 text-green-600" /><span className="text-sm text-green-700">Connected</span></>
                ) : (
                  <><XCircle className="w-3.5 h-3.5 text-gray-400" /><span className="text-sm text-gray-500">Not connected</span></>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleSyncAll}
            disabled={syncing || receipts.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync All'}
          </button>
        </div>

        {status?.lastSync && (
          <p className="text-xs text-gray-500 mt-3">Last synced: {new Date(status.lastSync).toLocaleString()}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Synced</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{syncedCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-600">Pending</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{pendingCount > 0 ? pendingCount : 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-medium text-gray-600">Total Receipts</span>
          </div>
          <p className="text-2xl font-bold text-teal-600">{receipts.length}</p>
        </div>
      </div>

      {/* Receipt List */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-lg" />)}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Receipts</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {receipts.length === 0 ? (
              <p className="p-4 text-gray-500 text-sm">No receipts to sync</p>
            ) : (
              receipts.slice(0, 10).map((r) => (
                <div key={r.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">{r.merchant}</p>
                    <p className="text-sm text-gray-500">{r.date} · {r.category}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(r.amount)}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">synced</span>
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
