import { Receipt, SpendingInsight, BudgetAlert } from '../types/receipt';
import { mockReceipts, mockSpendingInsights, mockBudgetAlerts } from '../data/mockReceipts';
import { verifyToken, getTokenFromStorage } from './jwt';

// Mock API server with JWT authentication
class MockApiServer {
  private receipts: Receipt[] = [...mockReceipts];
  private insights: SpendingInsight[] = [...mockSpendingInsights];
  private alerts: BudgetAlert[] = [...mockBudgetAlerts];

  private isAuthenticated(): boolean {
    const token = getTokenFromStorage();
    if (!token) return false;

    const payload = verifyToken(token);
    return !!payload;
  }

  async getReceipts(): Promise<{ success: boolean; data?: Receipt[]; error?: string }> {
    if (!this.isAuthenticated()) {
      return { success: false, error: 'Unauthorized' };
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      data: [...this.receipts]
    };
  }

  async uploadReceipt(file: File): Promise<{ success: boolean; data?: Receipt; error?: string }> {
    if (!this.isAuthenticated()) {
      return { success: false, error: 'Unauthorized' };
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newReceipt: Receipt = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      merchant: 'Processed Receipt',
      amount: Math.floor(Math.random() * 5000) + 100,
      category: 'Groceries',
      items: [
        {
          id: Date.now().toString(),
          name: 'Processed Item',
          quantity: 1,
          price: Math.floor(Math.random() * 1000) + 50
        }
      ],
      paymentMethod: 'UPI',
      tax: Math.floor(Math.random() * 200) + 10,
      verified: false,
      tags: ['auto-processed'],
      createdAt: new Date().toISOString(),
      userId: 'demo-user-123'
    };

    this.receipts.unshift(newReceipt);
    
    return {
      success: true,
      data: newReceipt
    };
  }

  async deleteReceipt(id: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isAuthenticated()) {
      return { success: false, error: 'Unauthorized' };
    }

    const index = this.receipts.findIndex(r => r.id === id);
    if (index === -1) {
      return { success: false, error: 'Receipt not found' };
    }

    this.receipts.splice(index, 1);
    return { success: true };
  }

  async getSpendingInsights(): Promise<{ success: boolean; data?: SpendingInsight[]; error?: string }> {
    if (!this.isAuthenticated()) {
      return { success: false, error: 'Unauthorized' };
    }

    return {
      success: true,
      data: [...this.insights]
    };
  }

  async getBudgetAlerts(): Promise<{ success: boolean; data?: BudgetAlert[]; error?: string }> {
    if (!this.isAuthenticated()) {
      return { success: false, error: 'Unauthorized' };
    }

    return {
      success: true,
      data: [...this.alerts]
    };
  }

  async login(credentials: { email: string; password: string }): Promise<{ success: boolean; data?: { user: any; token: string }; error?: string }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (credentials.email === 'demo@example.com' && credentials.password === 'password') {
      const user = {
        id: 'demo-user-123',
        email: credentials.email,
        name: 'Demo User'
      };

      // In a real app, this would come from the server
      const token = 'mock-jwt-token-' + Date.now();

      return {
        success: true,
        data: { user, token }
      };
    }

    return {
      success: false,
      error: 'Invalid credentials'
    };
  }

  async register(credentials: { email: string; password: string; name: string }): Promise<{ success: boolean; data?: { user: any; token: string }; error?: string }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (credentials.email.includes('@')) {
      const user = {
        id: `user-${Date.now()}`,
        email: credentials.email,
        name: credentials.name
      };

      // In a real app, this would come from the server
      const token = 'mock-jwt-token-' + Date.now();

      return {
        success: true,
        data: { user, token }
      };
    }

    return {
      success: false,
      error: 'Invalid email address'
    };
  }

  async logout(): Promise<{ success: boolean; error?: string }> {
    // In a real app, this would invalidate the token on the server
    return { success: true };
  }
}

export const mockApiServer = new MockApiServer();