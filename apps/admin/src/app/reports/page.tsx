'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../components/shell';
import { Button } from '@/components/ui/button';
import { useAllEvents } from '@/hooks/useEvents';
import { useEventSummary } from '@/hooks/useReports';
import { StatGrid, StatCard } from '@/components/shared/StatGrid';
import { TableCard } from '@/components/shared/TableCard';
import { fmtBDT } from '@/constants/payments';
import styles from './reports.module.css';

function pct(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0;
}

export default function AdminReportsPage() {
  const { t } = useTranslation();
  const [eventId, setEventId] = useState('');
  const { data: allEvents, isLoading: eventsLoading } = useAllEvents();
  const { data: summary, isLoading: summaryLoading, refetch } = useEventSummary(eventId);

  const events = allEvents ?? [];
  const balanceColor = summary && summary.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)';

  const activeId = useMemo(() => {
    if (eventId) return eventId;
    if (!events.length) return '';
    return events.find((e) => e.isActive)?.id ?? events[0]?.id ?? '';
  }, [eventId, events]);

  // Auto-select active event once loaded
  if (!eventId && activeId) setEventId(activeId);

  return (
    <PageShell
      title={t('dashboard.reportsTitle')}
      subtitle={t('dashboard.reportsSubtitleAlt')}
      actions={
        <div className="flex items-center gap-2">
          <select
            className={styles.eventSelect}
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          >
            {eventsLoading && <option value="">Loading…</option>}
            {!eventsLoading && events.length === 0 && <option value="">No events found</option>}
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}{ev.isActive ? ' (Active)' : ''}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={() => void refetch()}
            disabled={!eventId || summaryLoading}
          >
            Refresh
          </Button>
        </div>
      }
    >
      {summaryLoading && (
        <div className="p-10 text-center text-muted-foreground">
          Loading report…
        </div>
      )}

      {!summary && !summaryLoading && (
        <div className="p-10 text-center text-muted-foreground">
          Select an event to view its report.
        </div>
      )}

      {summary && !summaryLoading && (
        <>
          <StatGrid columns={4}>
            <StatCard label="Total Collection">
              <span className="text-green-600 dark:text-green-400">{fmtBDT(summary.totalCollection)}</span>
            </StatCard>
            <StatCard label="Total Expenses">
              <span className="text-destructive">{fmtBDT(summary.totalExpenses)}</span>
            </StatCard>
            <StatCard label="Net Balance">
              {/* balanceColor is a dynamic runtime value based on balance sign — kept as inline */}
              <span style={{ color: balanceColor }}>{fmtBDT(summary.balance)}</span>
            </StatCard>
            <StatCard label="Total Donors">{summary.totalDonors}</StatCard>
          </StatGrid>

          <div className={styles.chartsRow}>
            {summary.donationsByMethod && Object.keys(summary.donationsByMethod).length > 0 && (
              <TableCard title="Collections by Method">
                <div className={styles.barList}>
                  {Object.entries(summary.donationsByMethod).map(([method, amount]) => {
                    const p = pct(amount, summary.totalCollection);
                    return (
                      <div key={method} className={styles.barItem}>
                        <div className={styles.barLabel}>
                          <span>{method}</span>
                          <span>{fmtBDT(amount)} ({p}%)</span>
                        </div>
                        <div className={styles.barTrack}>
                          <div className={styles.barFillGreen} style={{ width: `${p}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TableCard>
            )}

            {summary.expensesByCategory && Object.keys(summary.expensesByCategory).length > 0 && (
              <TableCard title="Expenses by Category">
                <div className={styles.barList}>
                  {Object.entries(summary.expensesByCategory).map(([cat, amount]) => {
                    const p = pct(amount, summary.totalExpenses);
                    return (
                      <div key={cat} className={styles.barItem}>
                        <div className={styles.barLabel}>
                          <span>{cat}</span>
                          <span>{fmtBDT(amount)} ({p}%)</span>
                        </div>
                        <div className={styles.barTrack}>
                          <div className={styles.barFillRed} style={{ width: `${p}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TableCard>
            )}
          </div>

          <TableCard title={`Financial Summary — ${summary.eventName ?? ''}`}>
            <table className="dataTable">
              <tbody>
                <tr>
                  <td>Total Donations</td>
                  <td className="text-right font-semibold">{summary.totalDonations}</td>
                </tr>
                <tr>
                  <td>Total Collection</td>
                  <td className="text-right font-semibold text-green-600 dark:text-green-400">
                    {fmtBDT(summary.totalCollection)}
                  </td>
                </tr>
                <tr>
                  <td>Total Expenses</td>
                  <td className="text-right font-semibold text-destructive">
                    {fmtBDT(summary.totalExpenses)}
                  </td>
                </tr>
                <tr className="border-t-2 border-border">
                  <td className="font-bold text-foreground">Net Balance</td>
                  {/* balanceColor is a dynamic runtime value based on balance sign — kept as inline */}
                  <td className="text-right font-bold" style={{ color: balanceColor }}>
                    {fmtBDT(summary.balance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </TableCard>
        </>
      )}
    </PageShell>
  );
}
