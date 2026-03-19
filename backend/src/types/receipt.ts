import { ExpenseCategory } from './common';

export interface Receipt {
  id: string;
  userId: string;
  vendor: string;
  amount: number;
  currency: string;
  date: Date;
  category: ExpenseCategory;
  items: ReceiptItem[];
  imageUrl: string;
  notes?: string;
  tags: string[];
  ocrData?: OCRData;
  isManualEntry: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  category?: ExpenseCategory;
  tax?: number;
}

export interface OCRData {
  rawText: string;
  extractedData: {
    vendor?: string;
    date?: string;
    total?: number;
    items?: Array<{
      name: string;
      price: number;
    }>;
  };
  confidence: number;
  language: string;
}

export interface ReceiptFilter {
  category?: ExpenseCategory;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  vendor?: string;
  tags?: string[];
}