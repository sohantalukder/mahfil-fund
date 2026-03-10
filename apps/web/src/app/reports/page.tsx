'use client';

import { useMemo, useState } from 'react';
import { getApi } from '@/lib/api';
import type { ApiResponse } from '@mahfil/types';

type EventSummary = {
  eventId: string;
  totalCollection: number;
  totalExpenses: number;
  balance: number;
  totalDonors: number;
  totalDonationsCount: number;
  totalExpensesCount: number;
};

export default function ReportsPage() {
  const api = useMemo(() => getApi(), []);
  const [eventId, setEventId] = useState('');
  const [summary, setSummary] = useState<EventSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const res: ApiResponse<{ summary: EventSummary }> = await api.get(
        `/reports/event-summary?eventId=${encodeURIComponent(eventId)}`
      );
      if (!res.success) {
        setError(res.error.message);
        setSummary(null);
      } else {
        const payload: any = res.data as any;
        const data: EventSummary = (payload.summary ?? payload) as EventSummary;
        setSummary(data);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Reports</h1>
          <p>Light-mode reports for donors, collections, and expenses.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" type="button" disabled={!eventId || loading} onClick={load}>
            {loading ? 'Loading…' : 'Generate summary'}
          </button>
        </div>
      </div>

      <div className="toolbar">
        <input
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          placeholder="Event ID (UUID)"
        />
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 12, background: '#fef2f2', color: '#991b1b' }}>
          {error}
        </div>
      )}

      <div className="section">
        <div className="section-header">
          <div>
            <div className="section-title">Financial summary</div>
            <div className="section-subtitle">Snapshot for exporting or sharing.</div>
          </div>
          <div className="page-actions">
            <button className="btn btn-ghost" type="button">
              Export CSV
            </button>
            <button className="btn btn-ghost" type="button">
              Export PDF
            </button>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total collection</td>
              <td>{formatCurrency(summary?.totalCollection ?? 0)}</td>
            </tr>
            <tr>
              <td>Total expenses</td>
              <td>{formatCurrency(summary?.totalExpenses ?? 0)}</td>
            </tr>
            <tr>
              <td>Balance</td>
              <td>{formatCurrency(summary?.balance ?? 0)}</td>
            </tr>
            <tr>
              <td>Donors</td>
              <td>{summary?.totalDonors ?? 0}</td>
            </tr>
            <tr>
              <td>Donation count</td>
              <td>{summary?.totalDonationsCount ?? 0}</td>
            </tr>
            <tr>
              <td>Expense count</td>
              <td>{summary?.totalExpensesCount ?? 0}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0
  }).format(value);
}

