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

export default function FinancialSummaryPage() {
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
          <h1>Financial summary</h1>
          <p>Light-mode breakdown of collection vs. expenses for a single event.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" type="button" disabled={!eventId || loading} onClick={load}>
            {loading ? 'Loading…' : 'Refresh summary'}
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

      <div className="layout-columns">
        <div className="card">
          <div className="section-header">
            <div>
              <div className="section-title">Cashflow</div>
              <div className="section-subtitle">High-level numbers for this Mahfil.</div>
            </div>
          </div>
          <div className="card-grid" style={{ marginTop: 8 }}>
            <div>
              <div className="card-title">Collection</div>
              <div className="card-value" style={{ fontSize: 20 }}>
                {formatCurrency(summary?.totalCollection ?? 0)}
              </div>
            </div>
            <div>
              <div className="card-title">Expenses</div>
              <div className="card-value" style={{ fontSize: 20 }}>
                {formatCurrency(summary?.totalExpenses ?? 0)}
              </div>
            </div>
            <div>
              <div className="card-title">Balance</div>
              <div className="card-value" style={{ fontSize: 20 }}>
                {formatCurrency(summary?.balance ?? 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-header">
            <div>
              <div className="section-title">Activity</div>
              <div className="section-subtitle">Donors, donations, and expenses.</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            <SummaryRow label="Total donors" value={summary?.totalDonors ?? 0} />
            <SummaryRow label="Donation count" value={summary?.totalDonationsCount ?? 0} />
            <SummaryRow label="Expense count" value={summary?.totalExpensesCount ?? 0} />
          </div>
        </div>
      </div>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0
  }).format(value);
}

