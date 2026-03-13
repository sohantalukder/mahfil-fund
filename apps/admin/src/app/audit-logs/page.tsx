'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApiQuery } from '@/lib/query';
import { PageShell } from '../components/shell';
import { ErrorScreen } from '../components/error-screen';

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  actor?: { id: string };
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  createdAt: string;
};

const fmt = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const ACTION_COLOR: Record<string, string> = {
  CREATE: '#059669',
  UPDATE: '#2563eb',
  DELETE: '#dc2626',
  RESTORE: '#d97706',
};

export default function AdminAuditLogsPage() {
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [take, setTake] = useState(50);
  const [nowTs, setNowTs] = useState<number | null>(null);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useApiQuery<{ logs: AuditLog[] }>(
    ['audit-logs', entityType, action, take],
    async (client) => {
      const params = new URLSearchParams({ take: String(take) });
      if (entityType) params.set('entityType', entityType);
      if (action) params.set('action', action);
      const res = await client.get<{ logs: AuditLog[] }>(`/audit-logs?${params}`);
      if (!res.success) {
        throw new Error(res.error.message);
      }
      const d = res.data as { logs?: AuditLog[] } | AuditLog[];
      const list = Array.isArray(d) ? d : (d.logs ?? []);
      return { logs: list };
    },
  );

  const logs = useMemo(() => {
    const d = data as { logs?: AuditLog[] } | undefined;
    return d?.logs ?? [];
  }, [data]);

  useEffect(() => {
    const updateNow = () => setNowTs(Date.now());
    updateNow();
    const id = window.setInterval(updateNow, 60_000);
    return () => window.clearInterval(id);
  }, []);

  function applyFilter() { refetch(); }
  function clear() { setEntityType(''); setAction(''); setTake(50); }

  const describe = (log: AuditLog) => {
    const actionText = fmt(log.action).toLowerCase();
    const entityText = fmt(log.entityType);
    return `${fmt(log.action)} ${entityText}`.trim() || `${actionText} ${entityText}`;
  };

  const actorLabel = (log: AuditLog) => {
    if (!log.actor?.id) return 'System';
    return `Admin ${log.actor.id.slice(0, 8)}`;
  };

  const detailText = (log: AuditLog) => {
    const after = (log.after ?? {}) as Record<string, unknown>;
    const before = (log.before ?? {}) as Record<string, unknown>;

    if (log.entityType === 'user') {
      const email = typeof after.email === 'string' ? after.email : (typeof before.email === 'string' ? before.email : '');
      const fullName = typeof after.fullName === 'string' ? after.fullName : (typeof before.fullName === 'string' ? before.fullName : '');
      const roles = Array.isArray(after.roles) ? after.roles : [];
      const roleLabel = roles.length > 0 ? ` • roles: ${roles.join(', ')}` : '';
      if (email || fullName) return `${fullName || email}${fullName && email ? ` (${email})` : ''}${roleLabel}`;
    }

    if (log.entityType === 'donor') {
      const name = typeof after.fullName === 'string' ? after.fullName : '';
      const phone = typeof after.phone === 'string' ? after.phone : '';
      if (name || phone) return `${name}${name && phone ? ' • ' : ''}${phone}`;
    }

    return '';
  };

  const formatWhen = (value: string) => {
    const date = new Date(value);
    if (nowTs === null) {
      return { full: date.toLocaleString(), relative: 'Just now' };
    }
    const diffMs = date.getTime() - nowTs;
    const absMs = Math.abs(diffMs);
    const minuteMs = 60 * 1000;
    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    let relative: string;
    if (absMs < minuteMs) {
      relative = 'Just now';
    } else if (absMs < hourMs) {
      relative = rtf.format(Math.round(diffMs / minuteMs), 'minute');
    } else if (absMs < dayMs) {
      relative = rtf.format(Math.round(diffMs / hourMs), 'hour');
    } else {
      relative = rtf.format(Math.round(diffMs / dayMs), 'day');
    }

    return {
      full: date.toLocaleString(),
      relative,
    };
  };

  return (
    <PageShell title="Audit Logs" subtitle="Track all admin actions across the system.">
      {error ? (
        <ErrorScreen
          title="Unable to load audit logs"
          message="We could not fetch the activity log. Please try again."
          details={error.message}
          actionLabel="Retry"
          onAction={() => { void refetch(); }}
        />
      ) : (
        <>

          <div className="db-toolbar" style={{ marginBottom: 16 }}>
            <select className="db-input" style={{ maxWidth: 180 }} value={entityType}
              onChange={(e) => setEntityType(e.target.value)}>
              <option value="">All Entity Types</option>
              <option value="event">Event</option>
              <option value="donor">Donor</option>
              <option value="donation">Donation</option>
              <option value="expense">Expense</option>
              <option value="user">User</option>
            </select>
            <select className="db-input" style={{ maxWidth: 160 }} value={action}
              onChange={(e) => setAction(e.target.value)}>
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="RESTORE">Restore</option>
            </select>
            <select className="db-input" style={{ maxWidth: 120 }} value={take}
              onChange={(e) => setTake(Number(e.target.value))}>
              <option value={25}>Last 25</option>
              <option value={50}>Last 50</option>
              <option value={100}>Last 100</option>
              <option value={200}>Last 200</option>
            </select>
            <button className="db-btn db-btn-primary" type="button" onClick={applyFilter}>Filter</button>
            <button className="db-btn" type="button" onClick={clear}>Clear</button>
          </div>

          <div className="db-table-card">
            <div className="db-table-header">
              <span className="db-table-title">Activity Log</span>
              <span className="db-stat-badge db-stat-badge-blue">
                {isLoading ? 'Loading…' : `${logs.length} entries`}
              </span>
            </div>
            {isLoading && <div className="db-empty">Loading activity…</div>}
            {!isLoading && logs.length === 0 ? (
              <div className="db-empty">No activity found for selected filters.</div>
            ) : (
              <table className="db-table">
                <thead>
                  <tr><th>When</th><th>What Happened</th><th>Object</th><th>By</th></tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const color = ACTION_COLOR[log.action] || '#6b7280';
                    const when = formatWhen(log.createdAt);
                    return (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: 'nowrap' }} title={when.full}>
                          <div style={{ fontSize: 13 }}>{when.full}</div>
                          <div style={{ fontSize: 11, color: 'var(--db-td)' }}>{when.relative}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span className="db-stat-badge"
                              style={{ background: color + '22', color }}>
                              {fmt(log.action)}
                            </span>
                            <span style={{ color: 'var(--db-td-em)' }}>{describe(log)}</span>
                          </div>
                          {detailText(log) && (
                            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--db-td)' }}>
                              {detailText(log)}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ color: 'var(--db-td-em)' }}>{fmt(log.entityType)}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--db-td)' }} title={log.entityId || ''}>
                            {log.entityId ? log.entityId.slice(0, 12) + '…' : '—'}
                          </div>
                        </td>
                        <td>
                          <div style={{ color: 'var(--db-td-em)' }}>{actorLabel(log)}</div>
                          {log.actor?.id && (
                            <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--db-td)' }} title={log.actor.id}>
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
          </div>
        </>
      )}
    </PageShell>
  );
}
