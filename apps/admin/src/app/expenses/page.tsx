'use client';

import { useMemo, useState } from 'react';
import { getApi } from '@/lib/api';
import type { ApiResponse } from '@mahfil/types';

type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  expenseDate: string;
  status: string;
};

export default function AdminExpensesPage() {
  const api = useMemo(() => getApi(), []);
  const [eventId, setEventId] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ALL');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [eventIdError, setEventIdError] = useState<string | null>(null);

  async function load() {
    if (!eventId.trim()) {
      setEventIdError('Event ID is required to load expenses.');
      return;
    }
    setError(null);
    setEventIdError(null);
    const params = new URLSearchParams({ eventId });
    if (status !== 'ALL') params.set('status', status);
    const res: ApiResponse<{ expenses: Expense[] }> = await api.get(`/expenses?${params.toString()}`);
    if (!res.success) setError(res.error.message);
    else setExpenses(res.data.expenses);
  }

  return (
    <main className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Expense management</h1>
          <p>Admin-only portal to review and audit expenses for a given event.</p>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="field-input"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          placeholder="Event ID (UUID)"
        />
        <select
          className="field-select"
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active only</option>
          <option value="ARCHIVED">Archived only</option>
        </select>
        <button className="btn btn-primary" type="button" onClick={load}>
          Load
        </button>
      </div>

      {eventIdError && (
        <div className="alert alert-error" style={{ marginBottom: 12 }}>
          {eventIdError}
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="card">
        <div className="section-header">
          <div>
            <div className="section-title">Expenses</div>
            <div className="section-subtitle">All expenses for the selected event and status.</div>
          </div>
          <div className="badge">{expenses.length} results</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Amount (BDT)</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((x) => (
              <tr key={x.id}>
                <td>{x.title}</td>
                <td>{x.category}</td>
                <td>{x.status}</td>
                <td>{new Date(x.expenseDate).toLocaleDateString()}</td>
                <td style={{ textAlign: 'right' }}>{x.amount.toLocaleString('en-BD')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

