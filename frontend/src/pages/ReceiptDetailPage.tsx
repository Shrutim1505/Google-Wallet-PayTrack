import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button, Card, Skeleton } from '@/shared/ui';
import { useReceipt, useDeleteReceipt } from '@/features/receipts/hooks';
import { formatCurrency } from '@/utils/currency';

export function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: receipt, isLoading, error } = useReceipt(id);
  const deleteMutation = useDeleteReceipt();

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('Delete this receipt? This cannot be undone.')) return;
    await deleteMutation.mutateAsync(id);
    navigate('/receipts', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <Skeleton className="h-5 w-48 mb-4" />
          <Skeleton className="h-10 w-32 mb-4" />
          <Skeleton className="h-4 w-32" />
        </Card>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link to="/receipts" className="text-blue-600 text-sm hover:underline flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to receipts
        </Link>
        <Card>
          <p className="text-gray-600">Receipt not found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/receipts" className="text-blue-600 text-sm hover:underline flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to receipts
      </Link>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{receipt.merchant}</h1>
            <p className="text-sm text-gray-500 mt-1">{receipt.category} · {receipt.date}</p>
          </div>
          <Button variant="danger" size="sm" leftIcon={<Trash2 className="w-4 h-4" />} onClick={handleDelete} loading={deleteMutation.isPending}>
            Delete
          </Button>
        </div>

        <div className="mt-6 pb-6 border-b border-gray-100">
          <p className="text-sm text-gray-500 uppercase tracking-wide">Amount</p>
          <p className="text-4xl font-bold text-blue-600 mt-1">{formatCurrency(receipt.amount)}</p>
        </div>

        {receipt.items.length > 0 && (
          <div className="mt-6">
            <h2 className="font-semibold text-gray-900 mb-3">Items</h2>
            <ul className="divide-y divide-gray-100">
              {receipt.items.map((item) => (
                <li key={item.id} className="flex justify-between py-2">
                  <span className="text-gray-700">{item.name}</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(item.price * (item.quantity || 1))}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {receipt.notes && (
          <div className="mt-6">
            <h2 className="font-semibold text-gray-900 mb-2">Notes</h2>
            <p className="text-sm text-gray-600">{receipt.notes}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
