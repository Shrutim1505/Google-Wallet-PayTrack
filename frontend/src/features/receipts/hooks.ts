import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { receiptsApi } from './api';
import type { Receipt, ReceiptFilters, CreateReceiptInput } from './types';

export const receiptKeys = {
  all: ['receipts'] as const,
  lists: () => [...receiptKeys.all, 'list'] as const,
  list: (filters: ReceiptFilters) => [...receiptKeys.lists(), filters] as const,
  details: () => [...receiptKeys.all, 'detail'] as const,
  detail: (id: string) => [...receiptKeys.details(), id] as const,
};

export function useReceipts(filters: ReceiptFilters = {}) {
  return useQuery({
    queryKey: receiptKeys.list(filters),
    queryFn: () => receiptsApi.list(filters),
    staleTime: 60_000,
  });
}

export function useReceipt(id: string | undefined) {
  return useQuery({
    queryKey: receiptKeys.detail(id!),
    queryFn: () => receiptsApi.get(id!),
    enabled: !!id,
  });
}

export function useReceiptAIMetadata(id: string | undefined) {
  return useQuery({
    queryKey: [...receiptKeys.detail(id!), 'ai'],
    queryFn: () => receiptsApi.getAIMetadata(id!),
    enabled: !!id,
  });
}

export function useCorrectCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, category }: { id: string; category: string }) =>
      receiptsApi.correctCategory(id, category),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: receiptKeys.lists() });
      qc.invalidateQueries({ queryKey: receiptKeys.detail(updated.id) });
      toast.success('Category corrected — model retrained');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to correct category'),
  });
}

export function useCreateReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReceiptInput) => receiptsApi.create(input),
    onSuccess: (newReceipt) => {
      // Prepend to every cached list
      qc.setQueriesData<Receipt[]>({ queryKey: receiptKeys.lists() }, (old) =>
        old ? [newReceipt, ...old] : [newReceipt]
      );
      qc.invalidateQueries({ queryKey: receiptKeys.lists() });
      toast.success('Receipt added');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add receipt');
    },
  });
}

export function useUpdateReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateReceiptInput> }) =>
      receiptsApi.update(id, updates),
    onMutate: async ({ id, updates }) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: receiptKeys.lists() });
      const previousLists = qc.getQueriesData<Receipt[]>({ queryKey: receiptKeys.lists() });

      qc.setQueriesData<Receipt[]>({ queryKey: receiptKeys.lists() }, (old) =>
        old?.map((r) => (r.id === id ? { ...r, ...updates } as Receipt : r))
      );

      return { previousLists };
    },
    onError: (err: Error, _vars, ctx) => {
      ctx?.previousLists?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(err.message || 'Failed to update receipt');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: receiptKeys.lists() });
    },
    onSuccess: () => {
      toast.success('Receipt updated');
    },
  });
}

export function useDeleteReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => receiptsApi.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: receiptKeys.lists() });
      const previousLists = qc.getQueriesData<Receipt[]>({ queryKey: receiptKeys.lists() });

      qc.setQueriesData<Receipt[]>({ queryKey: receiptKeys.lists() }, (old) =>
        old?.filter((r) => r.id !== id)
      );

      return { previousLists };
    },
    onError: (err: Error, _id, ctx) => {
      ctx?.previousLists?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(err.message || 'Failed to delete receipt');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: receiptKeys.lists() });
    },
    onSuccess: () => {
      toast.success('Receipt deleted');
    },
  });
}

export function useUploadReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => receiptsApi.upload(file),
    onSuccess: (newReceipt) => {
      qc.setQueriesData<Receipt[]>({ queryKey: receiptKeys.lists() }, (old) =>
        old ? [newReceipt, ...old] : [newReceipt]
      );
      qc.invalidateQueries({ queryKey: receiptKeys.lists() });
      toast.success('Receipt processed');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Upload failed');
    },
  });
}

export function useExportReceiptsCsv() {
  return useMutation({
    mutationFn: async () => {
      const blob = await receiptsApi.exportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipts-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onError: () => toast.error('Export failed'),
    onSuccess: () => toast.success('Export ready'),
  });
}
