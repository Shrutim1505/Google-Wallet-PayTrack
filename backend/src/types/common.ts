export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export enum ExpenseCategory {
  FOOD = 'food',
  TRANSPORT = 'transport',
  UTILITIES = 'utilities',
  ENTERTAINMENT = 'entertainment',
  SHOPPING = 'shopping',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  GROCERIES = 'groceries',
  DINING = 'dining',
  FUEL = 'fuel',
  SUBSCRIPTION = 'subscription',
  HOUSING = 'housing',
  PERSONAL = 'personal',
  TRAVEL = 'travel',
  OTHER = 'other'
}