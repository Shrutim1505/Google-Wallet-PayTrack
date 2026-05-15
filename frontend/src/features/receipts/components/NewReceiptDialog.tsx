import { useState } from 'react';
import { Dialog, DialogFooter, Button, Input } from '@/shared/ui';
import { useCreateReceipt } from '../hooks';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NewReceiptDialog({ open, onClose }: Props) {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Other');
  const [notes, setNotes] = useState('');

  const createMutation = useCreateReceipt();

  const reset = () => {
    setMerchant('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('Other');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        merchant: merchant.trim(),
        amount: Number(amount),
        date,
        category,
        notes: notes.trim() || undefined,
        items: [],
      });
      reset();
      onClose();
    } catch {
      // toast shown by mutation onError
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Add Receipt" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Merchant"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="e.g. Swiggy"
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Amount (₹)"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="receipt-category" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="receipt-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="receipt-notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            id="receipt-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any additional details..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={createMutation.isPending}>
            Add Receipt
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
