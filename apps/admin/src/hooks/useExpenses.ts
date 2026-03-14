'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@/lib/query';
import { getApi } from '@/lib/api';
import { useCommunity } from '@/app/providers';
import {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  type ExpenseListParams,
  type CreateExpenseInput,
  type UpdateExpenseInput,
} from '@/services/expenseService';

export const EXPENSES_QUERY_KEY = 'expenses';

export function useExpenses(params: ExpenseListParams = {}) {
  const { activeCommunity } = useCommunity();
  const communityId = activeCommunity?.id ?? '';
  return useApiQuery(
    [
      EXPENSES_QUERY_KEY,
      communityId,
      params.eventId ?? '',
      params.page ?? 1,
      params.pageSize ?? 25,
      params.search ?? '',
    ],
    (api) => listExpenses(api, params),
    { enabled: !!communityId && !!params.eventId }
  );
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseInput) => createExpense(getApi(), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [EXPENSES_QUERY_KEY] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateExpenseInput }) =>
      updateExpense(getApi(), id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [EXPENSES_QUERY_KEY] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(getApi(), id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [EXPENSES_QUERY_KEY] });
    },
  });
}
