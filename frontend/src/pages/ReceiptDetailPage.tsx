import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Brain, Check, X, AlertTriangle, Sparkles } from 'lucide-react';
import { Button, Card, Skeleton } from '@/shared/ui';
import { useReceipt, useDeleteReceipt, useReceiptAIMetadata, useCorrectCategory } from '@/features/receipts/hooks';
import { formatCurrency } from '@/utils/currency';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Other'];

const MODEL_LABELS: Record<string, string> = {
  embedding: 'Gemini Embeddings',
  naive_bayes: 'Naive Bayes',
  rule_based: 'Rule-Based',
  llm: 'Gemini LLM',
};

export function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: receipt, isLoading, error } = useReceipt(id);
  const { data: aiMeta } = useReceiptAIMetadata(id);
  const deleteMutation = useDeleteReceipt();
  const correctMutation = useCorrectCategory();
  const [editing, setEditing] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('Delete this receipt? This cannot be undone.')) return;
    await deleteMutation.mutateAsync(id);
    navigate('/receipts', { replace: true });
  };

  const handleCorrect = async () => {
    if (!id || !newCategory) return;
    await correctMutation.mutateAsync({ id, category: newCategory });
    setEditing(false);
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card><Skeleton className="h-5 w-48 mb-4" /><Skeleton className="h-10 w-32 mb-4" /><Skeleton className="h-4 w-32" /></Card>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link to="/receipts" className="text-blue-600 text-sm hover:underline flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to receipts
        </Link>
        <Card><p className="text-gray-600">Receipt not found</p></Card>
      </div>
    );
  }

  const discrepancyKeys = aiMeta?.discrepancies ? Object.keys(aiMeta.discrepancies).filter(k => k !== 'correction') : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/receipts" className="text-blue-600 text-sm hover:underline flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to receipts
      </Link>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{receipt.merchant}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">{receipt.category} · {receipt.date}</span>
            </div>
          </div>
          <Button variant="danger" size="sm" leftIcon={<Trash2 className="w-4 h-4" />} onClick={handleDelete} loading={deleteMutation.isPending}>
            Delete
          </Button>
        </div>

        <div className="mt-6 pb-6 border-b border-gray-100">
          <p className="text-sm text-gray-500 uppercase tracking-wide">Amount</p>
          <p className="text-4xl font-bold text-blue-600 mt-1">{formatCurrency(receipt.amount)}</p>
        </div>

        {/* Category correction */}
        <div className="mt-6 pb-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide">Category</p>
              {!editing ? (
                <p className="text-lg font-semibold text-gray-900 mt-1">{receipt.category}</p>
              ) : (
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                  className="mt-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
            {!editing ? (
              <Button variant="secondary" size="sm" onClick={() => { setEditing(true); setNewCategory(receipt.category); }}>
                Correct Category
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="primary" size="sm" leftIcon={<Check className="w-4 h-4" />} onClick={handleCorrect} loading={correctMutation.isPending}>Save</Button>
                <Button variant="ghost" size="sm" leftIcon={<X className="w-4 h-4" />} onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            )}
          </div>
          {editing && (
            <p className="text-xs text-gray-500 mt-2">Your correction trains the Naive Bayes and embedding models to improve future predictions.</p>
          )}
        </div>

        {receipt.items.length > 0 && (
          <div className="mt-6">
            <h2 className="font-semibold text-gray-900 mb-3">Items</h2>
            <ul className="divide-y divide-gray-100">
              {receipt.items.map((item, i) => (
                <li key={item.id || i} className="flex justify-between py-2">
                  <span className="text-gray-700">{item.name}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</span>
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

      {/* AI Metadata Card */}
      {aiMeta && (aiMeta.modelSource || aiMeta.llmExtracted) && (
        <Card className="border-purple-100 bg-gradient-to-br from-purple-50/40 to-white">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-gray-900">AI Analysis</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Predicted Category</p>
              <p className="font-semibold text-gray-900">{aiMeta.predictedCategory || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Confidence</p>
              <p className="font-semibold text-gray-900">{aiMeta.confidence != null ? `${Math.round(aiMeta.confidence * 100)}%` : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Model Used</p>
              <p className="font-semibold text-gray-900 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                {aiMeta.modelSource ? (MODEL_LABELS[aiMeta.modelSource] || aiMeta.modelSource) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Embedding Score</p>
              <p className="font-semibold text-gray-900">{aiMeta.embeddingScore != null ? aiMeta.embeddingScore.toFixed(2) : '—'}</p>
            </div>
          </div>

          {/* OCR vs LLM comparison */}
          {aiMeta.llmExtracted && aiMeta.ocrExtracted && (
            <div className="border-t border-purple-100 pt-4">
              <p className="text-xs text-gray-500 uppercase mb-2">OCR vs LLM Extraction</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">OCR Parser</p>
                  <p className="text-gray-700">Merchant: {aiMeta.ocrExtracted.vendor}</p>
                  <p className="text-gray-700">Amount: {formatCurrency(aiMeta.ocrExtracted.amount)}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-100">
                  <p className="text-xs text-purple-400 mb-1">Gemini LLM</p>
                  <p className="text-gray-700">Merchant: {aiMeta.llmExtracted.merchant}</p>
                  <p className="text-gray-700">Amount: {formatCurrency(aiMeta.llmExtracted.total)}</p>
                  {aiMeta.llmExtracted.paymentMethod && <p className="text-gray-700">Paid: {aiMeta.llmExtracted.paymentMethod}</p>}
                  {aiMeta.llmExtracted.tax != null && <p className="text-gray-700">Tax: {formatCurrency(aiMeta.llmExtracted.tax)}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Mismatch warnings */}
          {discrepancyKeys.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-medium text-amber-800">Mismatches detected</p>
              </div>
              <ul className="text-xs text-amber-700 space-y-1">
                {discrepancyKeys.map(k => {
                  const d = aiMeta.discrepancies[k];
                  return <li key={k}>{k}: OCR "{String(d?.ocr)}" vs LLM "{String(d?.llm)}"</li>;
                })}
              </ul>
            </div>
          )}

          {aiMeta.fallbackReason && (
            <p className="text-xs text-gray-400 mt-3">Pipeline: {aiMeta.fallbackReason}</p>
          )}
        </Card>
      )}
    </div>
  );
}
