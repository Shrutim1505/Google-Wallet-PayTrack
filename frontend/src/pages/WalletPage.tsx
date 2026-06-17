import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, EmptyState, Button } from '@/shared/ui';
import { apiClient, unwrap } from '@/shared/api/client';
import { useReceipts } from '@/features/receipts/hooks';
import { formatCurrency } from '@/utils/currency';
import toast from 'react-hot-toast';

interface WalletStatus { enabled: boolean; lastSyncAt: string | null; syncedCount: number; syncedReceiptIds: string[]; }
interface SyncResult { success: boolean; walletObjectId: string | null; saveUrl: string | null; message: string; }

function useWalletStatus() {
  return useQuery({
    queryKey: ['wallet-status'],
    queryFn: async () => { const r = await apiClient.get('/wallet/status'); return unwrap<WalletStatus>(r.data); },
  });
}

function useSyncToWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (receiptId: string) => {
      const r = await apiClient.post(`/wallet/sync/${receiptId}`);
      return unwrap<SyncResult>(r.data);
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ['wallet-status'] });
      if (data.saveUrl) window.open(data.saveUrl, '_blank');
    },
    onError: (e: Error) => toast.error(e.message || 'Sync failed'),
  });
}

export function WalletPage() {
  const { data: status } = useWalletStatus();
  const { data: receipts = [], isLoading } = useReceipts();
  const syncMutation = useSyncToWallet();

  const syncedIds = new Set(status?.syncedReceiptIds || []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Google Wallet</h1>
        <p className="text-gray-600 mt-1">Sync your receipts as digital wallet passes</p>
      </header>

      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
            <Wallet className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Wallet Status</h3>
            <p className="text-sm text-gray-600">
              {status?.enabled
                ? `Connected · ${status.syncedCount} receipt${status.syncedCount !== 1 ? 's' : ''} synced`
                : 'Not configured'}
            </p>
            {status?.lastSyncAt && <p className="text-xs text-gray-500 mt-0.5">Last sync: {new Date(status.lastSyncAt).toLocaleString()}</p>}
          </div>
          <div className="ml-auto">
            {status?.enabled ? <CheckCircle className="w-6 h-6 text-green-500" /> : <AlertCircle className="w-6 h-6 text-amber-500" />}
          </div>
        </div>
      </Card>

      <h2 className="text-lg font-semibold text-gray-900">Your Receipts</h2>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : receipts.length === 0 ? (
        <Card>
          <EmptyState icon={<CreditCard className="w-6 h-6" />} title="No receipts to sync" description="Upload receipts first, then sync them to Google Wallet" />
        </Card>
      ) : (
        <div className="space-y-3">
          {receipts.map(r => (
            <Card key={r.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{r.merchant}</p>
                  <p className="text-sm text-gray-500">{r.date} · {r.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-blue-600">{formatCurrency(r.amount)}</span>
                {syncedIds.has(r.id) ? (
                  <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle className="w-4 h-4" /> Synced</span>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => syncMutation.mutate(r.id)}
                    loading={syncMutation.isPending && syncMutation.variables === r.id}>
                    Sync
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
