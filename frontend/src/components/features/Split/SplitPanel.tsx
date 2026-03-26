import { useState, useEffect } from 'react';
import { Users, Link, CheckCircle, Clock, Plus, X } from 'lucide-react';
import { api } from '../../../services/api';
import { Receipt } from '../../../types/receipt';
import { formatCurrency } from '../../../utils/currency';
import toast from 'react-hot-toast';

interface Participant { name: string; amount: number; paid: boolean }
interface Split {
  id: string;
  receiptId: string;
  shareToken: string;
  participants: Participant[];
  splitType: string;
  createdAt: string;
  receipt?: { merchant: string; amount: number; date: string; category: string };
}

export function SplitPanel({ receipts }: { receipts: Receipt[] }) {
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchSplits = () => {
    api.getUserSplits()
      .then((data: any) => setSplits(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSplits(); }, []);

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/split/${token}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Share link copied!')).catch(() => toast.error('Failed to copy'));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Split Expenses</h2>
          <p className="text-gray-600 mt-1">Split receipts with friends and track payments</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
          <Plus className="w-4 h-4" /> New Split
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">{[1, 2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-lg" />)}</div>
      ) : splits.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No splits yet. Split a receipt to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {splits.map(split => (
            <div key={split.id} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{split.receipt?.merchant || 'Receipt'}</p>
                  <p className="text-sm text-gray-500">{split.receipt?.date} • {split.splitType} split</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(split.receipt?.amount || 0)}</p>
                  <button onClick={() => copyLink(split.shareToken)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-all" title="Copy share link">
                    <Link className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {split.participants.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {p.paid ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-amber-500" />}
                      <span className="text-sm font-medium text-gray-700">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(p.amount)}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${p.paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {p.paid ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateSplitModal receipts={receipts} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchSplits(); }} />}
    </div>
  );
}

function CreateSplitModal({ receipts, onClose, onCreated }: { receipts: Receipt[]; onClose: () => void; onCreated: () => void }) {
  const [receiptId, setReceiptId] = useState('');
  const [names, setNames] = useState(['', '']);
  const [splitType, setSplitType] = useState('equal');
  const [loading, setLoading] = useState(false);

  const addParticipant = () => setNames([...names, '']);
  const removeName = (i: number) => setNames(names.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validNames = names.filter(n => n.trim());
    if (!receiptId || validNames.length < 2) { toast.error('Select a receipt and add at least 2 participants'); return; }

    setLoading(true);
    try {
      const participants = validNames.map(name => ({ name: name.trim(), amount: 0, paid: false }));
      const result = await api.createSplit(receiptId, participants, splitType) as any;
      toast.success('Split created!');
      if (result?.shareToken) {
        const url = `${window.location.origin}/split/${result.shareToken}`;
        navigator.clipboard.writeText(url).catch(() => {});
        toast.success('Share link copied to clipboard!');
      }
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create split');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Split Receipt</h2>
          <button type="button" onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Receipt</label>
          <select value={receiptId} onChange={e => setReceiptId(e.target.value)} required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select a receipt...</option>
            {receipts.map(r => (
              <option key={r.id} value={r.id}>{r.merchant} — {formatCurrency(r.amount)} ({r.date})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Split Type</label>
          <select value={splitType} onChange={e => setSplitType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="equal">Equal Split</option>
            <option value="custom">Custom Amounts</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Participants</label>
          <div className="space-y-2">
            {names.map((name, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={name} onChange={e => { const n = [...names]; n[i] = e.target.value; setNames(n); }}
                  placeholder={`Person ${i + 1}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {names.length > 2 && (
                  <button type="button" onClick={() => removeName(i)} className="px-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addParticipant} className="mt-2 text-sm text-blue-600 hover:text-blue-700">+ Add person</button>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Split'}
          </button>
        </div>
      </form>
    </div>
  );
}
