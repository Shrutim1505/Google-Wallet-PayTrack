export interface Receipt {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  category: string;
  items: ReceiptItem[];
  notes?: string;
  imageUrl?: string;
}

export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ReceiptFilters {
  category?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface CreateReceiptInput {
  merchant: string;
  amount: number;
  date: string;
  category?: string;
  items?: Array<{ name: string; price?: number; quantity?: number }>;
  notes?: string;
}

export interface PaginatedReceipts {
  receipts: Receipt[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
