import { useState, useEffect } from 'react';
import { Receipt } from '../types/receipt';
import { mockReceipts } from '../data/mockReceipts';
import { useAuth } from './useAuth';

export const useReceipts = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadReceipts();
    } else {
      setReceipts([]);
      setLoading(false);
    }
  }, [user]);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Load mock receipts for demo
      setReceipts(mockReceipts);
    } catch (error) {
      console.error('Error loading receipts:', error);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadReceipt = async (file: File) => {
    if (!user) return;

    try {
      setUploading(true);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Create new receipt from uploaded file
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
        userId: user.id
      };
      
      // Add to receipts list
      setReceipts(prev => [newReceipt, ...prev]);
      
      return newReceipt;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return {
    receipts,
    loading,
    uploading,
    handleUploadReceipt,
    loadReceipts
  };
};