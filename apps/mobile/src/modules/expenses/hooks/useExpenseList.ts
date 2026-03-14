import { useCallback, useState } from 'react';
import { createExpenseOffline, listExpensesForEvent } from '../expenseRepository';

export type ExpenseListItem = {
  id: string;
  title: string;
  amount: number;
  category: string;
  expenseDateMs: number;
  syncState: string;
};

export function useExpenseList() {
  const [eventId, setEventId] = useState('');
  const [items, setItems] = useState<ExpenseListItem[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listExpensesForEvent(eventId);
      setItems(data as unknown as ExpenseListItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const addExpense = useCallback(async () => {
    if (!eventId) {
      setError('Event ID required');
      return;
    }
    setError(null);
    const value = Number(amount);
    if (!value || Number.isNaN(value)) {
      setError('Amount must be a number');
      return;
    }
    setLoading(true);
    try {
      await createExpenseOffline({
        eventId,
        title: title || 'Expense',
        category,
        amount: value,
        expenseDate: new Date(),
      });
      setTitle('');
      setAmount('');
      const data = await listExpensesForEvent(eventId);
      setItems(data as unknown as ExpenseListItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [eventId, title, category, amount]);

  return {
    eventId,
    setEventId,
    items,
    title,
    setTitle,
    amount,
    setAmount,
    category,
    setCategory,
    error,
    loading,
    load,
    addExpense,
  };
}
