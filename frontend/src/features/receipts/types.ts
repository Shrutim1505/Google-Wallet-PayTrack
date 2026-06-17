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

export interface ReceiptAIMetadata {
  llmExtracted: {
    merchant: string;
    category: string;
    total: number;
    subtotal: number | null;
    tax: number | null;
    currency: string;
    paymentMethod: string | null;
    date: string;
    lineItems: Array<{ name: string; quantity: number; price: number }>;
    purchaseIntent: string | null;
    confidence: number;
  } | null;
  ocrExtracted: { vendor: string; amount: number; date: string; items: any[] } | null;
  discrepancies: Record<string, { llm: any; ocr: any } | any>;
  predictedCategory: string | null;
  confidence: number | null;
  modelSource: string | null;
  embeddingScore: number | null;
  fallbackReason: string | null;
  createdAt: string;
}
