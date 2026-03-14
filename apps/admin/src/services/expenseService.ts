import type { ApiClient } from '@mahfil/api-sdk';
import type { Expense, ExpenseListResponse } from '@/types';

export type ExpenseListParams = {
  eventId?: string;
  page?: number;
  pageSize?: number;
  search?: string;
};

export type CreateExpenseInput = {
  eventId: string;
  title: string;
  category: string;
  amount: number;
  expenseDate: Date;
  paymentMethod: string;
  vendor?: string | null;
  note?: string | null;
};

export type UpdateExpenseInput = Partial<Omit<CreateExpenseInput, 'eventId'>>;

function buildParams(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  return p.toString();
}

function normalizeExpenseList(data: unknown): ExpenseListResponse {
  if (Array.isArray(data)) {
    return { expenses: data as Expense[], total: (data as Expense[]).length, totalPages: 1, page: 1 };
  }
  const d = data as { expenses?: Expense[]; total?: number; totalPages?: number; page?: number };
  return {
    expenses: d.expenses ?? [],
    total: d.total ?? 0,
    totalPages: Math.max(1, d.totalPages ?? 1),
    page: d.page ?? 1,
  };
}

export async function listExpenses(
  api: ApiClient,
  params: ExpenseListParams = {}
): Promise<ExpenseListResponse> {
  const qs = buildParams({
    eventId: params.eventId,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 25,
    search: params.search,
  });
  const res = await api.get(`/expenses?${qs}`);
  if (!res.success) throw new Error(res.error.message);
  return normalizeExpenseList(res.data);
}

export async function createExpense(
  api: ApiClient,
  input: CreateExpenseInput
): Promise<Expense> {
  const res = await api.post<Expense>('/expenses', input);
  if (!res.success) throw new Error(res.error.message);
  return res.data as Expense;
}

export async function updateExpense(
  api: ApiClient,
  id: string,
  input: UpdateExpenseInput
): Promise<Expense> {
  const res = await api.patch<Expense>(`/expenses/${id}`, input);
  if (!res.success) throw new Error(res.error.message);
  return res.data as Expense;
}

export async function deleteExpense(api: ApiClient, id: string): Promise<void> {
  const res = await api.delete(`/expenses/${id}`);
  if (!res.success) throw new Error(res.error.message);
}
