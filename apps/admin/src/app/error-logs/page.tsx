'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../components/shell';
import { Button } from '@/components/ui/button';
import { useToast } from '../components/toast';
import { useCommunity } from '../providers';
import { useErrorLogs, useReviewErrorLog } from '@/hooks/useErrorLogs';
import { TableCard } from '@/components/shared/TableCard';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { Input } from '@/components/ui/input';
import type { AppErrorLog } from '@/types';
import styles from './error-logs.module.css';

const LEVEL_COLOR: Record<string, string> = {
  INFO: 'var(--color-info)',
  WARNING: 'var(--color-warning)',
  ERROR: 'var(--color-danger)',
  CRITICAL: 'var(--color-danger)',
};

export default function ErrorLogsPage() {
  const { t } = useTranslation();
  const { activeCommunity } = useCommunity();
  const { toast } = useToast();
  const [levelFilter, setLevelFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AppErrorLog | null>(null);

  const { data, isLoading } = useErrorLogs({
    communityId: activeCommunity?.id,
    level: levelFilter,
    source: sourceFilter,
    search,
    page,
    pageSize: 25,
  });

  const reviewLog = useReviewErrorLog();

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  async function handleReview(id: string) {
    try {
      await reviewLog.mutateAsync(id);
      toast('Marked as reviewed', 'success');
      setSelectedLog(null);
    } catch {
      toast('Failed to mark as reviewed', 'error');
    }
  }

  return (
    <PageShell title={t('errorLogs.errorLogs')} subtitle={t('dashboard.errorLogsSubtitleAlt')}>
      <div className={styles.filterRow}>
        <Input
          placeholder="Search message, code, route…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-[1_1_200px]"
        />
        <select
          className={styles.filterSelect}
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
        >
          <option value="">All levels</option>
          <option value="INFO">Info</option>
          <option value="WARNING">Warning</option>
          <option value="ERROR">Error</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <select
          className={styles.filterSelect}
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
        >
          <option value="">All sources</option>
          <option value="API">API</option>
          <option value="MOBILE">Mobile</option>
          <option value="WEB">Web</option>
          <option value="ADMIN">Admin</option>
          <option value="SYNC">Sync</option>
        </select>
      </div>

      <TableCard
        title="Error Logs"
        badge={isLoading ? 'Loading…' : `${logs.length} on page / ${total} total`}
        empty={!isLoading && logs.length === 0 ? 'No error logs found.' : undefined}
      >
        {logs.length > 0 && (
          <table className="dataTable">
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
              {logs.map((log) => (
                <tr key={log.id} className={log.reviewedAt ? 'opacity-60' : ''}>
                  <td>
                    <span
                      className={styles.levelBadge}
                      style={{
                        color: LEVEL_COLOR[log.level] ?? 'var(--color-text-muted)',
                        background: (LEVEL_COLOR[log.level] ?? 'var(--color-text-muted)') + '18',
                      }}
                    >
                      {log.level}
                    </span>
                  </td>
                  <td className={styles.small}>{log.source}</td>
                  <td className={styles.message}>{log.message}</td>
                  <td><code className={styles.code}>{log.errorCode ?? '—'}</code></td>
                  <td className={styles.muted}>{log.routeName ?? '—'}</td>
                  <td className={styles.small}>{log.community?.name ?? '—'}</td>
                  <td className={`${styles.small} whitespace-nowrap`}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        className={styles.viewBtn}
                        onClick={() => setSelectedLog(log)}
                      >
                        View
                      </button>
                      {!log.reviewedAt && (
                        <button
                          type="button"
                          className={`${styles.viewBtn} ${styles.reviewBtn}`}
                          onClick={() => handleReview(log.id)}
                          disabled={reviewLog.isPending}
                        >
                          ✓ Review
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {isLoading && (
          <div className="p-10 text-center text-muted-foreground">
            Loading error logs…
          </div>
        )}
        <PaginationControls
          page={page}
          pageSize={25}
          total={total}
          totalPages={totalPages}
          loading={isLoading}
          onPageChange={setPage}
        />
      </TableCard>

      {selectedLog && (
        <div
          className={styles.drawerOverlay}
          onClick={() => setSelectedLog(null)}
        >
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h2>Error Log Detail</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setSelectedLog(null)}>×</button>
            </div>
            <div className={styles.drawerBody}>
              {([
                ['Level', selectedLog.level],
                ['Source', selectedLog.source],
                ['Error Code', selectedLog.errorCode],
                ['Route', selectedLog.routeName],
                ['Request ID', selectedLog.requestId],
                ['IP Address', selectedLog.ipAddress],
                ['Community', selectedLog.community?.name],
                ['User', selectedLog.user?.email],
                ['Time', new Date(selectedLog.createdAt).toLocaleString()],
                ['Reviewed', selectedLog.reviewedAt ? new Date(selectedLog.reviewedAt).toLocaleString() : 'No'],
              ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className={styles.drawerField}>
                  <div className={styles.drawerFieldLabel}>{label}</div>
                  <div className={styles.drawerFieldValue}>{value}</div>
                </div>
              ))}
              <div className={styles.drawerField}>
                <div className={styles.drawerFieldLabel}>Message</div>
                <div className={styles.messageBlock}>{selectedLog.message}</div>
              </div>
              {!selectedLog.reviewedAt && (
                <Button
                  onClick={() => handleReview(selectedLog.id)}
                  disabled={reviewLog.isPending}
                  className="mt-3 w-full"
                >
                  {reviewLog.isPending ? 'Saving…' : '✓ Mark as Reviewed'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
