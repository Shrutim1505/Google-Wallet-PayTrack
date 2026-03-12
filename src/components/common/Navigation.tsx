import React from 'react';

interface NavigationItem {
  id: string;
  label: string;
}

interface NavigationProps {
  items: NavigationItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navigation({ items, activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="bg-white/60 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center space-x-2 py-4 px-3 border-b-2 font-medium text-sm transition-all duration-200 rounded-t-lg ${
                activeTab === item.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/30'
              }`}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}