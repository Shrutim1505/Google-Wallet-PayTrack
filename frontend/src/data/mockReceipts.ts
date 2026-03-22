export interface ReceiptItem {
  id?: string;
  name: string;
  price: number;
  quantity?: number;
}

export interface Receipt {
  id: string;
  merchant: string;
  amount: number;
  date: string; // Change from Date to string
  category: string;
  items: ReceiptItem[];
}

export interface SpendingInsight {
  category: string;
  amount: number;
  percentage: number;
}

export interface BudgetAlert {
  id: string;
  message: string;
  type: 'warning' | 'critical';
}

export interface FilterOptions {
  category?: string;
  dateRange?: string;
  minAmount: number;
  maxAmount: number;
  merchant?: string;
}