'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
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

const NAV_LINKS = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <rect x="1" y="1" width="6" height="6" rx="1.5" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <rect x="1" y="10" width="3" height="5" rx="0.5" />
        <rect x="6" y="6" width="3" height="9" rx="0.5" />
        <rect x="11" y="2" width="3" height="13" rx="0.5" />
      </svg>
    ),
  },
  {
    href: '/donors',
    label: 'Donors',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <circle cx="8" cy="5" r="3" />
        <path d="M2 13c0-3.3 2.7-6 6-6s6 2.7 6 6H2z" />
      </svg>
    ),
  },
  {
    href: '/donations',
    label: 'Donations',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <rect x="1" y="4" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5 8h6M5 11h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    href: '/expenses',
    label: 'Expenses',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <path d="M2 4h12l-1.5 8H3.5L2 4z" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="5.5" cy="14" r="1" />
        <circle cx="10.5" cy="14" r="1" />
        <path d="M1 2h2l.5 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <rect x="2" y="2" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5 10V7M8 10V5M11 10V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
];

const CHART_DATA = [
  { month: 'Jan', collections: 1800, expenses: 1200 },
  { month: 'Feb', collections: 1600, expenses: 1400 },
  { month: 'Mar', collections: 2400, expenses: 1600 },
  { month: 'Apr', collections: 2000, expenses: 1200 },
  { month: 'May', collections: 2800, expenses: 1800 },
  { month: 'Jun', collections: 2200, expenses: 1800 },
];

const CHART_MAX = 3000;

const EXPENSE_CATEGORIES = [
  { name: 'Catering & Food', amount: '$4,500', pct: 55, color: '#22c55e' },
  { name: 'Venue & Setup', amount: '$2,100', pct: 26, color: '#4ade80' },
  { name: 'Logistics', amount: '$1,200', pct: 15, color: '#86efac' },
  { name: 'Marketing', amount: '$400', pct: 5, color: '#bbf7d0' },
];

export default function DashboardPage() {
  const api = useMemo(() => getApi(), []);
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<EventSummary | null>(null);
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

  const balancePositive = (summary?.balance ?? 0) >= 0;

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <div className="db-shell">
      {/* Sidebar */}
      <aside className="db-sidebar">
        <div className="db-sidebar-brand">
          <div className="db-sidebar-icon">🕌</div>
          <div className="db-sidebar-brand-text">
            <span className="db-sidebar-brand-name">Mahfil Fund</span>
            <span className="db-sidebar-brand-role">Member Portal</span>
          </div>
        </div>

        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={'db-nav-link' + (link.href === '/dashboard' ? ' active' : '')}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}

        <div className="db-sidebar-spacer" />

        <div className="db-target-box">
          <div className="db-target-label">Target Progress</div>
          <div className="db-target-bar-track">
            <div className="db-target-bar-fill" style={{ width: '75%' }} />
          </div>
          <div className="db-target-caption">75% of Ramadan Goal</div>
        </div>
      </aside>

      {/* Main */}
      <div className="db-main">
        {/* Top bar */}
        <header className="db-topbar">
          <div className="db-search">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="#4d6e52">
              <circle cx="6.5" cy="6.5" r="5" stroke="#4d6e52" strokeWidth="1.5" fill="none" />
              <line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="#4d6e52" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              placeholder="Search donors, transactions or reports…"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </div>
          <div className="db-topbar-spacer" />
          <button className="db-icon-btn" type="button" aria-label="Notifications">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a5 5 0 0 0-5 5v3l-1.5 2H14.5L13 9V6a5 5 0 0 0-5-5z" />
              <path d="M6.5 14a1.5 1.5 0 0 0 3 0H6.5z" />
            </svg>
          </button>
          <button className="db-icon-btn" type="button" aria-label="Calendar">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <line x1="5" y1="1.5" x2="5" y2="5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="11" y1="1.5" x2="11" y2="5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
          <div className="db-topbar-user">
            <div className="db-topbar-user-text">
              <span className="db-topbar-user-name">Mahfil Member</span>
              <span className="db-topbar-user-role">Donor Portal</span>
            </div>
            <div className="db-avatar">MF</div>
          </div>
        </header>

        {/* Content */}
        <div className="db-content">
          {/* Page header */}
          <div className="db-page-header">
            <div>
              <div className="db-page-title">Dashboard Overview</div>
              <div className="db-page-subtitle">
                {summary
                  ? `Event: ${summary.eventId}`
                  : 'Enter an event ID in the search bar and press Enter to load live data.'}
              </div>
            </div>
            <div className="db-header-actions">
              {summary && (
                <button
                  className="db-btn"
                  type="button"
                  onClick={() => { setSummary(null); setEventId(''); }}
                >
                  Clear
                </button>
              )}
              <button
                className="db-btn db-btn-primary"
                type="button"
                disabled={!eventId || loading}
                onClick={load}
              >
                {loading ? 'Loading…' : 'Load Summary'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', fontSize: 13 }}>
              {error}
            </div>
          )}

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
                <span className="db-stat-badge db-stat-badge-green">BDT</span>
              </div>
              <div className="db-stat-title">Total Collections</div>
              <div className="db-stat-value">{fmt(summary?.totalCollection ?? 0)}</div>
            </div>

            <div className="db-stat-card">
              <div className="db-stat-top">
                <div className="db-stat-icon" style={{ color: '#f59e0b' }}>
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2 4h12l-1.5 8H3.5L2 4z" fill="none" stroke="currentColor" strokeWidth="1.4" />
                    <circle cx="5.5" cy="14" r="1" />
                    <circle cx="10.5" cy="14" r="1" />
                    <path d="M1 2h2l.5 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                  </svg>
                </div>
                <span className="db-stat-badge db-stat-badge-red">BDT</span>
              </div>
              <div className="db-stat-title">Total Expenses</div>
              <div className="db-stat-value">{fmt(summary?.totalExpenses ?? 0)}</div>
            </div>

            <div className="db-stat-card">
              <div className="db-stat-top">
                <div className="db-stat-icon" style={{ color: '#60a5fa' }}>
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                  </svg>
                </div>
                <span className={`db-stat-badge ${balancePositive ? 'db-stat-badge-green' : 'db-stat-badge-red'}`}>
                  {balancePositive ? 'Surplus' : 'Deficit'}
                </span>
              </div>
              <div className="db-stat-title">Current Balance</div>
              <div className="db-stat-value">{fmt(summary?.balance ?? 0)}</div>
            </div>

            <div className="db-stat-card">
              <div className="db-stat-top">
                <div className="db-stat-icon">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="6" cy="5" r="2.5" />
                    <circle cx="11" cy="5" r="2" />
                    <path d="M1 13c0-2.8 2.2-5 5-5s5 2.2 5 5H1z" />
                    <path d="M11 8c1.7.4 3 1.9 3 3.7v1.3h-2.5" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                </div>
                <span className="db-stat-badge db-stat-badge-blue">{summary?.totalDonationsCount ?? 0} txns</span>
              </div>
              <div className="db-stat-title">Total Donors</div>
              <div className="db-stat-value">{summary?.totalDonors ?? 0}</div>
            </div>
          </div>

          {/* Chart + Categories row */}
          <div className="db-bottom-row">
            <div className="db-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="db-card-title">Collection vs Expenses</div>
                  <div className="db-card-subtitle">Monthly breakdown for 2024</div>
                </div>
                <span style={{ fontSize: 11, color: '#5a7d62', background: '#1e3226', padding: '3px 8px', borderRadius: 6 }}>
                  Last 6 Months
                </span>
              </div>
              <div className="db-chart-wrap">
                {CHART_DATA.map((d) => (
                  <div key={d.month} className="db-chart-group">
                    <div className="db-chart-bars">
                      <div
                        className="db-bar db-bar-collections"
                        style={{ height: `${(d.collections / CHART_MAX) * 110}px` }}
                      />
                      <div
                        className="db-bar db-bar-expenses"
                        style={{ height: `${(d.expenses / CHART_MAX) * 110}px` }}
                      />
                    </div>
                    <div className="db-chart-month">{d.month}</div>
                  </div>
                ))}
              </div>
              <div className="db-chart-legend">
                <div className="db-legend-item">
                  <div className="db-legend-dot" style={{ background: '#22c55e' }} />
                  Collections
                </div>
                <div className="db-legend-item">
                  <div className="db-legend-dot" style={{ background: '#f59e0b' }} />
                  Expenses
                </div>
              </div>
            </div>

            <div className="db-card">
              <div className="db-card-title">Expense Categories</div>
              <div style={{ height: 16 }} />
              <div className="db-cat-list">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <div key={cat.name} className="db-cat-row">
                    <div className="db-cat-header">
                      <span className="db-cat-name">{cat.name}</span>
                      <span className="db-cat-amount">{cat.amount}</span>
                    </div>
                    <div className="db-cat-track">
                      <div
                        className="db-cat-fill"
                        style={{ width: `${cat.pct}%`, background: cat.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/reports" className="db-download-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Download Full Expense Report
              </Link>
            </div>
          </div>

          {/* Summary counts */}
          {summary && (
            <div className="db-table-card">
              <div className="db-table-header">
                <span className="db-table-title">Event Summary</span>
                <Link href="/donations" className="db-view-all">View All Donations</Link>
              </div>
              <table className="db-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total Collections</td>
                    <td style={{ color: '#e8f0e9', fontWeight: 500 }}>{fmt(summary.totalCollection)}</td>
                  </tr>
                  <tr>
                    <td>Total Expenses</td>
                    <td style={{ color: '#e8f0e9', fontWeight: 500 }}>{fmt(summary.totalExpenses)}</td>
                  </tr>
                  <tr>
                    <td>Balance</td>
                    <td>
                      <span className={balancePositive ? 'db-status-confirmed' : 'db-status-pending'}>
                        {fmt(summary.balance)}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Total Donors</td>
                    <td style={{ color: '#e8f0e9', fontWeight: 500 }}>{summary.totalDonors}</td>
                  </tr>
                  <tr>
                    <td>Donations Count</td>
                    <td style={{ color: '#e8f0e9', fontWeight: 500 }}>{summary.totalDonationsCount}</td>
                  </tr>
                  <tr>
                    <td>Expenses Count</td>
                    <td style={{ color: '#e8f0e9', fontWeight: 500 }}>{summary.totalExpensesCount}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {!summary && (
            <div className="db-table-card">
              <div className="db-table-header">
                <span className="db-table-title">Recent Donations</span>
                <Link href="/donations" className="db-view-all">View All</Link>
              </div>
              <div style={{ padding: '32px 20px', textAlign: 'center', color: '#4d6e52', fontSize: 13 }}>
                Enter an event ID above and press &ldquo;Load Summary&rdquo; to see live data.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
