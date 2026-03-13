'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { PageShell } from '../components/shell';
import { useToast } from '../components/toast';
import type { Community, CommunityCreationStats } from '@mahfil/types';

type CommunitiesResponse = {
  communities: (Community & { _count: { memberships: number; events: number } })[];
  total: number;
  page: number;
  totalPages: number;
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#16A34A',
  ARCHIVED: '#9CA3AF',
  SUSPENDED: '#EF4444'
};

export default function CommunitiesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data, isLoading } = useQuery<CommunitiesResponse>({
    queryKey: ['communities', search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/communities?${params}`);
      if (!res.ok) throw new Error('Failed to load communities');
      const json = await res.json() as { data: CommunitiesResponse };
      return json.data;
    }
  });

  const { data: statsData } = useQuery<{ stats: CommunityCreationStats }>({
    queryKey: ['communities', 'creation-stats'],
    queryFn: async () => {
      const res = await fetch('/api/communities/creation-stats');
      if (!res.ok) throw new Error('Failed to load stats');
      const json = await res.json() as { data: { stats: CommunityCreationStats } };
      return json.data;
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/communities/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to archive');
    },
    onSuccess: () => {
      addToast({ type: 'success', message: 'Community archived' });
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
    onError: () => addToast({ type: 'error', message: 'Failed to archive community' })
  });

  const stats = statsData?.stats;
  const atLimit = stats?.remaining !== null && stats?.remaining === 0;

  return (
    <PageShell
      title="Communities"
      subtitle="Manage all communities and tenants"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {stats && (
            <span style={{ fontSize: 12, color: atLimit ? '#EF4444' : '#6B7280' }}>
              {stats.remaining !== null
                ? `${stats.created}/${stats.limit} created`
                : `${stats.created} created`}
            </span>
          )}
          <Link
            href="/communities/new"
            className={atLimit ? 'db-btn-secondary' : 'db-btn-primary'}
            style={{ opacity: atLimit ? 0.5 : 1, pointerEvents: atLimit ? 'none' : 'auto' }}
          >
            + New Community
          </Link>
        </div>
      }
    >
      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          className="db-input"
          placeholder="Search communities..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>Loading communities...</div>
      ) : (
        <div className="db-card" style={{ overflow: 'hidden' }}>
          <table className="db-table" style={{ width: '100%' }}>
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
              {!data?.communities?.length ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>
                    No communities found
                  </td>
                </tr>
              ) : (
                data.communities.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      {c.description && (
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{c.description.slice(0, 60)}</div>
                      )}
                    </td>
                    <td><code style={{ fontSize: 11 }}>{c.slug}</code></td>
                    <td>{c.district ?? c.location ?? '—'}</td>
                    <td>{c._count.memberships}</td>
                    <td>{c._count.events}</td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        color: STATUS_COLORS[c.status],
                        background: `${STATUS_COLORS[c.status]}18`
                      }}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link href={`/invitations?communityId=${c.id}`} className="db-btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}>
                          Invite
                        </Link>
                        <button
                          className="db-btn-secondary"
                          style={{ fontSize: 11, padding: '4px 8px', color: '#EF4444' }}
                          onClick={() => { if (confirm('Archive this community?')) archiveMutation.mutate(c.id); }}
                          disabled={c.status === 'ARCHIVED'}
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
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
    </PageShell>
  );
}
