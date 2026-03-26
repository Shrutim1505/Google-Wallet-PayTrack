import React, { useState, useMemo } from 'react';
import { Header } from '../common/Header';
import { Navigation } from '../common/Navigation';
import { DashboardStats } from '../features/Dashboard/DashboardStats';
import { ReceiptUpload } from '../features/Receipts/ReceiptUpload';
import { SearchAndFilter } from '../features/Receipts/SearchAndFilter';
import { ReceiptModal } from '../features/Receipts/ReceiptModal';
import { SpendingChart } from '../features/Analytics/SpendingChart';
import { BudgetAlerts } from '../features/Analytics/BudgetAlerts';
import { SettingsPage } from '../features/Settings/SettingsPage';
import { AIInsightsPanel } from '../features/AI/AIInsightsPanel';
import { WalletSyncPanel } from '../features/Wallet/WalletSyncPanel';
import { RecurringPanel } from '../features/Recurring/RecurringPanel';
import { SplitPanel } from '../features/Split/SplitPanel';
import { SmartAlertsPanel } from '../features/Alerts/SmartAlertsPanel';
import { CurrencyConverter } from '../features/Currency/CurrencyConverter';
import { MLInsightsPanel } from '../features/ML/MLInsightsPanel';
import { useReceipts } from '../../hooks/useReceipts';
import { useSettings } from '../../hooks/useSettings';
import { formatCurrency } from '../../utils/currency';
import { FilterOptions, Receipt } from '../../types/receipt';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { Download, LayoutDashboard, Receipt as ReceiptIcon, BarChart3, Wallet, Brain, Users, RefreshCw } from 'lucide-react';

type TabType = 'dashboard' | 'receipts' | 'analytics' | 'wallet' | 'recurring' | 'splits';

export function MainLayout() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showUpload, setShowUpload] = useState(false);
  const [showAddManual, setShowAddManual] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    category: '',
    dateRange: '',
    minAmount: 0,
    maxAmount: 0,
    merchant: '',
  });

  const { receipts, handleUploadReceipt, updateReceipt, deleteReceipt, fetchReceipts } = useReceipts();
  const { settings, saveSettings } = useSettings();

  // Close modals on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowUpload(false); setShowAddManual(false); setShowSettings(false); setSelectedReceipt(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleExportCSV = async () => {
    try {
      const blob = await api.exportReceiptsCSV();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipts-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Receipts exported!');
    } catch { toast.error('Export failed'); }
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'receipts', label: 'Receipts', icon: <ReceiptIcon className="w-4 h-4" />, badge: receipts.length },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'recurring', label: 'Recurring', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'splits', label: 'Splits', icon: <Users className="w-4 h-4" /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet className="w-4 h-4" /> },
  ];

  const totalSpent = receipts.reduce((sum, r) => sum + r.amount, 0);
  const monthlyBudget = settings.monthlyBudget;
  const budgetUsed = monthlyBudget > 0 ? Math.round((totalSpent / monthlyBudget) * 100) : 0;

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    receipts.forEach((r) => {
      map.set(r.category, (map.get(r.category) || 0) + r.amount);
    });
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [receipts]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      const matchesSearch =
        !searchQuery ||
        receipt.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receipt.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receipt.items.some((item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      const matchesCategory = !filters.category || receipt.category === filters.category;
      const matchesMinAmount = !filters.minAmount || receipt.amount >= filters.minAmount;
      const matchesMaxAmount = !filters.maxAmount || receipt.amount <= filters.maxAmount;
      const matchesMerchant =
        !filters.merchant ||
        receipt.merchant.toLowerCase().includes(filters.merchant.toLowerCase());
      return matchesSearch && matchesCategory && matchesMinAmount && matchesMaxAmount && matchesMerchant;
    });
  }, [receipts, searchQuery, filters]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header onSettingsClick={() => setShowSettings(true)} />
      <Navigation 
        items={navigationItems} 
        activeTab={activeTab} 
        onTabChange={(tab) => setActiveTab(tab as TabType)}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
              <p className="text-gray-600 mt-1">Welcome back! Here's your spending overview</p>
            </div>

            <DashboardStats 
              totalSpent={totalSpent}
              totalReceipts={receipts.length}
              monthlyBudget={monthlyBudget}
              budgetUsed={budgetUsed}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Receipts</h3>
                {receipts.length === 0 ? (
                  <p className="text-gray-500">No receipts yet. Add your first receipt to get started!</p>
                ) : (
                  <div className="space-y-3">
                    {receipts.slice(0, 5).map((receipt) => (
                      <div 
                        key={receipt.id} 
                        onClick={() => setSelectedReceipt(receipt)}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium text-gray-900">{receipt.merchant}</p>
                            <p className="text-sm text-gray-600">{receipt.category} · {receipt.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-blue-600">{formatCurrency(receipt.amount)}</p>
                          <span className="text-xs text-teal-600" title="Synced to Wallet">💳</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
                {categoryBreakdown.length === 0 ? (
                  <p className="text-gray-500 text-sm">No spending data yet</p>
                ) : (
                  <div className="space-y-3">
                    {categoryBreakdown.map(({ category, amount }) => (
                      <div key={category}>
                        <div className="flex justify-between mb-1">
                          <p className="text-sm font-medium text-gray-700">{category}</p>
                          <p className="text-sm text-gray-600">{formatCurrency(amount)}</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${totalSpent > 0 ? (amount / totalSpent) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* AI Insights Section */}
            <AIInsightsPanel />

            {/* Smart Alerts */}
            <SmartAlertsPanel />

            {/* ML Model + Currency Converter */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MLInsightsPanel />
              <CurrencyConverter />
            </div>
          </div>
        )}

        {activeTab === 'receipts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Receipts</h2>
                <p className="text-gray-600 mt-1">Your digital receipts</p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleExportCSV}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium flex items-center gap-2">
                  <Download className="w-4 h-4" /> Export CSV
                </button>
                <button 
                  onClick={() => setShowAddManual(true)}
                  className="px-6 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-all font-medium"
                >
                  + Manual Entry
                </button>
                <button 
                  onClick={() => setShowUpload(true)}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium"
                >
                  📷 Upload Receipt
                </button>
              </div>
            </div>

            <SearchAndFilter 
              onSearch={setSearchQuery}
              onFilter={setFilters}
              searchQuery={searchQuery}
              filters={filters}
            />

            {filteredReceipts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-500">
                  {searchQuery || Object.values(filters).some((v) => v)
                    ? 'No receipts match your filters'
                    : 'No receipts yet. Add one to get started!'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReceipts.map((receipt) => (
                  <div 
                    key={receipt.id} 
                    onClick={() => setSelectedReceipt(receipt)}
                    className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-gray-900">{receipt.merchant}</h3>
                      <span className="text-xs text-teal-600" title="Synced to Wallet">💳</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{receipt.category}</p>
                    <p className="text-2xl font-bold text-blue-600 mt-4">{formatCurrency(receipt.amount)}</p>
                    <p className="text-xs text-gray-500 mt-3">{receipt.date}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Analytics</h2>
              <p className="text-gray-600 mt-1">Spending insights and trends</p>
            </div>
            <BudgetAlerts totalSpent={totalSpent} monthlyBudget={monthlyBudget} budgetUsed={budgetUsed} />
            <SpendingChart receipts={receipts} />
          </div>
        )}

        {activeTab === 'recurring' && (
          <RecurringPanel />
        )}

        {activeTab === 'splits' && (
          <SplitPanel receipts={receipts} />
        )}

        {activeTab === 'wallet' && (
          <WalletSyncPanel receipts={receipts} />
        )}

        {/* Upload Modal */}
        {showUpload && (
          <ReceiptUpload 
            onUpload={handleUploadReceipt}
            onClose={() => setShowUpload(false)}
          />
        )}

        {/* Manual Entry Modal */}
        {showAddManual && (
          <ManualReceiptForm
            onClose={() => setShowAddManual(false)}
            onCreated={() => { setShowAddManual(false); fetchReceipts(); }}
          />
        )}

        {/* Receipt Detail Modal */}
        {selectedReceipt && (
          <ReceiptModal 
            receipt={selectedReceipt}
            onClose={() => setSelectedReceipt(null)}
            onUpdate={(updated) => { updateReceipt(updated.id, updated); setSelectedReceipt(updated); }}
            onDelete={deleteReceipt}
          />
        )}

        {/* Settings Modal */}
        {showSettings && (
          <SettingsPage 
            settings={settings}
            onSave={saveSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </main>
    </div>
  );
}

/* ── Manual Receipt Entry Form with AI Categorize ── */
function ManualReceiptForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Other');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<Array<{ merchant: string; amount: number; date: string; similarity: number }>>([]);

  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'];

  const handleAICategorize = async () => {
    if (!merchant.trim()) { toast.error('Enter a merchant name first'); return; }
    setAiLoading(true);
    try {
      const result = await api.mlPredict(merchant, []) as any;
      const suggested = result?.category;
      if (typeof suggested === 'string' && categories.includes(suggested)) {
        setCategory(suggested);
        toast.success(`ML predicts: ${suggested} (${Math.round((result?.confidence || 0) * 100)}% confidence)`);
      } else {
        // Fallback to rule-based
        const fallback = await api.getAICategorize(merchant, []) as any;
        const cat = fallback?.category;
        if (typeof cat === 'string' && categories.includes(cat)) {
          setCategory(cat);
          toast.success(`AI suggests: ${cat}`);
        }
      }
    } catch {
      toast.error('AI categorization unavailable');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for duplicates first
    if (duplicates.length === 0 && merchant.trim() && amount) {
      try {
        const dupes = await api.checkDuplicate(merchant, Number(amount), date) as any;
        if (Array.isArray(dupes) && dupes.length > 0) {
          setDuplicates(dupes);
          return; // Show warning, don't submit yet
        }
      } catch { /* proceed if check fails */ }
    }

    setLoading(true);
    setDuplicates([]);
    try {
      await api.createReceipt({
        id: '',
        merchant,
        amount: Number(amount),
        date,
        category,
        items: [],
      });
      toast.success('Receipt added!');
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create receipt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Add Receipt</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Merchant</label>
          <input type="text" required value={merchant} onChange={(e) => setMerchant(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
            <input type="number" required min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <div className="flex gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="button" onClick={handleAICategorize} disabled={aiLoading}
              className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-sm flex items-center gap-1 whitespace-nowrap">
              <Brain className="w-3.5 h-3.5" />
              {aiLoading ? '...' : 'AI'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Optional notes..." />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Saving...' : duplicates.length > 0 ? 'Add Anyway' : 'Add Receipt'}
          </button>
        </div>

        {duplicates.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-semibold text-amber-800 mb-2">⚠️ Possible duplicates found:</p>
            {duplicates.map((d, i) => (
              <p key={i} className="text-xs text-amber-700">
                {d.merchant} — {formatCurrency(d.amount)} on {d.date} ({d.similarity}% match)
              </p>
            ))}
            <p className="text-xs text-amber-600 mt-1">Click "Add Anyway" to proceed.</p>
          </div>
        )}
      </form>
    </div>
  );
}
