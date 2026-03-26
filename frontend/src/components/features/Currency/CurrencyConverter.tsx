import { useState } from 'react';
import { ArrowRightLeft, RefreshCw } from 'lucide-react';
import { api } from '../../../services/api';
import { CURRENCIES } from '../../../utils/currency';
import toast from 'react-hot-toast';

export function CurrencyConverter() {
  const [amount, setAmount] = useState('1000');
  const [from, setFrom] = useState('INR');
  const [to, setTo] = useState('USD');
  const [result, setResult] = useState<{ converted: number; rate: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConvert = async () => {
    if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return; }
    setLoading(true);
    try {
      const data = await api.convertCurrency(Number(amount), from, to) as any;
      setResult(data);
    } catch { toast.error('Conversion failed'); }
    finally { setLoading(false); }
  };

  const swap = () => { setFrom(to); setTo(from); setResult(null); };

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <ArrowRightLeft className="w-5 h-5 text-blue-600" /> Currency Converter
      </h3>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
          <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setResult(null); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <select value={from} onChange={e => { setFrom(e.target.value); setResult(null); }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={swap} className="p-2 hover:bg-gray-100 rounded-lg transition-all mb-0.5" title="Swap">
          <ArrowRightLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <select value={to} onChange={e => { setTo(e.target.value); setResult(null); }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={handleConvert} disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Convert'}
        </button>
      </div>

      {result && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-2xl font-bold text-blue-600">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: to, maximumFractionDigits: 2 }).format(result.converted)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Rate: 1 {from} = {result.rate} {to}</p>
        </div>
      )}
    </div>
  );
}
