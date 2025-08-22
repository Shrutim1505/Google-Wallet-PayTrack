import { Receipt, SpendingInsight, BudgetAlert } from '../types/receipt';

export const mockReceipts: Receipt[] = [
  {
    id: '1',
    date: '2024-01-15',
    merchant: 'Big Bazaar',
    amount: 2847.50,
    category: 'Groceries',
    items: [
      { id: '1', name: 'Basmati Rice 5kg', quantity: 1, price: 450.00 },
      { id: '2', name: 'Toor Dal 1kg', quantity: 2, price: 180.00 },
      { id: '3', name: 'Vegetables', quantity: 1, price: 320.50 }
    ],
    imageUrl: 'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=300',
    paymentMethod: 'UPI',
    tax: 142.50,
    verified: true,
    tags: ['groceries', 'monthly-shopping'],
    createdAt: '2024-01-15T14:30:00Z'
  },
  {
    id: '2',
    date: '2024-01-14',
    merchant: 'Cafe Coffee Day',
    amount: 485.00,
    category: 'Food & Dining',
    items: [
      { id: '4', name: 'Cappuccino', quantity: 2, price: 180.00 },
      { id: '5', name: 'Sandwich', quantity: 1, price: 250.00 }
    ],
    paymentMethod: 'Credit Card',
    tax: 55.00,
    verified: true,
    tags: ['coffee', 'breakfast'],
    createdAt: '2024-01-14T08:15:00Z'
  },
  {
    id: '3',
    date: '2024-01-13',
    merchant: 'Indian Oil Petrol Pump',
    amount: 3500.00,
    category: 'Transportation',
    items: [
      { id: '6', name: 'Petrol', quantity: 35, price: 3500.00 }
    ],
    paymentMethod: 'UPI',
    verified: true,
    tags: ['fuel', 'commute'],
    createdAt: '2024-01-13T17:45:00Z'
  },
  {
    id: '4',
    date: '2024-01-12',
    merchant: 'Flipkart',
    amount: 12599.00,
    category: 'Shopping',
    items: [
      { id: '7', name: 'Wireless Headphones', quantity: 1, price: 8999.00 },
      { id: '8', name: 'Phone Case', quantity: 1, price: 1200.00 },
      { id: '9', name: 'USB Cable', quantity: 2, price: 800.00 }
    ],
    paymentMethod: 'UPI',
    tax: 1600.00,
    verified: true,
    tags: ['electronics', 'tech'],
    createdAt: '2024-01-12T11:20:00Z'
  },
  {
    id: '5',
    date: '2024-01-11',
    merchant: 'Apollo Pharmacy',
    amount: 1245.00,
    category: 'Health & Medical',
    items: [
      { id: '10', name: 'Vitamin D3', quantity: 1, price: 899.00 },
      { id: '11', name: 'Hand Sanitizer', quantity: 1, price: 150.00 }
    ],
    paymentMethod: 'Credit Card',
    tax: 196.00,
    verified: true,
    tags: ['pharmacy', 'health'],
    createdAt: '2024-01-11T16:30:00Z'
  }
];

export const mockSpendingInsights: SpendingInsight[] = [
  {
    category: 'Groceries',
    amount: 18765.50,
    percentage: 32.5,
    trend: 'up',
    change: 8.2
  },
  {
    category: 'Food & Dining',
    amount: 12480.00,
    percentage: 21.7,
    trend: 'down',
    change: -5.3
  },
  {
    category: 'Transportation',
    amount: 9840.00,
    percentage: 17.1,
    trend: 'stable',
    change: 1.2
  },
  {
    category: 'Shopping',
    amount: 7625.00,
    percentage: 13.3,
    trend: 'up',
    change: 12.8
  },
  {
    category: 'Health & Medical',
    amount: 5470.00,
    percentage: 9.5,
    trend: 'down',
    change: -3.7
  },
  {
    category: 'Entertainment',
    amount: 3410.00,
    percentage: 5.9,
    trend: 'stable',
    change: 0.5
  }
];

export const mockBudgetAlerts: BudgetAlert[] = [
  {
    id: '1',
    type: 'warning',
    category: 'Food & Dining',
    current: 12480.00,
    limit: 15000.00,
    message: 'You\'ve spent 81% of your monthly dining budget'
  },
  {
    id: '2',
    type: 'exceeded',
    category: 'Shopping',
    current: 7625.00,
    limit: 6000.00,
    message: 'You\'ve exceeded your shopping budget by ₹1,625'
  }
];