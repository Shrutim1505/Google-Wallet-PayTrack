import { useState } from 'react';
import { Target, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Card, EmptyState, Button, Input } from '@/shared/ui';
import { formatCurrency } from '@/utils/currency';
import {
  useBudgetStatus, useCreateBudget, useDeleteBudget,
  BUDGET_CATEGORIES, BUDGET_PERIODS,
} from '@/features/budgets/hooks';

export function BudgetsPage() {
  const { data: budgets = [], isLoading } = useBudgetStatus();
  const createBudget = useCreateBudget();
  const deleteBudget = useDeleteBudget();

  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState('Food');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('monthly');

  const usedCategories = new Set(budgets.map(b => b.category));
  const availableCategories = BUDGET_CATEGORIES.filter(c => !usedCategories.has(c));

  const handleCreate = () => {
    if (!amount || Number(amount) <= 0) return;
    createBudget.mutate(
      { category, amount: Number(amount), period },
      { onSuccess: () => { setShowForm(false); setAmount(''); setCategory(availableCategories[0] || 'Food'); } }
    );
  };

  const barColor = (b: { isOverBudget: boolean; isNearThreshold: boolean }) =>
    b.isOverBudget ? 'bg-red-500' : b.isNearThreshold ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Budgets</h1>
          <p className="text-gray-600 mt-1">Set category budgets and track spending</p>
        </div>
        {availableCategories.length > 0 && (
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setShowForm(!showForm); setCategory(availableCategories[0]); }}>
            New Budget
          </Button>
        )}
      </header>

      {showForm && (
        <Card className="border-2 border-blue-100">
          <h3 className="font-semibold text-gray-900 mb-4">Create a Budget</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Input label="Amount (₹)" type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="5000" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <select value={period} onChange={e => setPeriod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                {BUDGET_PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="primary" onClick={handleCreate} loading={createBudget.isPending}>Create</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : budgets.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Target className="w-6 h-6" />}
            title="No budgets yet"
            description="Create a budget to track spending against your limits"
            action={<Button variant="primary" onClick={() => { setShowForm(true); setCategory(availableCategories[0]); }}>Add Budget</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map(b => (
            <Card key={b.id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{b.category}</h3>
                  <p className="text-sm text-gray-500 capitalize">{b.period}</p>
                </div>
                <div className="flex items-center gap-2">
                  {b.isOverBudget && <span className="flex items-center gap-1 text-xs text-red-600"><AlertTriangle className="w-3.5 h-3.5" /> Over</span>}
                  {b.isNearThreshold && <span className="flex items-center gap-1 text-xs text-amber-600"><AlertTriangle className="w-3.5 h-3.5" /> Near limit</span>}
                  <button onClick={() => deleteBudget.mutate(b.id)} className="text-gray-400 hover:text-red-500 transition" aria-label={`Delete ${b.category} budget`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{formatCurrency(b.spent)} spent</span>
                <span className="text-gray-900 font-medium">{formatCurrency(b.budgetAmount)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div className={`${barColor(b)} h-2.5 rounded-full transition-all`} style={{ width: `${Math.min(100, b.percentage)}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-2">{b.percentage}% used · {formatCurrency(Math.max(0, b.budgetAmount - b.spent))} remaining</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
