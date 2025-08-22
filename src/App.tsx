import React, { useState, useMemo } from 'react';
import { Receipt, SpendingInsight, BudgetAlert } from './types/receipt';
import { mockSpendingInsights, mockBudgetAlerts } from './data/mockReceipts';
import { ReceiptCard } from './components/ReceiptCard';
import { ReceiptModal } from './components/ReceiptModal';
import { SpendingChart } from './components/SpendingChart';
import { BudgetAlerts } from './components/BudgetAlerts';
import { ReceiptUpload } from './components/ReceiptUpload';
import { SearchAndFilter, FilterOptions } from './components/SearchAndFilter';
import { Dashboard } from './components/Dashboard';
import { useAuth } from './hooks/useAuth';
import { useReceipts } from './hooks/useReceipts';
import { formatCurrency } from './utils/currency';
import { 
  Plus, 
  BarChart3, 
  Receipt as ReceiptIcon, 
  Search, 
  Settings,
  Wallet,
  Bell,
  User,
  LogIn,
  LogOut
} from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'receipts' | 'analytics'>('dashboard');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    category: '',
    dateRange: '',
    minAmount: 0,
    maxAmount: 0,
    merchant: ''
  });

  const { user, loading: authLoading, signInDemo, signOut } = useAuth();
  const { receipts, loading: receiptsLoading, uploading, handleUploadReceipt } = useReceipts();

  const filteredReceipts = useMemo(() => {
    return receipts.filter(receipt => {
      const matchesSearch = receipt.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           receipt.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           receipt.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = !filters.category || receipt.category === filters.category;
      const matchesMinAmount = !filters.minAmount || receipt.amount >= filters.minAmount;
      const matchesMaxAmount = !filters.maxAmount || receipt.amount <= filters.maxAmount;
      const matchesMerchant = !filters.merchant || receipt.merchant.toLowerCase().includes(filters.merchant.toLowerCase());
      
      return matchesSearch && matchesCategory && matchesMinAmount && matchesMaxAmount && matchesMerchant;
    });
  }, [receipts, searchQuery, filters]);

  const handleFileUpload = async (file: File) => {
    try {
      await handleUploadReceipt(file);
      setShowUpload(false);
      
      // Show success notification
      setTimeout(() => {
        alert('Receipt uploaded and processed successfully!');
      }, 1000);
    } catch (error) {
      alert('Error uploading receipt. Please try again.');
    }
  };

  const totalSpent = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const monthlyBudget = 50000; // ₹50,000 monthly budget

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'receipts', label: 'Receipts', icon: ReceiptIcon },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  // Show loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-12 max-w-md w-full mx-4 border border-gray-100">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Wallet className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Receipt Manager
            </h1>
            <p className="text-gray-600 mb-8 text-lg">Smart receipt tracking for India</p>
            
            <button
              onClick={signInDemo}
              className="w-full flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-lg"
            >
              <LogIn className="w-5 h-5 mr-3" />
              Continue with Demo
            </button>
            
            <p className="text-sm text-gray-500 mt-6">
              Demo mode - No registration required
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Receipt Manager</h1>
                <span className="text-xs text-gray-500 font-medium">Smart Receipt Tracking</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="relative p-2 hover:bg-blue-50 rounded-xl transition-all duration-200 group">
                <Bell className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              </button>
              <button className="p-2 hover:bg-blue-50 rounded-xl transition-all duration-200 group">
                <Settings className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
              </button>
              <button 
                onClick={signOut}
                className="p-2 hover:bg-red-50 rounded-xl transition-all duration-200 group"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5 text-gray-600 group-hover:text-red-600" />
              </button>
              <button className="p-2 hover:bg-blue-50 rounded-xl transition-all duration-200 group">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white/60 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center space-x-2 py-4 px-3 border-b-2 font-medium text-sm transition-all duration-200 rounded-t-lg ${
                  activeTab === item.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/30'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {uploading && (
          <div className="fixed top-20 right-4 bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="font-medium">Processing receipt...</span>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
                <p className="text-gray-600 mt-1">Welcome back! Here's your spending overview</p>
              </div>
              <button
                onClick={() => setShowUpload(true)}
                disabled={uploading}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Receipt
              </button>
            </div>

            <Dashboard
              insights={mockSpendingInsights}
              totalSpent={totalSpent}
              totalReceipts={receipts.length}
              monthlyBudget={monthlyBudget}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SpendingChart insights={mockSpendingInsights} />
              <BudgetAlerts alerts={mockBudgetAlerts} />
            </div>
          </div>
        )}

        {activeTab === 'receipts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Receipts</h2>
                <p className="text-gray-600 mt-1">Manage and organize your digital receipts</p>
              </div>
              <button
                onClick={() => setShowUpload(true)}
                disabled={uploading}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Receipt
              </button>
            </div>

            <SearchAndFilter
              onSearch={setSearchQuery}
              onFilter={setFilters}
            />

            {receiptsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white/80 rounded-2xl p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReceipts.map((receipt) => (
                  <ReceiptCard
                    key={receipt.id}
                    receipt={receipt}
                    onClick={setSelectedReceipt}
                  />
                ))}
              </div>
            )}

            {filteredReceipts.length === 0 && !receiptsLoading && (
              <div className="text-center py-16 bg-white/50 rounded-2xl border border-gray-100">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ReceiptIcon className="w-10 h-10 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No receipts found</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery || Object.values(filters).some(v => v) 
                    ? 'Try adjusting your search or filters.'
                    : 'Get started by adding your first receipt.'}
                </p>
                <button
                  onClick={() => setShowUpload(true)}
                  disabled={uploading}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Receipt
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Analytics</h2>
              <p className="text-gray-600 mt-1">Detailed insights into your spending patterns</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SpendingChart insights={mockSpendingInsights} />
              <BudgetAlerts alerts={mockBudgetAlerts} />
            </div>

            <Dashboard
              insights={mockSpendingInsights}
              totalSpent={totalSpent}
              totalReceipts={receipts.length}
              monthlyBudget={monthlyBudget}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {showUpload && (
        <ReceiptUpload
          onUpload={handleFileUpload}
          onClose={() => setShowUpload(false)}
          uploading={uploading}
        />
      )}
    </div>
  );
}

export default App;