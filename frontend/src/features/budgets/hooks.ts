import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient, unwrap } from '@/shared/api/client';

export const BUDGET_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'] as const;
export const BUDGET_PERIODS = ['daily', 'weekly', 'monthly', 'yearly'] as const;

export interface BudgetStatus {
  id: string;
  category: string;
  budgetAmount: number;
  spent: number;
  percentage: number;
  period: string;
  alertEnabled: boolean;
  alertThreshold: number;
  isOverBudget: boolean;
  isNearThreshold: boolean;
}

export interface CreateBudgetInput {
  category: string;
  amount: number;
  period?: string;
  alertThreshold?: number;
}

export function useBudgetStatus() {
  return useQuery({
    queryKey: ['budgets', 'status'],
    queryFn: async () => {
      const r = await apiClient.get('/budgets/status');
      return unwrap<BudgetStatus[]>(r.data);
    },
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      const r = await apiClient.post('/budgets', input);
      return unwrap(r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget created');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to create budget'),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateBudgetInput> }) => {
      const r = await apiClient.put(`/budgets/${id}`, updates);
      return unwrap(r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget updated');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update budget'),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/budgets/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget deleted');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete budget'),
  });
}
