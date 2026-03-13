'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCommunity } from '../providers';
import { PageShell } from '../components/shell';
import { useToast } from '../components/toast';

interface ErrorLog {
  id: string;
  level: string;
  source: string;
  communityId?: string;
  userId?: string;
  requestId?: string;
  routeName?: string;
  actionName?: string;
  errorCode?: string;
  message: string;
  ipAddress?: string;
  reviewedAt?: string;
  createdAt: string;
  community?: { name: string };
  user?: { email: string; fullName?: string };
}

const LEVEL_COLORS: Record<string, string> = {
  INFO: '#2563EB',
  WARNING: '#D97706',
  ERROR: '#DC2626',
  CRITICAL: '#7C3AED'
};

export default function ErrorLogsPage() {
  const { activeCommunity } = useCommunity();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [levelFilter, setLevelFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);

  const { data, isLoading } = useQuery<{ logs: ErrorLog[]; total: number; totalPages: number }>({
    queryKey: ['error-logs', activeCommunity?.id, levelFilter, sourceFilter, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '25' });
      if (activeCommunity?.id) params.set('communityId', activeCommunity.id);
      if (levelFilter) params.set('level', levelFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/error-logs?${params}`);
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json() as { data: { logs: ErrorLog[]; total: number; totalPages: number } };
      return json.data;
    }
  });

  const reviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/error-logs/${id}/review`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      toast('Marked as reviewed', 'success');
      setSelectedLog(null);
      void queryClient.invalidateQueries({ queryKey: ['error-logs'] });
    }
  });

  return (
    <PageShell title="Error Logs" subtitle="Monitor and review application errors">
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          className="db-input"
          placeholder="Search message, code, route..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ flex: '1 1 200px' }}
        />
        <select className="db-input" style={{ flex: '0 0 140px' }} value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
          <option value="">All levels</option>
          <option value="INFO">Info</option>
          <option value="WARNING">Warning</option>
          <option value="ERROR">Error</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <select className="db-input" style={{ flex: '0 0 140px' }} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="">All sources</option>
          <option value="API">API</option>
          <option value="MOBILE">Mobile</option>
          <option value="WEB">Web</option>
          <option value="ADMIN">Admin</option>
          <option value="SYNC">Sync</option>
          <option value="UPLOAD">Upload</option>
          <option value="EMAIL">Email</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>Loading error logs...</div>
      ) : (
        <div className="db-card" style={{ overflow: 'hidden' }}>
          <table className="db-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Level</th>
                <th>Source</th>
                <th>Message</th>
                <th>Code</th>
                <th>Route</th>
                <th>Community</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!data?.logs?.length ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>No error logs found</td></tr>
              ) : data.logs.map((log) => (
                <tr key={log.id} style={{ opacity: log.reviewedAt ? 0.6 : 1 }}>
                  <td>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: LEVEL_COLORS[log.level], background: `${LEVEL_COLORS[log.level]}18` }}>
                      {log.level}
                    </span>
                  </td>
                  <td style={{ fontSize: 11 }}>{log.source}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {log.message}
                  </td>
                  <td><code style={{ fontSize: 10 }}>{log.errorCode ?? '—'}</code></td>
                  <td style={{ fontSize: 11, color: '#9CA3AF' }}>{log.routeName ?? '—'}</td>
                  <td style={{ fontSize: 11 }}>{log.community?.name ?? '—'}</td>
                  <td style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString('en-US')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="db-btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setSelectedLog(log)}>
                        View
                      </button>
                      {!log.reviewedAt && (
                        <button className="db-btn-secondary" style={{ fontSize: 11, padding: '3px 8px', color: '#16A34A' }} onClick={() => reviewMutation.mutate(log.id)}>
                          ✓ Review
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(data?.totalPages ?? 0) > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px' }}>
              <button className="db-btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
              <span style={{ padding: '6px 12px', fontSize: 13 }}>Page {page} of {data?.totalPages}</span>
              <button className="db-btn-secondary" disabled={page >= (data?.totalPages ?? 1)} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          )}
        </div>
      )}

      {/* Detail drawer */}
      {selectedLog && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end'
        }} onClick={() => setSelectedLog(null)}>
          <div
            style={{ background: 'var(--surface)', width: 480, height: '100vh', padding: 24, overflowY: 'auto', boxShadow: '-8px 0 24px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>Error Log Detail</h2>
              <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Level', selectedLog.level],
                ['Source', selectedLog.source],
                ['Error Code', selectedLog.errorCode],
                ['Route', selectedLog.routeName],
                ['Request ID', selectedLog.requestId],
                ['IP Address', selectedLog.ipAddress],
                ['Community', selectedLog.community?.name],
                ['User', selectedLog.user?.email],
                ['Time', new Date(selectedLog.createdAt).toLocaleString('en-US')],
                ['Reviewed', selectedLog.reviewedAt ? new Date(selectedLog.reviewedAt).toLocaleString('en-US') : 'No'],
              ].map(([label, value]) => value && (
                <div key={label} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13 }}>{value}</div>
                </div>
              ))}

              <div>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>Message</div>
                <div style={{ fontSize: 13, padding: '8px 12px', background: 'var(--surface-muted)', borderRadius: 8 }}>
                  {selectedLog.message}
                </div>
              </div>

              {!selectedLog.reviewedAt && (
                <button className="db-btn-primary" style={{ marginTop: 12 }} onClick={() => reviewMutation.mutate(selectedLog.id)} disabled={reviewMutation.isPending}>
                  {reviewMutation.isPending ? 'Saving...' : '✓ Mark as Reviewed'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
