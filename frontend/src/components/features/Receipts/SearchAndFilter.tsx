import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { FilterOptions } from '../../../types/receipt';

interface SearchAndFilterProps {
  onSearch: (query: string) => void;
  onFilter: (filters: FilterOptions) => void;
  searchQuery: string;
  filters: FilterOptions;
}

export function SearchAndFilter({
  onSearch,
  onFilter,
  searchQuery,
  filters,
}: SearchAndFilterProps) {
  const [showFilters, setShowFilters] = React.useState(false);

  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health'];

  const handleCategoryChange = (category: string) => {
    onFilter({
      ...filters,
      category: filters.category === category ? '' : category,
    });
  };

  const handleMinAmountChange = (value: string) => {
    onFilter({
      ...filters,
      minAmount: value ? Number(value) : 0,
    });
  };

  const handleMaxAmountChange = (value: string) => {
    onFilter({
      ...filters,
      maxAmount: value ? Number(value) : 0,
    });
  };

  const handleMerchantChange = (value: string) => {
    onFilter({
      ...filters,
      merchant: value,
    });
  };

  const hasActiveFilters =
    filters.category || filters.minAmount > 0 || filters.maxAmount > 0 || filters.merchant;

  const resetFilters = () => {
    onFilter({
      category: '',
      dateRange: '',
      minAmount: 0,
      maxAmount: 0,
      merchant: '',
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search receipts by merchant, category, or item..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filter Button and Active Filters */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              Active
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear Filters
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          {/* Category Filter */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Category</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    filters.category === category
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-700 hover:border-blue-400'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Range Filter */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Amount</label>
              <input
                type="number"
                placeholder="0"
                value={filters.minAmount || ''}
                onChange={(e) => handleMinAmountChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Amount</label>
              <input
                type="number"
                placeholder="0"
                value={filters.maxAmount || ''}
                onChange={(e) => handleMaxAmountChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Merchant Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Merchant</label>
            <input
              type="text"
              placeholder="Search by merchant..."
              value={filters.merchant || ''}
              onChange={(e) => handleMerchantChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Close Button */}
          <button
            onClick={() => setShowFilters(false)}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}