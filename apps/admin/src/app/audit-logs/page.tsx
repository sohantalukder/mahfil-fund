'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../components/shell';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { TableCard } from '@/components/shared/TableCard';
import { PaginationControls } from '@/components/shared/PaginationControls';
import styles from './audit-logs.module.css';

const ACTION_COLOR: Record<string, string> = {
  CREATE: 'var(--color-success)',
  UPDATE: 'var(--color-primary)',
  DELETE: 'var(--color-danger)',
  RESTORE: 'var(--color-warning)',
};

function fmt(v: string) {
  return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function useRelativeTime() {
  const [nowTs, setNowTs] = useState<number | null>(null);
  useEffect(() => {
    setNowTs(Date.now());
    const id = window.setInterval(() => setNowTs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return nowTs;
}

function formatWhen(value: string, nowTs: number | null) {
  const date = new Date(value);
  if (nowTs === null) return { full: date.toLocaleString(), relative: 'Just now' };
  const diffMs = date.getTime() - nowTs;
  const absMs = Math.abs(diffMs);
  const min = 60_000; const hour = 60 * min; const day = 24 * hour;
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  let relative: string;
  if (absMs < min) relative = 'Just now';
  else if (absMs < hour) relative = rtf.format(Math.round(diffMs / min), 'minute');
  else if (absMs < day) relative = rtf.format(Math.round(diffMs / hour), 'hour');
  else relative = rtf.format(Math.round(diffMs / day), 'day');
  return { full: date.toLocaleString(), relative };
}

export default function AdminAuditLogsPage() {
  const { t } = useTranslation();
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const nowTs = useRelativeTime();

  const { data, isLoading } = useAuditLogs({ entityType, action, page, pageSize });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <PageShell title={t('admin.nav.auditLogs')} subtitle={t('dashboard.auditLogsSubtitleAlt')}>
      <div className={styles.filterRow}>
        <select
          className={styles.filterSelect}
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
        >
          <option value="">All Entity Types</option>
          <option value="event">Event</option>
          <option value="donor">Donor</option>
          <option value="donation">Donation</option>
          <option value="expense">Expense</option>
          <option value="user">User</option>
        </select>
        <select
          className={styles.filterSelect}
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
        >
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="RESTORE">Restore</option>
        </select>
        <select
          className={styles.filterSelect}
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
        >
          <option value={25}>Last 25</option>
          <option value={50}>Last 50</option>
          <option value={100}>Last 100</option>
          <option value={200}>Last 200</option>
        </select>
        {(entityType || action) && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => { setEntityType(''); setAction(''); setPage(1); setPageSize(50); }}
          >
            Clear
          </button>
        )}
      </div>

      <TableCard
        title="Activity Log"
        badge={isLoading ? 'Loading…' : `${logs.length} on page / ${total} total`}
        badgeVariant="blue"
        empty={!isLoading && logs.length === 0 ? 'No activity found for selected filters.' : undefined}
      >
        {logs.length > 0 && (
          <table className="dataTable">
            <thead>
              <tr>
                <th>When</th>
                <th>What Happened</th>
                <th>Object</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const color = ACTION_COLOR[log.action] ?? 'var(--color-text-muted)';
                const when = formatWhen(log.createdAt, nowTs);
                const actorLabel = log.actor?.id ? `Admin ${log.actor.id.slice(0, 8)}` : 'System';
                const detail = (() => {
                  const after = (log.after ?? {}) as Record<string, unknown>;
                  const before = (log.before ?? {}) as Record<string, unknown>;
                  if (log.entityType === 'user') {
                    const email = (typeof after.email === 'string' ? after.email : typeof before.email === 'string' ? before.email : '');
                    const fullName = (typeof after.fullName === 'string' ? after.fullName : typeof before.fullName === 'string' ? before.fullName : '');
                    const roles = Array.isArray(after.roles) ? (after.roles as string[]).join(', ') : '';
                    if (email || fullName) return `${fullName || email}${fullName && email ? ` (${email})` : ''}${roles ? ` • roles: ${roles}` : ''}`;
                  }
                  if (log.entityType === 'donor') {
                    const name = typeof after.fullName === 'string' ? after.fullName : '';
                    const phone = typeof after.phone === 'string' ? after.phone : '';
                    if (name || phone) return `${name}${name && phone ? ' • ' : ''}${phone}`;
                  }
                  return '';
                })();
                return (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap" title={when.full}>
                      <div className="text-xs">{when.full}</div>
                      <div className={styles.relativeTime}>{when.relative}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* background and color come from ACTION_COLOR map at runtime — kept as inline */}
                        <span
                          className={styles.actionBadge}
                          style={{ background: color + '22', color }}
                        >
                          {fmt(log.action)}
                        </span>
                        <span className="text-foreground">
                          {fmt(log.action)} {fmt(log.entityType)}
                        </span>
                      </div>
                      {detail && (
                        <div className={styles.detailText}>{detail}</div>
                      )}
                    </td>
                    <td>
                      <div className="text-foreground">{fmt(log.entityType)}</div>
                      {log.entityId && (
                        <div className={styles.mono} title={log.entityId}>
                          {log.entityId.slice(0, 12)}…
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="text-foreground">{actorLabel}</div>
                      {log.actor?.id && (
                        <div className={styles.mono} title={log.actor.id}>
                          {log.actor.id.slice(0, 12)}…
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {isLoading && (
          <div className="p-6 text-center text-muted-foreground">
            Loading activity…
          </div>
        )}
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          loading={isLoading}
          pageSizeOptions={[25, 50, 100, 200]}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </TableCard>
    </PageShell>
  );
}
