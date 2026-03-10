'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getApi } from '@/lib/api';
import { PageShell } from './components/shell';

type Event = { id: string; name: string; year: number; isActive: boolean };
type EventSummary = {
  eventId: string;
  totalCollection: number;
  totalExpenses: number;
  balance: number;
  totalDonors: number;
  totalDonationsCount: number;
  totalExpensesCount: number;
};
type Donation = { id: string; donorName?: string; amount: number; paymentMethod: string; donationDate: string; status?: string };

const CHART_DATA = [
  { month: 'Jan', collections: 1800, expenses: 1200 },
  { month: 'Feb', collections: 1600, expenses: 1400 },
  { month: 'Mar', collections: 2400, expenses: 1600 },
  { month: 'Apr', collections: 2000, expenses: 1200 },
  { month: 'May', collections: 2800, expenses: 1800 },
  { month: 'Jun', collections: 2200, expenses: 1800 },
];
const CHART_MAX = 3000;

const EXPENSE_CATS = [
  { name: 'Catering & Food', pct: 55, color: '#22c55e' },
  { name: 'Venue & Setup',   pct: 26, color: '#4ade80' },
  { name: 'Logistics',       pct: 15, color: '#86efac' },
  { name: 'Marketing',       pct: 5,  color: '#bbf7d0' },
];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(n);

export default function AdminDashboard() {
  const api = useMemo(() => getApi(), []);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeId, setActiveId] = useState('');
  const [summary, setSummary] = useState<EventSummary | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Load events on mount, auto-select active one
  useEffect(() => {
    api.get<{ events: Event[] }>('/events')
      .then((res) => {
        const list = res.success ? (res.data.events ?? (res.data as any) ?? []) : [];
        setEvents(list);
        const active = list.find((e: Event) => e.isActive) || list[0];
        if (active) { setActiveId(active.id); loadSummary(active.id); }
      })
      .catch(() => {})
      .finally(() => setEventsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSummary(id: string) {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const [sumRes, donRes] = await Promise.all([
        api.get<any>(`/reports/event-summary?eventId=${id}`),
        api.get<any>(`/donations?eventId=${id}&limit=5`),
      ]);
      if (sumRes.success) {
        const d = sumRes.data;
        setSummary((d.summary ?? d) as EventSummary);
      } else { setError(sumRes.error.message); }
      if (donRes.success) {
        const d = donRes.data;
        setDonations((d.donations ?? d ?? []) as Donation[]);
      }
    } finally { setLoading(false); }
  }

  const bal = summary?.balance ?? 0;

  return (
    <PageShell
      title="Dashboard Overview"
      subtitle="Welcome back — here's what's happening with the Iftar Mahfil."
      actions={
        <>
          <select
            className="db-input"
            style={{ minWidth: 160 }}
            value={activeId}
            onChange={(e) => { setActiveId(e.target.value); loadSummary(e.target.value); }}
          >
            {eventsLoading && <option value="">Loading events…</option>}
            {!eventsLoading && events.length === 0 && <option value="">No events found</option>}
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} {ev.isActive ? '(Active)' : ''}
              </option>
            ))}
          </select>
          <Link href="/expenses" className="db-btn">+ Add Expense</Link>
          <Link href="/donors" className="db-btn db-btn-primary">+ New Donation</Link>
        </>
      }
    >
      {error && <div className="db-error">{error}</div>}

      {/* Stat cards */}
      <div className="db-stat-grid">
        <div className="db-stat-card">
          <div className="db-stat-top">
            <div className="db-stat-icon">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="4" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              </svg>
            </div>
            <span className="db-stat-badge db-stat-badge-green">
              {loading ? '…' : `${summary?.totalDonationsCount ?? 0} txns`}
            </span>
          </div>
          <div className="db-stat-title">Total Collections</div>
          <div className="db-stat-value">{loading ? '—' : fmt(summary?.totalCollection ?? 0)}</div>
        </div>

        <div className="db-stat-card">
          <div className="db-stat-top">
            <div className="db-stat-icon" style={{ color: '#f59e0b' }}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 4h12l-1.5 8H3.5L2 4z" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="5.5" cy="14" r="1" /><circle cx="10.5" cy="14" r="1" />
              </svg>
            </div>
            <span className="db-stat-badge db-stat-badge-red">
              {loading ? '…' : `${summary?.totalExpensesCount ?? 0} items`}
            </span>
          </div>
          <div className="db-stat-title">Total Expenses</div>
          <div className="db-stat-value">{loading ? '—' : fmt(summary?.totalExpenses ?? 0)}</div>
        </div>

        <div className="db-stat-card">
          <div className="db-stat-top">
            <div className="db-stat-icon" style={{ color: '#60a5fa' }}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              </svg>
            </div>
            <span className={`db-stat-badge ${bal >= 0 ? 'db-stat-badge-green' : 'db-stat-badge-red'}`}>
              {loading ? '…' : (bal >= 0 ? 'Surplus' : 'Deficit')}
            </span>
          </div>
          <div className="db-stat-title">Current Balance</div>
          <div className="db-stat-value">{loading ? '—' : fmt(bal)}</div>
        </div>

        <div className="db-stat-card">
          <div className="db-stat-top">
            <div className="db-stat-icon">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="5" r="3" />
                <path d="M2 13c0-3.3 2.7-6 6-6s6 2.7 6 6H2z" />
              </svg>
            </div>
            <span className="db-stat-badge db-stat-badge-blue">Donors</span>
          </div>
          <div className="db-stat-title">Total Donors</div>
          <div className="db-stat-value">{loading ? '—' : (summary?.totalDonors ?? 0)}</div>
        </div>
      </div>

      {/* Chart + Categories */}
      <div className="db-bottom-row">
        <div className="db-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="db-card-title">Collection vs Expenses</div>
              <div className="db-card-subtitle">Monthly breakdown for 2024</div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--db-subtitle)', background: 'var(--db-srch-bg)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--db-srch-bd)' }}>
              Last 6 Months
            </span>
          </div>
          <div className="db-chart-wrap">
            {CHART_DATA.map((d) => (
              <div key={d.month} className="db-chart-group">
                <div className="db-chart-bars">
                  <div className="db-bar db-bar-collections" style={{ height: `${(d.collections / CHART_MAX) * 110}px` }} />
                  <div className="db-bar db-bar-expenses"    style={{ height: `${(d.expenses    / CHART_MAX) * 110}px` }} />
                </div>
                <div className="db-chart-month">{d.month}</div>
              </div>
            ))}
          </div>
          <div className="db-chart-legend">
            <div className="db-legend-item"><div className="db-legend-dot" style={{ background: '#22c55e' }} />Collections</div>
            <div className="db-legend-item"><div className="db-legend-dot" style={{ background: '#f59e0b' }} />Expenses</div>
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-title">Expense Categories</div>
          <div style={{ height: 16 }} />
          <div className="db-cat-list">
            {EXPENSE_CATS.map((cat) => {
              const total = summary?.totalExpenses ?? 0;
              const amt = Math.round(total * cat.pct / 100);
              return (
                <div key={cat.name} className="db-cat-row">
                  <div className="db-cat-header">
                    <span className="db-cat-name">{cat.name}</span>
                    <span className="db-cat-amount">{total > 0 ? fmt(amt) : '—'}</span>
                  </div>
                  <div className="db-cat-track">
                    <div className="db-cat-fill" style={{ width: `${cat.pct}%`, background: cat.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <Link href="/reports" className="db-download-btn">Download Full Expense Report</Link>
        </div>
      </div>

      {/* Recent donations */}
      <div className="db-table-card">
        <div className="db-table-header">
          <span className="db-table-title">Recent Donations</span>
          <Link href="/donors" className="db-view-all">View All</Link>
        </div>
        {donations.length === 0 && !loading ? (
          <div className="db-empty">
            {activeId ? 'No donations found for this event.' : 'Select an event above to load data.'}
          </div>
        ) : (
          <table className="db-table">
            <thead>
              <tr>
                <th>Donor</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d) => {
                const initials = (d.donorName || 'DN').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <tr key={d.id}>
                    <td>
                      <div className="db-donor-cell">
                        <div className="db-donor-avatar">{initials}</div>
                        <span style={{ color: 'var(--db-td-em)' }}>{d.donorName || 'Unknown'}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--db-td-em)', fontWeight: 600 }}>{fmt(d.amount)}</td>
                    <td>{d.paymentMethod}</td>
                    <td>{new Date(d.donationDate).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </PageShell>
  );
}
