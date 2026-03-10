'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getApi } from '@/lib/api';
import { useApiQuery } from '@/lib/query';
import { PageShell } from './components/shell';
import { Skeleton } from './components/ui/skeleton';
import { Button } from './components/ui/button';

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
type ExpenseForChart = { id: string; category: string; amount: number };

const fmtBDT = (n: number) =>
  `৳ ${new Intl.NumberFormat('en-BD', {
    maximumFractionDigits: 0,
  }).format(n)}`;

export default function AdminDashboard() {
  const api = useMemo(() => getApi(), []);
  const [activeId, setActiveId] = useState('');

  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
  } = useApiQuery<{ events: Event[] }>(
    ['events'],
    (client) =>
      client.get<{ events: Event[] }>('/events').then((res) => {
        if (!res.success) {
          throw new Error(res.error.message);
        }
        const data = res.data as { events?: Event[] } | Event[];
        const list = Array.isArray(data) ? data : (data.events ?? []);
        return { events: list };
      }),
  );

  useEffect(() => {
    if (!activeId && eventsData?.events?.length) {
      const list = eventsData.events;
      const active = list.find((e) => e.isActive) || list[0];
      if (active) setActiveId(active.id);
    }
  }, [activeId, eventsData]);

  const {
    data: summaryAndDonations,
    isLoading: summaryLoading,
    error: summaryError,
  } = useApiQuery<{ summary: EventSummary | null; donations: Donation[] }>(
    ['event-summary', activeId],
    async (client) => {
      if (!activeId) {
        return { summary: null, donations: [] };
      }
      const [sumRes, donRes] = await Promise.all([
        client.get<any>(`/reports/event-summary?eventId=${activeId}`),
        client.get<any>(`/donations?eventId=${activeId}&limit=5`),
      ]);

      if (!sumRes.success) {
        throw new Error(sumRes.error.message);
      }

      const sumData = sumRes.data;
      const summary = (sumData.summary ?? sumData) as EventSummary;

      let donations: Donation[] = [];
      if (donRes.success) {
        const d = donRes.data as any;
        const raw = (d.donations ?? d ?? []) as any[];
        donations = raw.map((item) => ({
          id: item.id,
          donorName: item.donorSnapshotName ?? item.donorName ?? 'Unknown',
          amount: item.amount,
          paymentMethod: item.paymentMethod,
          donationDate: item.donationDate,
          status: item.status,
        }));
      }

      return { summary, donations };
    },
    {
      enabled: !!activeId,
    },
  );

  const events = eventsData?.events ?? [];
  const summary = summaryAndDonations?.summary ?? null;
  const donations = summaryAndDonations?.donations ?? [];
  const loading = summaryLoading;
  const error = eventsError?.message ?? summaryError?.message ?? null;

  const {
    data: expensesData,
    isLoading: expensesLoading,
    error: expensesError,
  } = useApiQuery<{ expenses: ExpenseForChart[] }>(
    ['event-expenses', activeId],
    async (client) => {
      if (!activeId) {
        return { expenses: [] };
      }

      const res = await client.get<any>(`/expenses?eventId=${activeId}`);
      if (!res.success) {
        throw new Error(res.error.message);
      }

      const d = res.data as any;
      const raw = (d.expenses ?? d ?? []) as any[];
      const expenses: ExpenseForChart[] = raw.map((item) => ({
        id: item.id,
        category: item.category || 'Uncategorized',
        amount: item.amount,
      }));

      return { expenses };
    },
    {
      enabled: !!activeId,
    },
  );

  const bal = summary?.balance ?? 0;
  const expenses = expensesData?.expenses ?? [];

  const totalExpensesForChart = expenses.reduce((sum, x) => sum + x.amount, 0);

  const categoryTotals = expenses.reduce<Record<string, number>>((acc, curr) => {
    const key = curr.category || 'Uncategorized';
    acc[key] = (acc[key] ?? 0) + curr.amount;
    return acc;
  }, {});

  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  const PIE_COLORS = ['#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#34d399', '#10b981', '#6ee7b7'];

  const categoryWithMeta = categoryEntries.map(([name, amount], index) => {
    const pct = totalExpensesForChart > 0 ? Math.round((amount / totalExpensesForChart) * 100) : 0;
    const color = PIE_COLORS[index % PIE_COLORS.length];
    return { name, amount, pct, color };
  });

  let pieGradient = '';
  if (totalExpensesForChart > 0 && categoryWithMeta.length > 0) {
    let currentAngle = 0;
    const segments: string[] = [];
    categoryWithMeta.forEach((cat, idx) => {
      const angle = (cat.amount / totalExpensesForChart) * 360;
      const start = currentAngle;
      const end = currentAngle + angle;
      currentAngle = end;
      segments.push(`${cat.color} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`);
    });
    pieGradient = `conic-gradient(${segments.join(', ')})`;
  }

  return (
    <PageShell
      title="Dashboard Overview"
      subtitle="Welcome back — here's what's happening with the Iftar Mahfil."
      actions={
        <>
          {eventsLoading ? (
            <Skeleton className="h-9 w-40 rounded-md" />
          ) : (
            <select
              className="db-input"
              style={{ minWidth: 160 }}
              value={activeId}
              onChange={(e) => { setActiveId(e.target.value); }}
            >
              {events.length === 0 && <option value="">No events found</option>}
              {events.map((ev: Event) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} {ev.isActive ? '(Active)' : ''}
                </option>
              ))}
            </select>
          )}
          <Button variant="outline">
            <Link href="/expenses">+ Add Expense</Link>
          </Button>
          <Button>
            <Link href="/donations">+ New Donation</Link>
          </Button>
        </>
      }
    >
      {(error || expensesError) && <div className="db-error">{error || expensesError?.message}</div>}

      {/* Stat cards */}
      <div className="db-stat-grid animate-page">
        {summaryLoading ? (
          <>
            <Skeleton className="h-28 rounded-xl bg-neutral-100" />
            <Skeleton className="h-28 rounded-xl bg-neutral-100" />
            <Skeleton className="h-28 rounded-xl bg-neutral-100" />
            <Skeleton className="h-28 rounded-xl bg-neutral-100" />
          </>
        ) : (
          <>
            <div className="db-stat-card animate-card">
              <div className="db-stat-top">
                <div className="db-stat-icon">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="1" y="4" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                  </svg>
                </div>
                <span className="db-stat-badge db-stat-badge-green">
                  {`${summary?.totalDonationsCount ?? 0} txns`}
                </span>
              </div>
              <div className="db-stat-title">Total Collections</div>
              <div className="db-stat-value">{fmtBDT(summary?.totalCollection ?? 0)}</div>
            </div>

            <div className="db-stat-card animate-card">
              <div className="db-stat-top">
                <div className="db-stat-icon" style={{ color: '#f59e0b' }}>
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2 4h12l-1.5 8H3.5L2 4z" fill="none" stroke="currentColor" strokeWidth="1.4" />
                    <circle cx="5.5" cy="14" r="1" /><circle cx="10.5" cy="14" r="1" />
                  </svg>
                </div>
                <span className="db-stat-badge db-stat-badge-red">
                  {`${summary?.totalExpensesCount ?? 0} items`}
                </span>
              </div>
              <div className="db-stat-title">Total Expenses</div>
              <div className="db-stat-value">{fmtBDT(summary?.totalExpenses ?? 0)}</div>
            </div>

            <div className="db-stat-card animate-card">
              <div className="db-stat-top">
                <div className="db-stat-icon" style={{ color: '#60a5fa' }}>
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                  </svg>
                </div>
                <span className={`db-stat-badge ${bal >= 0 ? 'db-stat-badge-green' : 'db-stat-badge-red'}`}>
                  {bal >= 0 ? 'Surplus' : 'Deficit'}
                </span>
              </div>
              <div className="db-stat-title">Current Balance</div>
              <div className="db-stat-value">{fmtBDT(bal)}</div>
            </div>

            <div className="db-stat-card animate-card">
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
              <div className="db-stat-value">{summary?.totalDonors ?? 0}</div>
            </div>
          </>
        )}
      </div>

      {/* Expense breakdown */}
      <div className="db-bottom-row animate-page">
        <div className="db-card animate-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="db-card-title">Expense Breakdown</div>
              <div className="db-card-subtitle">By category for the selected event</div>
            </div>
          </div>
          <div className="db-pie-wrap">
            {expensesLoading ? (
              <Skeleton className="h-40 w-40 rounded-full bg-neutral-100" />
            ) : totalExpensesForChart <= 0 || categoryWithMeta.length === 0 ? (
              <div className="db-empty" style={{ padding: 32 }}>
                No expense data available for this event.
              </div>
            ) : (
              <div className="db-pie" style={{ backgroundImage: pieGradient || undefined }}>
                <div className="db-pie-inner">
                  <div className="db-pie-label">Total Expenses</div>
                  <div className="db-pie-value">
                    {fmtBDT(summary?.totalExpenses ?? totalExpensesForChart)}
                  </div>
                </div>
              </div>
            )}
          </div>
          {categoryWithMeta.length > 0 && (
            <div className="db-chart-legend">
              {categoryWithMeta.map((cat) => (
                <div key={cat.name} className="db-legend-item">
                  <div className="db-legend-dot" style={{ background: cat.color }} />
                  <span>{cat.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--db-subtitle)' }}>{cat.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="db-card animate-card">
          <div className="db-card-title">Expense Categories</div>
          <div style={{ height: 16 }} />
          <div className="db-cat-list">
            {(expensesLoading && categoryWithMeta.length === 0) ? (
              <div className="db-empty" style={{ padding: 24 }}>
                Loading categories…
              </div>
            ) : categoryWithMeta.length === 0 ? (
              <div className="db-empty" style={{ padding: 24 }}>
                No categorized expenses for this event.
              </div>
            ) : (
              categoryWithMeta.map((cat) => (
                <div key={cat.name} className="db-cat-row">
                  <div className="db-cat-header">
                    <span className="db-cat-name">{cat.name}</span>
                    <span className="db-cat-amount">
                      {fmtBDT(cat.amount)} ({cat.pct}%)
                    </span>
                  </div>
                  <div className="db-cat-track">
                    <div className="db-cat-fill" style={{ width: `${cat.pct}%`, background: cat.color }} />
                  </div>
                </div>
              ))
            )}
          </div>
          {categoryWithMeta.length > 0 && (
            <Link href="/reports" className="db-download-btn">
              Download Full Expense Report
            </Link>
          )}
        </div>
      </div>

      {/* Recent donations */}
      <div className="db-table-card animate-card">
        <div className="db-table-header">
          <span className="db-table-title">Recent Donations</span>
          <Link href="/donors" className="db-view-all">View All</Link>
        </div>
        {summaryLoading ? (
          <div className="p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ) : donations.length === 0 ? (
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
              {donations.map((d: Donation) => {
                const initials = (d.donorName || 'DN')
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                return (
                  <tr key={d.id}>
                    <td>
                      <div className="db-donor-cell">
                        <div className="db-donor-avatar">{initials}</div>
                        <span style={{ color: 'var(--db-td-em)' }}>{d.donorName || 'Unknown'}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--db-td-em)', fontWeight: 600 }}>{fmtBDT(d.amount)}</td>
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
