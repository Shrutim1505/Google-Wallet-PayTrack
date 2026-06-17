import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeftRight } from 'lucide-react';
import { Card, CardTitle, Button, Input } from '@/shared/ui';
import { apiClient, unwrap } from '@/shared/api/client';

const COMMON = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD', 'AED'];

function useConvert() {
  return useMutation({
    mutationFn: async ({ amount, from, to }: { amount: number; from: string; to: string }) => {
      const r = await apiClient.post('/features/currency/convert', { amount, from, to });
      return unwrap<{ converted: number; rate: number }>(r.data);
    },
  });
}

export function CurrencyConverter() {
  const [amount, setAmount] = useState('100');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('INR');
  const convert = useConvert();

  const handleConvert = () => {
    if (!amount || Number(amount) <= 0) return;
    convert.mutate({ amount: Number(amount), from, to });
  };

  const swap = () => { setFrom(to); setTo(from); convert.reset(); };

  return (
    <Card>
      <CardTitle className="mb-4">Currency Converter</CardTitle>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input label="Amount" type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
          <select value={from} onChange={e => setFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            {COMMON.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={swap} className="p-2 mb-0.5 text-gray-500 hover:text-blue-600 transition" aria-label="Swap currencies">
          <ArrowLeftRight className="w-5 h-5" />
        </button>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
          <select value={to} onChange={e => setTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            {COMMON.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Button variant="primary" onClick={handleConvert} loading={convert.isPending}>Convert</Button>
      </div>

      {convert.data && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-lg font-semibold text-gray-900">
            {Number(amount).toLocaleString()} {from} = {convert.data.converted.toLocaleString(undefined, { maximumFractionDigits: 2 })} {to}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Rate: 1 {from} = {convert.data.rate.toFixed(4)} {to} · live exchange rates</p>
        </div>
      )}
      {convert.isError && <p className="mt-3 text-sm text-red-600">Conversion failed. Try again.</p>}
    </Card>
  );
}
