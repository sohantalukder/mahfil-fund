'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../components/shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '../components/toast';
import { useCommunity } from '../providers';
import { useUsers } from '@/hooks/useUsers';
import {
  useInvitations,
  useCreateInvitation,
  useCancelInvitation,
  useResendInvitation,
} from '@/hooks/useInvitations';
import { TableCard } from '@/components/shared/TableCard';
import styles from './invitations.module.css';
import formStyles from '@/styles/form.module.css';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'var(--color-warning)',
  USED: 'var(--color-success)',
  EXPIRED: 'var(--color-text-muted)',
  CANCELLED: 'var(--color-danger)',
};

export default function InvitationsPage() {
  return <Suspense><InvitationsContent /></Suspense>;
}

function InvitationsContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { activeCommunity, communities } = useCommunity();
  const { toast } = useToast();

  const [communityId, setCommunityId] = useState(
    searchParams.get('communityId') ?? activeCommunity?.id ?? ''
  );
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  // Simple flow: select external users -> expiry -> note
  const [userSearch, setUserSearch] = useState('');
  const [userToAddId, setUserToAddId] = useState<string>('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState<string>('7');
  const [note, setNote] = useState<string>('');

  const { data, isLoading } = useInvitations({ communityId, status: statusFilter });
  const createInvitation = useCreateInvitation(communityId);
  const cancelInvitation = useCancelInvitation(communityId);
  const resendInvitation = useResendInvitation(communityId);

  const invitations = data?.invitations ?? [];

  const { data: usersData } = useUsers({
    page: 1,
    pageSize: 50,
    search: userSearch,
  });
  const users = usersData?.users ?? [];

  const selectedUsers = useMemo(() => {
    const map = new Map(users.map((u) => [u.id, u]));
    return selectedUserIds.map((id) => map.get(id)).filter(Boolean) as typeof users;
  }, [users, selectedUserIds]);

  const selectedUserEmails = useMemo(
    () =>
      selectedUsers.map((u) => ({
        id: u.id,
        email: u.email ?? '',
        fullName: u.fullName ?? '',
      })),
    [selectedUsers]
  );

  async function handleAddSelectedUser() {
    if (!userToAddId) return;
    setSelectedUserIds((ids) => (ids.includes(userToAddId) ? ids : [...ids, userToAddId]));
    setUserToAddId('');
  }

  async function handleCreate() {
    try {
      if (selectedUserEmails.length === 0) {
        toast('Select at least one user', 'error');
        return;
      }

      const expires = parseInt(expiresInDays);
      if (!Number.isFinite(expires) || expires < 1 || expires > 30) {
        toast('Expires in (days) must be between 1 and 30', 'error');
        return;
      }

      const missing = selectedUserEmails.find((u) => !u.email);
      if (missing) {
        toast('Selected user is missing email', 'error');
        return;
      }

      // Backend creates 1 invitation per email. External user role is `viewer`.
      const promises = selectedUserEmails.map((u) =>
        createInvitation.mutateAsync({
          email: u.email,
          fullName: u.fullName || u.email,
          role: 'viewer',
          note: note.trim() ? note.trim() : undefined,
          expiresInDays: expires,
        })
      );

      const results = await Promise.all(promises);
      const last = results[results.length - 1];
      setCreatedCode(last.invitation.inviteCode ?? null);
      setShowCreate(false);
      setSelectedUserIds([]);
      setUserToAddId('');
      setExpiresInDays('7');
      setNote('');
      toast('Invitation created!', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create invitation', 'error');
    }
  }

  async function handleCancel(id: string) {
    try {
      await cancelInvitation.mutateAsync(id);
      toast('Invitation cancelled', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to cancel', 'error');
    }
  }

  async function handleResend(id: string) {
    try {
      const result = await resendInvitation.mutateAsync(id);
      setCreatedCode(result.invitation.inviteCode);
      toast('New code generated!', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to resend', 'error');
    }
  }

  return (
    <PageShell
      title={t('dashboard.invitationsTitle')}
      subtitle={t('dashboard.invitationsSubtitleAlt')}
      actions={
        <Button onClick={() => setShowCreate(true)} disabled={!communityId}>
          + Create Invitation
        </Button>
      }
    >
      {createdCode && (
        <div className={styles.codeBanner}>
          <div className={styles.codeLabel}>Invitation created! Share this code:</div>
          <div className={styles.code}>{createdCode}</div>
          <button
            type="button"
            className={styles.copyBtn}
            onClick={() => {
              void navigator.clipboard.writeText(createdCode);
              toast('Copied!', 'success');
            }}
          >
            Copy code
          </button>
        </div>
      )}

      <div className={styles.filterRow}>
        <select
          className={`${styles.filterSelect} min-w-[200px]`}
          value={communityId}
          onChange={(e) => setCommunityId(e.target.value)}
        >
          <option value="">Select community</option>
          {communities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="USED">Used</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {showCreate && (
        <div className={styles.createCard}>
          <h3 className={styles.createTitle}>New Invitation</h3>
          <div className={formStyles.formGrid}>
            <div className={formStyles.formRow}>
              <div className={formStyles.field}>
                <label className={formStyles.label}>External Users *</label>
                <Input
                  placeholder="Search users by name/email"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />

                <div className="mt-2 flex items-center gap-2">
                  <select
                    className={formStyles.nativeSelect}
                    value={userToAddId}
                    onChange={(e) => setUserToAddId(e.target.value)}
                    disabled={!communityId}
                  >
                    <option value="">Select a user</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {(u.fullName?.trim() || u.email) ?? u.id}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!userToAddId || selectedUserIds.includes(userToAddId)}
                    onClick={() => void handleAddSelectedUser()}
                  >
                    Add
                  </Button>
                </div>

                {selectedUserIds.length > 0 && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    <div className="mb-2">Selected:</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedUserIds.map((id) => {
                        const u = users.find((x) => x.id === id);
                        const label = u?.fullName?.trim() || u?.email || id;
                        return (
                          <div
                            key={id}
                            className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1"
                          >
                            <span>{label}</span>
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => setSelectedUserIds((ids) => ids.filter((x) => x !== id))}
                            >
                              remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className={formStyles.formRow}>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Expires in (days) *</label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                />
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Note</label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
          </div>
          <div className={formStyles.formActions}>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={createInvitation.isPending || selectedUserIds.length === 0}
            >
              {createInvitation.isPending ? 'Creating…' : 'Create Invitation'}
            </Button>
          </div>
        </div>
      )}

      <TableCard
        title="Invitations"
        badge={data ? `${invitations.length} of ${data.total}` : undefined}
        empty={!isLoading && invitations.length === 0 ? 'No invitations found.' : undefined}
      >
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">
            Loading…
          </div>
        ) : invitations.length > 0 ? (
          <table className="dataTable">
            <thead>
              <tr>
                <th>Name / Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Created By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <div className="font-semibold text-foreground">{inv.fullName}</div>
                    <div className="text-[11px] text-muted-foreground">{inv.email}</div>
                  </td>
                  <td className="text-xs capitalize">{inv.role}</td>
                  <td>
                    {/* badge color/bg derives from STATUS_COLORS map at runtime — kept as inline */}
                    <span
                      className={styles.statusBadge}
                      style={{
                        color: STATUS_COLORS[inv.status] ?? 'var(--color-text-muted)',
                        background: (STATUS_COLORS[inv.status] ?? 'var(--color-text-muted)') + '18',
                      }}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="text-xs">{new Date(inv.expiresAt).toLocaleDateString()}</td>
                  <td className="text-xs">
                    {(inv as { createdBy?: { fullName?: string; email?: string } }).createdBy?.fullName ??
                     (inv as { createdBy?: { fullName?: string; email?: string } }).createdBy?.email ??
                     '—'}
                  </td>
                  <td>
                    {inv.status === 'PENDING' && (
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => void handleResend(inv.id)}
                          disabled={resendInvitation.isPending}
                        >
                          Resend
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.cancelBtn}`}
                          onClick={() => void handleCancel(inv.id)}
                          disabled={cancelInvitation.isPending}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </TableCard>
    </PageShell>
  );
}
