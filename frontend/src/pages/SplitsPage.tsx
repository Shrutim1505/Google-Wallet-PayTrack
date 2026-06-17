import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Check, Link } from 'lucide-react';
import { Card, EmptyState, Button, Input } from '@/shared/ui';
import { apiClient, unwrap } from '@/shared/api/client';
import { useReceipts } from '@/features/receipts/hooks';
import { formatCurrency } from '@/utils/currency';
import toast from 'react-hot-toast';

interface Participant { name: string; amount: number; paid: boolean; }
interface SplitExpense {
  id: string; receiptId: string; shareToken: string; splitType: string;
  participants: Participant[]; createdAt: string;
  receipt?: { merchant: string; amount: number; date: string; category: string };
}

function useSplits() {
  return useQuery({
    queryKey: ['splits'],
    queryFn: async () => { const r = await apiClient.get('/features/splits'); return unwrap<SplitExpense[]>(r.data); },
  });
}

function useCreateSplit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { receiptId: string; participants: { name: string; amount: number; paid: boolean }[]; splitType: string }) => {
      const r = await apiClient.post('/features/splits', body);
      return unwrap<SplitExpense>(r.data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['splits'] }); toast.success('Split created'); },
    onError: (e: Error) => toast.error(e.message || 'Failed to create split'),
  });
}

export function SplitsPage() {
  const { data: splits = [], isLoading } = useSplits();
  const { data: receipts = [] } = useReceipts();
  const createSplit = useCreateSplit();
  const [showForm, setShowForm] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState('');
  const [names, setNames] = useState('');

  const handleCreate = () => {
    if (!selectedReceipt || !names.trim()) return;
    const participants = names.split(',').map(n => ({ name: n.trim(), amount: 0, paid: false })).filter(p => p.name);
    createSplit.mutate({ receiptId: selectedReceipt, participants, splitType: 'equal' }, {
      onSuccess: () => { setShowForm(false); setSelectedReceipt(''); setNames(''); },
    });
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/splits/shared/${token}`);
    toast.success('Share link copied!');
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Splits</h1>
          <p className="text-gray-600 mt-1">Share expenses with friends</p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(!showForm)}>
          New Split
        </Button>
      </header>

      {showForm && (
        <Card className="border-2 border-blue-100">
          <h3 className="font-semibold text-gray-900 mb-4">Create a Split</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt</label>
              <select value={selectedReceipt} onChange={e => setSelectedReceipt(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select a receipt...</option>
                {receipts.map(r => (
                  <option key={r.id} value={r.id}>{r.merchant} — {formatCurrency(r.amount)} ({r.date})</option>
                ))}
              </select>
            </div>
            <Input label="Participants (comma-separated)" value={names} onChange={e => setNames(e.target.value)}
              placeholder="e.g. Alice, Bob, Charlie" />
            {selectedReceipt && names.trim() && (
              <p className="text-sm text-gray-600">
                Each person pays: <strong>{formatCurrency((receipts.find(r => r.id === selectedReceipt)?.amount || 0) / Math.max(1, names.split(',').filter(n => n.trim()).length))}</strong>
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="primary" onClick={handleCreate} loading={createSplit.isPending}>Create Split</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : splits.length === 0 ? (
        <Card>
          <EmptyState icon={<Users className="w-6 h-6" />} title="No splits yet" description="Create a split from any receipt to share expenses with friends" />
        </Card>
      ) : (
        <div className="space-y-4">
          {splits.map(split => (
            <Card key={split.id}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{split.receipt?.merchant || 'Receipt'}</h3>
                  <p className="text-sm text-gray-500">{split.receipt?.date} · {formatCurrency(split.receipt?.amount || 0)} total · {split.splitType}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyLink(split.shareToken)} leftIcon={<Link className="w-3.5 h-3.5" />}>
                  Share
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {split.participants.map((p, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${p.paid ? 'bg-green-50' : 'bg-gray-50'}`}>
                    {p.paid ? <Check className="w-4 h-4 text-green-600" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                    <span className={p.paid ? 'text-green-700' : 'text-gray-700'}>{p.name}</span>
                    <span className="ml-auto font-medium">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
