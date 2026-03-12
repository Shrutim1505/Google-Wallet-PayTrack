import React, { useState, useMemo } from 'react';
import { Header } from '../common/Header';
import { Navigation } from '../common/Navigation';
import { DashboardStats } from '../features/Dashboard/DashboardStats';
import { ReceiptUpload } from '../features/Receipts/ReceiptUpload';
import { SearchAndFilter } from '../features/Receipts/SearchAndFilter';
import { ReceiptModal } from '../features/Receipts/ReceiptModal';
import { useReceipts } from '../../hooks/useReceipts';
import { FilterOptions, Receipt } from '../../types/receipt';

type TabType = 'dashboard' | 'receipts' | 'analytics';

export function MainLayout() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    category: '',
    dateRange: '',
    minAmount: 0,
    maxAmount: 0,
    merchant: '',
  });

  const { receipts, handleUploadReceipt } = useReceipts();

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'receipts', label: 'Receipts' },
    { id: 'analytics', label: 'Analytics' },
  ];

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabType);
  };

  // Calculate stats
  const totalSpent = receipts.reduce((sum, r) => sum + r.amount, 0);
  const monthlyBudget = 50000;
  const budgetUsed = Math.round((totalSpent / monthlyBudget) * 100);

  // Filter receipts based on search and filters
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

      return (
        matchesSearch &&
        matchesCategory &&
        matchesMinAmount &&
        matchesMaxAmount &&
        matchesMerchant
      );
    });
  }, [receipts, searchQuery, filters]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header />
      <Navigation 
        items={navigationItems} 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
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
                  <p className="text-gray-500">No receipts yet</p>
                ) : (
                  <div className="space-y-3">
                    {receipts.slice(0, 5).map((receipt) => (
                      <div 
                        key={receipt.id} 
                        onClick={() => setSelectedReceipt(receipt)}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-all"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{receipt.merchant}</p>
                          <p className="text-sm text-gray-600">{receipt.category}</p>
                        </div>
                        <p className="font-semibold text-blue-600">₹{receipt.amount}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
                <div className="space-y-3">
                  {['Food', 'Transport', 'Shopping', 'Bills'].map((category) => {
                    const categoryAmount = receipts
                      .filter((r) => r.category === category)
                      .reduce((sum, r) => sum + r.amount, 0);
                    return (
                      <div key={category}>
                        <div className="flex justify-between mb-1">
                          <p className="text-sm font-medium text-gray-700">{category}</p>
                          <p className="text-sm text-gray-600">₹{categoryAmount}</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${totalSpent > 0 ? (categoryAmount / totalSpent) * 100 : 0}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
              <button 
                onClick={() => setShowUpload(true)}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium"
              >
                + Add Receipt
              </button>
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
                    : 'No receipts yet'}
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
                    <h3 className="font-semibold text-gray-900">{receipt.merchant}</h3>
                    <p className="text-sm text-gray-600 mt-2">{receipt.category}</p>
                    <p className="text-2xl font-bold text-blue-600 mt-4">₹{receipt.amount}</p>
                    <p className="text-xs text-gray-500 mt-3">{receipt.date}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Analytics</h2>
              <p className="text-gray-600 mt-1">Spending insights and trends</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-gray-600">📊 Analytics dashboard coming soon...</p>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showUpload && (
          <ReceiptUpload 
            onUpload={handleUploadReceipt}
            onClose={() => setShowUpload(false)}
          />
        )}

        {/* Receipt Details Modal */}
        {selectedReceipt && (
          <ReceiptModal 
            receipt={selectedReceipt}
            onClose={() => setSelectedReceipt(null)}
          />
        )}
      </main>
    </div>
  );
}