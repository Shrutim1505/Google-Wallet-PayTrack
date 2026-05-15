import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Download, Plus, Receipt as ReceiptIcon, Search } from 'lucide-react';
import { Button, Card, EmptyState, Input, ReceiptCardSkeleton } from '@/shared/ui';
import { useReceipts, useExportReceiptsCsv } from '@/features/receipts/hooks';
import { formatCurrency } from '@/utils/currency';
import { NewReceiptDialog } from '@/features/receipts/components/NewReceiptDialog';

export function ReceiptsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: receipts = [], isLoading } = useReceipts();
  const exportCsv = useExportReceiptsCsv();

  const filtered = useMemo(() => {
    if (!searchQuery) return receipts;
    const q = searchQuery.toLowerCase();
    return receipts.filter(
      (r) =>
        r.merchant.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.items.some((i) => i.name.toLowerCase().includes(q))
    );
  }, [receipts, searchQuery]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Receipts</h1>
          <p className="text-gray-600 mt-1">Your digital receipts</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => exportCsv.mutate()}
            loading={exportCsv.isPending}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowCreate(true)}
          >
            New Receipt
          </Button>
        </div>
      </header>

      <Input
        type="search"
        placeholder="Search by merchant, category, or item..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        aria-label="Search receipts"
        className="pl-10"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <ReceiptCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={searchQuery ? <Search className="w-6 h-6" /> : <ReceiptIcon className="w-6 h-6" />}
          title={searchQuery ? 'No matches found' : 'No receipts yet'}
          description={
            searchQuery
              ? 'Try different search terms or clear filters'
              : 'Upload a receipt or add one manually to get started'
          }
          action={
            !searchQuery && (
              <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
                Add Receipt
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((receipt) => (
            <Link key={receipt.id} to={`/receipts/${receipt.id}`}>
              <Card interactive className="h-full">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900 truncate">{receipt.merchant}</h3>
                </div>
                <p className="text-sm text-gray-600 mt-2">{receipt.category}</p>
                <p className="text-2xl font-bold text-blue-600 mt-4">{formatCurrency(receipt.amount)}</p>
                <p className="text-xs text-gray-500 mt-3">{receipt.date}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <NewReceiptDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
