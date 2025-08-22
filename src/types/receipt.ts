export interface Receipt {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  items: ReceiptItem[];
  imageUrl?: string;
  paymentMethod: 'UPI' | 'Credit Card' | 'Debit Card' | 'Cash' | 'Net Banking';
  tax?: number;
  tip?: number;
  verified: boolean;
  tags: string[];
  createdAt: string;
  userId?: string;
}

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  category?: string;
}

export interface SpendingInsight {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

export interface BudgetAlert {
  id: string;
  type: 'warning' | 'exceeded' | 'approaching';
  category: string;
  current: number;
  limit: number;
  message: string;
}