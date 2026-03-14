'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useApiQuery } from '@/lib/query';
import { useCommunity } from './providers';
import { PageShell } from './components/shell';
import { Skeleton } from './components/ui/skeleton';
import { Button } from './components/ui/button';
import { StatGrid, StatCard } from '@/components/shared/StatGrid';
import { TableCard } from '@/components/shared/TableCard';
import { UserAvatar } from '@/components/shared/UserAvatar';
import styles from './dashboard.module.css';

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
type Donation = {
  id: string;
  donorName?: string;
  amount: number;
  paymentMethod: string;
  donationDate: string;
};
type ExpenseForChart = { id: string; category: string; amount: number };

const fmtBDT = (n: number) =>
  `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

const PIE_COLORS = ['#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#34d399', '#10b981', '#6ee7b7'];

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { activeCommunity } = useCommunity();
  const communityId = activeCommunity?.id ?? '';
  const [selectedId, setSelectedId] = useState('');

  const { data: eventsData, isLoading: eventsLoading, error: eventsError } = useApiQuery<{ events: Event[] }>(
    ['events', communityId],
    (client) =>
      client.get<{ events: Event[] }>('/events?page=1&pageSize=100').then((res) => {
        if (!res.success) throw new Error(res.error.message);
        const data = res.data as { events?: Event[] } | Event[];
        const list = Array.isArray(data) ? data : (data.events ?? []);
        return { events: list };
      }),
    { enabled: !!communityId },
  );

  const activeId = useMemo(() => {
    if (selectedId) return selectedId;
    if (!eventsData?.events?.length) return '';
    const active = eventsData.events.find((e) => e.isActive) || eventsData.events[0];
    return active?.id ?? '';
  }, [selectedId, eventsData]);

  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useApiQuery<{
    summary: EventSummary | null;
    donations: Donation[];
  }>(
    ['event-summary', activeId],
    async (client) => {
      if (!activeId) return { summary: null, donations: [] };
      const [sumRes, donRes] = await Promise.all([
        client.get<{ summary?: EventSummary } | EventSummary>(
          `/reports/event-summary?eventId=${activeId}`,
        ),
        client.get<{ donations?: Record<string, unknown>[] } | Record<string, unknown>[]>(
          `/donations?eventId=${activeId}&limit=5`,
        ),
      ]);
      if (!sumRes.success) throw new Error(sumRes.error.message);
      const sumData = sumRes.data as { summary?: EventSummary } | EventSummary;
      const summary = ((sumData as { summary?: EventSummary }).summary ?? sumData) as EventSummary;
      let donations: Donation[] = [];
      if (donRes.success) {
        const d = donRes.data as { donations?: Record<string, unknown>[] } | Record<string, unknown>[];
        const raw: Record<string, unknown>[] = Array.isArray(d) ? d : (d.donations ?? []);
        donations = raw.map((item) => ({
          id: String(item.id ?? ''),
          donorName: String(item.donorSnapshotName ?? item.donorName ?? 'Unknown'),
          amount: Number(item.amount ?? 0),
          paymentMethod: String(item.paymentMethod ?? ''),
          donationDate: String(item.donationDate ?? ''),
        }));
      }
      return { summary, donations };
    },
    { enabled: !!activeId },
  );

  const { data: expensesData, isLoading: expensesLoading, error: expensesError } = useApiQuery<{
    expenses: ExpenseForChart[];
  }>(
    ['event-expenses', activeId],
    async (client) => {
      if (!activeId) return { expenses: [] };
      const res = await client.get<
        { expenses?: Record<string, unknown>[] } | Record<string, unknown>[]
      >(`/expenses?eventId=${activeId}`);
      if (!res.success) throw new Error(res.error.message);
      const d = res.data as { expenses?: Record<string, unknown>[] } | Record<string, unknown>[];
      const raw: Record<string, unknown>[] = Array.isArray(d) ? d : (d.expenses ?? []);
      return {
        expenses: raw.map((item) => ({
          id: String(item.id ?? ''),
          category: String(item.category || 'Uncategorized'),
          amount: Number(item.amount ?? 0),
        })),
      };
    },
    { enabled: !!activeId },
  );

  const events = eventsData?.events ?? [];
  const summary = summaryData?.summary ?? null;
  const donations = summaryData?.donations ?? [];
  const expenses = expensesData?.expenses ?? [];
  const bal = summary?.balance ?? 0;
  const errorMsg = eventsError?.message ?? summaryError?.message ?? expensesError?.message ?? null;

  const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);
  const categoryTotals = expenses.reduce<Record<string, number>>((acc, curr) => {
    const key = curr.category || 'Uncategorized';
    acc[key] = (acc[key] ?? 0) + curr.amount;
    return acc;
  }, {});
  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const categoryWithMeta = categoryEntries.map(([name, amount], index) => ({
    name,
    amount,
    pct: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
    color: PIE_COLORS[index % PIE_COLORS.length],
  }));

  let pieGradient = '';
  if (totalExpenses > 0 && categoryWithMeta.length > 0) {
    let current = 0;
    const segments: string[] = [];
    categoryWithMeta.forEach((cat) => {
      const angle = (cat.amount / totalExpenses) * 360;
      segments.push(`${cat.color} ${current.toFixed(1)}deg ${(current + angle).toFixed(1)}deg`);
      current += angle;
    });
    pieGradient = `conic-gradient(${segments.join(', ')})`;
  }

  return (
    <PageShell
      title={t('dashboard.overview')}
      subtitle={t('dashboard.subtitle')}
      actions={
        <>
          {eventsLoading ? (
            <Skeleton className="h-9 w-40 rounded-md" />
          ) : (
            <select
              className={styles.eventSelect}
              value={activeId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {events.length === 0 && <option value="">{t('dashboard.noEventsFound')}</option>}
              {events.map((ev: Event) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} {ev.isActive ? `(${t('dashboard.active')})` : ''}
                </option>
              ))}
            </select>
          )}
          <Button variant="outline">
            <Link href="/expenses">+ {t('expenses.addExpense')}</Link>
          </Button>
          <Button>
            <Link href="/donations">+ {t('donations.addDonation')}</Link>
          </Button>
        </>
      }
    >
      {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

      {/* Stat cards */}
      <StatGrid>
        {summaryLoading ? (
          <>
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </>
        ) : (
          <>
            <StatCard label={t('dashboard.totalCollections')}>
              <span className="font-bold text-green-600 dark:text-green-400">
                {fmtBDT(summary?.totalCollection ?? 0)}
              </span>
            </StatCard>
            <StatCard label={t('dashboard.totalExpenses')}>
              <span className="font-bold text-destructive">
                {fmtBDT(summary?.totalExpenses ?? 0)}
              </span>
            </StatCard>
            <StatCard label={t('dashboard.currentBalance')}>
              {/* color depends on runtime balance sign — kept as inline */}
              <span
                className="font-bold"
                style={{ color: bal >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
              >
                {fmtBDT(bal)}
              </span>
            </StatCard>
            <StatCard label={t('dashboard.totalDonors')}>
              <span className="font-bold">{summary?.totalDonors ?? 0}</span>
            </StatCard>
          </>
        )}
      </StatGrid>

      {/* Charts */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <div className={styles.chartCardTitle}>{t('dashboard.expenseBreakdown')}</div>
          <div className={styles.chartCardSubtitle}>{t('dashboard.byCategory')}</div>
          <div className={styles.pieWrap}>
            {expensesLoading ? (
              <Skeleton className="h-40 w-40 rounded-full" />
            ) : totalExpenses <= 0 || categoryWithMeta.length === 0 ? (
              <div className={styles.empty}>{t('dashboard.noExpenseData')}</div>
            ) : (
              <div
                className={styles.pie}
                style={{ backgroundImage: pieGradient || undefined }}
              >
                <div className={styles.pieInner}>
                  <div className={styles.pieLabel}>{t('dashboard.total')}</div>
                  <div className={styles.pieValue}>{fmtBDT(summary?.totalExpenses ?? totalExpenses)}</div>
                </div>
              </div>
            )}
          </div>
          {categoryWithMeta.length > 0 && (
            <div className={styles.pieLegend}>
              {categoryWithMeta.map((cat) => (
                <div key={cat.name} className={styles.legendItem}>
                  {/* background is a runtime pie-chart color — kept as inline */}
                  <div className={styles.legendDot} style={{ background: cat.color }} />
                  <span>{cat.name}</span>
                  <span className="text-muted-foreground">{cat.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartCardTitle}>{t('dashboard.expenseCategories')}</div>
          <div className="h-3" />
          <div className={styles.catList}>
            {expensesLoading ? (
              <div className={styles.empty}>{t('dashboard.loadingCategories')}</div>
            ) : categoryWithMeta.length === 0 ? (
              <div className={styles.empty}>{t('dashboard.noCategorizedExpenses')}</div>
            ) : (
              categoryWithMeta.map((cat) => (
                <div key={cat.name} className={styles.catRow}>
                  <div className={styles.catHeader}>
                    <span className={styles.catName}>{cat.name}</span>
                    <span className={styles.catAmount}>{fmtBDT(cat.amount)} ({cat.pct}%)</span>
                  </div>
                  <div className={styles.catTrack}>
                    <div
                      className={styles.catFill}
                      style={{ width: `${cat.pct}%`, background: cat.color }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          {categoryWithMeta.length > 0 && (
            <Link href="/reports" className={styles.reportLink}>
              {t('dashboard.downloadFullReport')}
            </Link>
          )}
        </div>
      </div>

      {/* Recent donations */}
      <TableCard
        title={t('dashboard.recentDonations')}
        actions={
          <Link href="/donors" className={styles.viewAllLink}>{t('dashboard.viewAll')}</Link>
        }
        empty={
          !summaryLoading && donations.length === 0
            ? (activeId ? t('dashboard.noDonationsFound') : t('dashboard.selectEventAbove'))
            : undefined
        }
      >
        {summaryLoading ? (
          <div className="p-4">
            <Skeleton className="h-4 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : donations.length > 0 ? (
          <table className="dataTable">
            <thead>
              <tr>
                <th>{t('dashboard.donor')}</th>
                <th>{t('dashboard.amount')}</th>
                <th>{t('dashboard.method')}</th>
                <th>{t('dashboard.date')}</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className={styles.donorCell}>
                      <UserAvatar name={d.donorName ?? 'DN'} size="sm" />
                      <span className="text-foreground">{d.donorName ?? 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="text-green-600 dark:text-green-400 font-semibold">
                    {fmtBDT(d.amount)}
                  </td>
                  <td>{d.paymentMethod}</td>
                  <td>{new Date(d.donationDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </TableCard>
    </PageShell>
  );
}
