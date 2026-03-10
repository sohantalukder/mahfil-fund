'use client';

import { useEffect, useMemo, useState } from 'react';
import { getApi } from '@/lib/api';
import { PageShell } from '../components/shell';

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  actor?: { id: string; authUserId: string };
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
  const api = useMemo(() => getApi(), []);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [take, setTake] = useState(50);

  async function load(ent = entityType, act = action, t = take) {
    setLoading(true); setError(null);
    const params = new URLSearchParams({ take: String(t) });
    if (ent) params.set('entityType', ent);
    if (act) params.set('action', act);
    const res = await api.get<{ logs: AuditLog[] }>(`/audit-logs?${params}`);
    setLoading(false);
    if (!res.success) { setError(res.error.message); return; }
    const list = (res.data as any).logs ?? res.data ?? [];
    setLogs(list);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function applyFilter() { load(entityType, action, take); }
  function clear() { setEntityType(''); setAction(''); setTake(50); load('', '', 50); }

  return (
    <PageShell title="Audit Logs" subtitle="Track all admin actions across the system.">
      {error && <div className="db-error">{error}</div>}

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
          <span className="db-stat-badge db-stat-badge-blue">{logs.length} entries</span>
        </div>
        {loading && <div className="db-empty">Loading…</div>}
        {!loading && logs.length === 0 ? (
          <div className="db-empty">No audit logs found for the selected filters.</div>
        ) : (
          <table className="db-table">
            <thead>
              <tr><th>Time</th><th>Action</th><th>Entity Type</th><th>Entity ID</th><th>Actor ID</th></tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const color = ACTION_COLOR[log.action] || '#6b7280';
                return (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span className="db-stat-badge"
                        style={{ background: color + '22', color }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ color: 'var(--db-td-em)' }}>{fmt(log.entityType)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {log.entityId ? log.entityId.slice(0, 8) + '…' : '—'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {log.actor?.authUserId?.slice(0, 8) || '—'}
                    </td>
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
