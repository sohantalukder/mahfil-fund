'use client';

import { useEffect, useMemo, useState } from 'react';
import { getApi } from '@/lib/api';
import { PageShell } from '../components/shell';

type Event = { id: string; name: string; year: number; isActive: boolean };

type EventSummary = {
  eventId: string;
  eventName: string;
  totalDonors: number;
  totalDonations: number;
  totalCollection: number;
  totalExpenses: number;
  balance: number;
  donationsByMethod?: Record<string, number>;
  expensesByCategory?: Record<string, number>;
};

const fmtBDT = (n: number) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(n);
const pct = (part: number, total: number) => total ? Math.round((part / total) * 100) : 0;

export default function AdminReportsPage() {
  const api = useMemo(() => getApi(), []);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState('');
  const [summary, setSummary] = useState<EventSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    api.get<{ events: Event[] }>('/events')
      .then((res) => {
        const list = res.success ? ((res.data as any).events ?? res.data ?? []) : [];
        setEvents(list);
        const active = list.find((e: Event) => e.isActive) || list[0];
        if (active) { setEventId(active.id); loadSummary(active.id); }
      })
      .catch(() => {})
      .finally(() => setEventsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSummary(id = eventId) {
    if (!id) return;
    setLoading(true); setError(null);
    const res = await api.get<EventSummary>(`/reports/event-summary?eventId=${id}`);
    setLoading(false);
    if (!res.success) { setError(res.error.message); return; }
    setSummary((res.data as any).summary ?? res.data);
  }

  const balanceColor = summary && summary.balance >= 0 ? '#059669' : '#dc2626';

  return (
    <PageShell
      title="Reports"
      subtitle="Financial summaries and statistics per event."
      actions={
        <select className="db-input" style={{ minWidth: 200 }} value={eventId}
          onChange={(e) => { setEventId(e.target.value); loadSummary(e.target.value); }}>
          {eventsLoading && <option value="">Loading…</option>}
          {!eventsLoading && events.length === 0 && <option value="">No events found</option>}
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.name}{ev.isActive ? ' (Active)' : ''}</option>
          ))}
        </select>
      }
    >
      {error && <div className="db-error">{error}</div>}

      {loading && <div className="db-empty">Loading report…</div>}

      {summary && !loading && (
        <>
          {/* Key metrics */}
          <div className="db-stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
            <div className="db-stat-card">
              <div className="db-stat-title">Total Collection</div>
              <div className="db-stat-value" style={{ color: '#059669' }}>{fmtBDT(summary.totalCollection)}</div>
            </div>
            <div className="db-stat-card">
              <div className="db-stat-title">Total Expenses</div>
              <div className="db-stat-value" style={{ color: '#dc2626' }}>{fmtBDT(summary.totalExpenses)}</div>
            </div>
            <div className="db-stat-card">
              <div className="db-stat-title">Net Balance</div>
              <div className="db-stat-value" style={{ color: balanceColor }}>{fmtBDT(summary.balance)}</div>
            </div>
            <div className="db-stat-card">
              <div className="db-stat-title">Total Donors</div>
              <div className="db-stat-value">{summary.totalDonors}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Collections by method */}
            {summary.donationsByMethod && Object.keys(summary.donationsByMethod).length > 0 && (
              <div className="db-table-card" style={{ padding: 20 }}>
                <div className="db-table-header" style={{ marginBottom: 16 }}>
                  <span className="db-table-title">Collections by Method</span>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {Object.entries(summary.donationsByMethod).map(([method, amount]) => {
                    const p = pct(amount, summary.totalCollection);
                    return (
                      <div key={method}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                          <span style={{ color: 'var(--db-td-em)', fontWeight: 500 }}>{method}</span>
                          <span style={{ color: 'var(--db-td)' }}>{fmtBDT(amount)} ({p}%)</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--db-bar-bg)', borderRadius: 3 }}>
                          <div style={{ height: '100%', width: `${p}%`, background: '#1a5c38', borderRadius: 3 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Expenses by category */}
            {summary.expensesByCategory && Object.keys(summary.expensesByCategory).length > 0 && (
              <div className="db-table-card" style={{ padding: 20 }}>
                <div className="db-table-header" style={{ marginBottom: 16 }}>
                  <span className="db-table-title">Expenses by Category</span>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {Object.entries(summary.expensesByCategory).map(([cat, amount]) => {
                    const p = pct(amount, summary.totalExpenses);
                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                          <span style={{ color: 'var(--db-td-em)', fontWeight: 500 }}>{cat}</span>
                          <span style={{ color: 'var(--db-td)' }}>{fmtBDT(amount)} ({p}%)</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--db-bar-bg)', borderRadius: 3 }}>
                          <div style={{ height: '100%', width: `${p}%`, background: '#dc2626', borderRadius: 3 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Summary table */}
          <div className="db-table-card" style={{ marginTop: 20 }}>
            <div className="db-table-header">
              <span className="db-table-title">Financial Summary — {summary.eventName}</span>
            </div>
            <table className="db-table">
              <tbody>
                <tr>
                  <td style={{ color: 'var(--db-td)' }}>Total Donations</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{summary.totalDonations}</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--db-td)' }}>Total Collection</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>{fmtBDT(summary.totalCollection)}</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--db-td)' }}>Total Expenses</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>{fmtBDT(summary.totalExpenses)}</td>
                </tr>
                <tr style={{ borderTop: '2px solid var(--db-card-bd)' }}>
                  <td style={{ fontWeight: 700, color: 'var(--db-td-em)' }}>Net Balance</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: balanceColor }}>{fmtBDT(summary.balance)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {!summary && !loading && !error && (
        <div className="db-empty">Select an event to view its report.</div>
      )}
    </PageShell>
  );
}
