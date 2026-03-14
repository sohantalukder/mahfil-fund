'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../components/shell';
import { Button } from '@/components/ui/button';
import { useToast } from '../components/toast';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useCommunities, useCommunityCreationStats, useArchiveCommunity } from '@/hooks/useCommunities';
import { TableCard } from '@/components/shared/TableCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { CommunityWithCounts } from '@/services/communityService';
import styles from './communities.module.css';

export default function CommunitiesPage() {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const { toast } = useToast();

  const { data, isLoading } = useCommunities({ page, pageSize: 20, search: debouncedSearch.trim() });
  const { data: statsData } = useCommunityCreationStats();
  const archive = useArchiveCommunity();

  const [archiveTarget, setArchiveTarget] = useState<CommunityWithCounts | null>(null);

  const stats = statsData?.stats;
  const atLimit = stats?.remaining !== null && stats?.remaining === 0;

  async function handleArchive() {
    if (!archiveTarget) return;
    try {
      await archive.mutateAsync(archiveTarget.id);
      toast('Community archived', 'success');
    } catch {
      toast('Failed to archive community', 'error');
    } finally {
      setArchiveTarget(null);
    }
  }

  return (
    <PageShell
      title={t('dashboard.communitiesTitle')}
      subtitle={t('dashboard.communitiesSubtitleAlt')}
      actions={
        <div className={styles.statsRow}>
          {stats && (
            <span className={`${styles.statsLabel} ${atLimit ? styles.statsLabelLimit : styles.statsLabelNormal}`}>
              {stats.remaining !== null
                ? `${stats.created}/${stats.limit} created`
                : `${stats.created} created`}
            </span>
          )}
          {atLimit ? (
            <Button disabled variant="secondary">+ New Community</Button>
          ) : (
            <Button>
              <Link href="/communities/new">+ New Community</Link>
            </Button>
          )}
        </div>
      }
    >
      <ListToolbar
        searchPlaceholder="Search communities…"
        searchValue={searchInput}
        onSearchChange={(v) => { setSearchInput(v); setPage(1); }}
      />

      <TableCard
        title="All Communities"
        badge={data ? `${data.communities.length} on page / ${data.total} total` : undefined}
        empty={!isLoading && !data?.communities.length ? 'No communities found.' : undefined}
      >
        {(data?.communities.length ?? 0) > 0 && (
          <table className="dataTable">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Location</th>
                <th>Members</th>
                <th>Events</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data!.communities.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className={styles.communityName}>{c.name}</div>
                    {c.description && (
                      <div className={styles.communityDesc}>{c.description.slice(0, 60)}</div>
                    )}
                  </td>
                  <td><code className={styles.slug}>{c.slug}</code></td>
                  <td>{c.district ?? c.location ?? '—'}</td>
                  <td>{c._count.memberships}</td>
                  <td>{c._count.events}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>
                    <div className={styles.actionRow}>
                      <Link
                        href={`/invitations?communityId=${c.id}`}
                        className={styles.actionLink}
                      >
                        Invite
                      </Link>
                      <button
                        type="button"
                        className={styles.archiveBtn}
                        onClick={() => setArchiveTarget(c)}
                        disabled={c.status === 'ARCHIVED'}
                      >
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {isLoading && (
          <div className="p-10 text-center text-muted-foreground">
            Loading communities…
          </div>
        )}
        <PaginationControls
          page={page}
          pageSize={20}
          total={data?.total ?? 0}
          totalPages={data?.totalPages ?? 1}
          loading={isLoading}
          onPageChange={setPage}
        />
      </TableCard>

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Archive Community"
        description={`Are you sure you want to archive "${archiveTarget?.name}"? This action can be reversed.`}
        confirmLabel="Archive"
        variant="destructive"
        loading={archive.isPending}
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </PageShell>
  );
}
