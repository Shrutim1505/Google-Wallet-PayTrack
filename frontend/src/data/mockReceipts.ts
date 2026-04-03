import { Receipt } from '../types/receipt';

export const mockReceipts: Receipt[] = [
  {
    id: 'mock-1',
    merchant: 'ABC Supermarket',
    amount: 800,
    date: '2024-03-19',
    category: 'Food',
    items: [
      { name: 'Groceries', price: 500, quantity: 1 },
      { name: 'Vegetables', price: 300, quantity: 1 },
    ],
  },
];
