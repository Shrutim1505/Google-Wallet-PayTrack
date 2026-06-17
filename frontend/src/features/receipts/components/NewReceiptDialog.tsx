import { useRef, useState } from 'react';
import { Dialog, DialogFooter, Button, Input } from '@/shared/ui';
import { useCreateReceipt, useUploadReceipt } from '../hooks';

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
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMutation = useCreateReceipt();
  const uploadMutation = useUploadReceipt();

  const reset = () => {
    setMerchant('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('Other');
    setNotes('');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      await uploadMutation.mutateAsync(file);
      reset();
      onClose();
    } catch {
      // toast shown by mutation onError
    }
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

  const isPending = createMutation.isPending || uploadMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} title="Add Receipt" size="md">
      {/* Upload section */}
      <div className="mb-4 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
        <p className="text-sm text-gray-600 mb-2">Upload a receipt image for OCR</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          aria-label="Upload receipt image"
        />
        {file && (
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="text-sm text-gray-700">{file.name}</span>
            <Button
              type="button"
              variant="primary"
              onClick={handleUpload}
              loading={uploadMutation.isPending}
              disabled={isPending}
            >
              Upload &amp; Extract
            </Button>
          </div>
        )}
      </div>

      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">or enter manually</span>
        </div>
      </div>

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
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={createMutation.isPending} disabled={isPending}>
            Add Receipt
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
