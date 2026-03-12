export interface ReceiptItem {
  id?: string; // Make id optional (add the ?)
  name: string;
  price: number;
  quantity?: number;
}

export interface Receipt {
  id: string;
  merchant: string;
  amount: number;
  date: string;
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