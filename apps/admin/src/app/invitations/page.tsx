'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../components/shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '../components/toast';
import { useCommunity } from '../providers';
import {
  useInvitations,
  useCreateInvitation,
  useCancelInvitation,
  useResendInvitation,
} from '@/hooks/useInvitations';
import { TableCard } from '@/components/shared/TableCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import styles from './invitations.module.css';
import formStyles from '@/styles/form.module.css';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'var(--color-warning)',
  USED: 'var(--color-success)',
  EXPIRED: 'var(--color-text-muted)',
  CANCELLED: 'var(--color-danger)',
};

const BLANK = {
  email: '', fullName: '', phoneNumber: '', role: 'collector', note: '', expiresInDays: '7',
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
  const [form, setForm] = useState({ ...BLANK });

  const { data, isLoading } = useInvitations({ communityId, status: statusFilter });
  const createInvitation = useCreateInvitation(communityId);
  const cancelInvitation = useCancelInvitation(communityId);
  const resendInvitation = useResendInvitation(communityId);

  const invitations = data?.invitations ?? [];

  async function handleCreate() {
    try {
      const result = await createInvitation.mutateAsync({
        email: form.email,
        fullName: form.fullName,
        phoneNumber: form.phoneNumber || undefined,
        role: form.role,
        note: form.note || undefined,
        expiresInDays: parseInt(form.expiresInDays),
      });
      setCreatedCode(result.invitation.inviteCode ?? null);
      setShowCreate(false);
      setForm({ ...BLANK });
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
                <label className={formStyles.label}>Full Name *</label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  required
                />
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Email *</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className={formStyles.formRow}>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Phone</label>
                <Input
                  value={form.phoneNumber}
                  onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                />
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Role</label>
                <select
                  className={formStyles.nativeSelect}
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="admin">Admin</option>
                  <option value="collector">Collector</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            <div className={formStyles.formRow}>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Expires in (days)</label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={form.expiresInDays}
                  onChange={(e) => setForm((f) => ({ ...f, expiresInDays: e.target.value }))}
                />
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Note</label>
                <Input
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className={formStyles.formActions}>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={createInvitation.isPending}>
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
