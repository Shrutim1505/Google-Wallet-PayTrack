import { getTokenFromStorage, verifyToken } from './jwt';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiClient {
  private baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  private getAuthHeaders(): HeadersInit {
    const token = getTokenFromStorage();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      return {
        success: false,
        error: data?.message || 'An error occurred'
      };
    }

    return {
      success: true,
      data
    };
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error('API GET error:', error);
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error('API POST error:', error);
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }

  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error('API PUT error:', error);
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error('API DELETE error:', error);
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }

  // Auth-specific methods
  async login(credentials: { email: string; password: string }) {
    return this.post<{ user: any; token: string }>('/auth/login', credentials);
  }

  async register(credentials: { email: string; password: string; name: string }) {
    return this.post<{ user: any; token: string }>('/auth/register', credentials);
  }

  async logout() {
    return this.post('/auth/logout', {});
  }

  // Receipt-specific methods
  async getReceipts() {
    return this.get<any[]>('/receipts');
  }

  async uploadReceipt(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = getTokenFromStorage();
      const response = await fetch(`${this.baseURL}/receipts/upload`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: 'Upload failed'
      };
    }
  }

  async deleteReceipt(receiptId: string) {
    return this.delete(`/receipts/${receiptId}`);
  }

  // Spending insights
  async getSpendingInsights(timeRange: string = 'month') {
    return this.get(`/insights/spending?range=${timeRange}`);
  }

  // Verify token validity
  isTokenValid(): boolean {
    const token = getTokenFromStorage();
    if (!token) return false;

    const payload = verifyToken(token);
    return !!payload;
  }
}

export const apiClient = new ApiClient();