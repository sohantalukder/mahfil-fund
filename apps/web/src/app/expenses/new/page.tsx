'use client';

import { useMemo, useState } from 'react';
import { getApi } from '@/lib/api';
import type { ApiResponse } from '@mahfil/types';

type Expense = { id: string };

export default function AddExpensePage() {
  const api = useMemo(() => getApi(), []);
  const [eventId, setEventId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextFieldErrors: Record<string, string> = {};

    if (!eventId.trim()) nextFieldErrors.eventId = 'Event ID is required.';
    if (!title.trim()) nextFieldErrors.title = 'Title is required.';
    if (!category.trim()) nextFieldErrors.category = 'Category is required.';
    if (!amount.trim()) {
      nextFieldErrors.amount = 'Amount is required.';
    } else if (Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      nextFieldErrors.amount = 'Enter a valid amount greater than 0.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    try {
      const payload = {
        eventId,
        title,
        category,
        amount: Number(amount),
        expenseDate: expenseDate || new Date().toISOString()
      };
      const res: ApiResponse<{ expense: Expense }> = await api.post('/expenses', payload);
      if (!res.success) {
        setError(res.error.message);
      } else {
        setSuccess('Expense added successfully.');
        setTitle('');
        setCategory('');
        setAmount('');
        setExpenseDate('');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Add expense</h1>
          <p>Light-mode form to add a new expense for the active event.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card form">
        <div className="field">
          <label className="field-label" htmlFor="eventId">
            Event ID
          </label>
          <input
            id="eventId"
            className="field-input"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="Event ID (UUID)"
          />
          {fieldErrors.eventId && <p className="field-error">{fieldErrors.eventId}</p>}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            className="field-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short description"
          />
          {fieldErrors.title && <p className="field-error">{fieldErrors.title}</p>}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="category">
            Category
          </label>
          <input
            id="category"
            className="field-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Food, Venue"
          />
          {fieldErrors.category && <p className="field-error">{fieldErrors.category}</p>}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="amount">
            Amount (BDT)
          </label>
          <input
            id="amount"
            className="field-input"
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
          {fieldErrors.amount && <p className="field-error">{fieldErrors.amount}</p>}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="expenseDate">
            Date
          </label>
          <input
            id="expenseDate"
            className="field-input"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save expense'}
        </button>

        {success && (
          <div className="alert alert-success" style={{ marginTop: 4 }}>
            {success}
          </div>
        )}
        {error && (
          <div className="alert alert-error" style={{ marginTop: 4 }}>
            {error}
          </div>
        )}
      </form>
    </main>
  );
}

