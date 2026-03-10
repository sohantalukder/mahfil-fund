'use client';

import { useMemo, useState } from 'react';
import { getApi } from '@/lib/api';
import type { ApiResponse } from '@mahfil/types';

type Expense = { id: string; title: string; amount: number; category: string; expenseDate: string };

export default function ExpensesPage() {
  const api = useMemo(() => getApi(), []);
  const [eventId, setEventId] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!eventId) return;
    setError(null);
    const params = new URLSearchParams({ eventId });
    if (search) params.set('search', search);
    const res: ApiResponse<{ expenses: Expense[] }> = await api.get(`/expenses?${params.toString()}`);
    if (!res.success) setError(res.error.message);
    else setExpenses(res.data.expenses);
  }

  return (
    <main className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Expense list</h1>
          <p>Light-mode list of expenses with search and filters.</p>
        </div>
        <div className="page-actions">
          <a className="btn btn-primary" href="/expenses/new">
            Add expense
          </a>
        </div>
      </div>

      <div className="toolbar">
        <input
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          placeholder="Event ID (UUID)"
        />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title/category" />
        <button className="btn" type="button" onClick={load}>
          Search
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 12, background: '#fef2f2', color: '#991b1b' }}>
          {error}
        </div>
      )}

      <div className="card">
        <div className="section-header">
          <div>
            <div className="section-title">Expenses</div>
            <div className="section-subtitle">All expenses for the selected event.</div>
          </div>
          <div className="badge">{expenses.length} results</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Amount (BDT)</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((x) => (
              <tr key={x.id}>
                <td>{x.title}</td>
                <td>{x.category}</td>
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

