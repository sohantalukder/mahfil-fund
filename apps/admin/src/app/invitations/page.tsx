'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { PageShell } from '../components/shell';
import { useToast } from '../components/toast';
import { useCommunity } from '../providers';

interface Invitation {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  inviteCode?: string;
  createdBy?: { fullName?: string; email: string };
}

interface InvitationsResponse {
  invitations: Invitation[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#D97706',
  USED: '#16A34A',
  EXPIRED: '#9CA3AF',
  CANCELLED: '#EF4444'
};

export default function InvitationsPage() {
  const searchParams = useSearchParams();
  const { activeCommunity, communities } = useCommunity();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [communityId, setCommunityId] = useState(
    searchParams.get('communityId') ?? activeCommunity?.id ?? ''
  );
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: '', fullName: '', phoneNumber: '', role: 'collector', note: '', expiresInDays: '7'
  });

  const { data, isLoading } = useQuery<InvitationsResponse>({
    queryKey: ['invitations', communityId, statusFilter],
    queryFn: async () => {
      if (!communityId) return { invitations: [], total: 0, page: 1, totalPages: 1 };
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/communities/${communityId}/invitations?${params}`, {
        headers: { 'X-Community-Id': communityId }
      });
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json() as { data: InvitationsResponse };
      return json.data;
    },
    enabled: !!communityId
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await fetch(`/api/communities/${communityId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Community-Id': communityId },
        body: JSON.stringify({ ...payload, expiresInDays: parseInt(payload.expiresInDays) })
      });
      const json = await res.json() as { data?: { invitation: Invitation }; error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed');
      return json.data!;
    },
    onSuccess: (data) => {
      setCreatedCode(data.invitation.inviteCode ?? null);
      setShowCreate(false);
      setForm({ email: '', fullName: '', phoneNumber: '', role: 'collector', note: '', expiresInDays: '7' });
      void queryClient.invalidateQueries({ queryKey: ['invitations', communityId] });
    },
    onError: (e: Error) => addToast({ type: 'error', message: e.message })
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invitations/${id}/cancel`, { method: 'POST', headers: { 'X-Community-Id': communityId } });
      if (!res.ok) throw new Error('Failed to cancel');
    },
    onSuccess: () => {
      addToast({ type: 'success', message: 'Invitation cancelled' });
      void queryClient.invalidateQueries({ queryKey: ['invitations', communityId] });
    }
  });

  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invitations/${id}/resend`, { method: 'POST', headers: { 'X-Community-Id': communityId } });
      const json = await res.json() as { data?: { invitation: { inviteCode: string } }; error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed');
      return json.data!;
    },
    onSuccess: (data) => {
      setCreatedCode(data.invitation.inviteCode);
      addToast({ type: 'success', message: 'New code generated!' });
      void queryClient.invalidateQueries({ queryKey: ['invitations', communityId] });
    }
  });

  return (
    <PageShell
      title="Invitations"
      subtitle="Manage community invitations and invite codes"
      actions={
        <button className="db-btn-primary" onClick={() => setShowCreate(true)} disabled={!communityId}>
          + Create Invitation
        </button>
      }
    >
      {/* Created code banner */}
      {createdCode && (
        <div className="db-alert-success" style={{ marginBottom: 20, padding: 16, borderRadius: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Invitation created! Share this code:</div>
          <div style={{ fontSize: 22, fontFamily: 'monospace', letterSpacing: 4, fontWeight: 700 }}>{createdCode}</div>
          <button style={{ marginTop: 8, fontSize: 12 }} onClick={() => { void navigator.clipboard.writeText(createdCode); addToast({ type: 'success', message: 'Copied!' }); }}>
            Copy code
          </button>
        </div>
      )}

      {/* Community selector & filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select
          className="db-input"
          style={{ flex: '0 0 240px' }}
          value={communityId}
          onChange={(e) => setCommunityId(e.target.value)}
        >
          <option value="">Select community</option>
          {communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="db-input" style={{ flex: '0 0 160px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="USED">Used</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="db-card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>New Invitation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="db-form-group">
              <label className="db-label">Full Name *</label>
              <input className="db-input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            </div>
            <div className="db-form-group">
              <label className="db-label">Email *</label>
              <input className="db-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="db-form-group">
              <label className="db-label">Phone</label>
              <input className="db-input" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
            </div>
            <div className="db-form-group">
              <label className="db-label">Role</label>
              <select className="db-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="admin">Admin</option>
                <option value="collector">Collector</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="db-form-group">
              <label className="db-label">Expires in (days)</label>
              <input className="db-input" type="number" min={1} max={30} value={form.expiresInDays} onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })} />
            </div>
            <div className="db-form-group">
              <label className="db-label">Note</label>
              <input className="db-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
            <button className="db-btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="db-btn-primary" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Invitation'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>Loading...</div>
      ) : (
        <div className="db-card" style={{ overflow: 'hidden' }}>
          <table className="db-table" style={{ width: '100%' }}>
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
              {!data?.invitations?.length ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>No invitations found</td></tr>
              ) : data.invitations.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{inv.fullName}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{inv.email}</div>
                  </td>
                  <td><span style={{ fontSize: 11, textTransform: 'capitalize' }}>{inv.role}</span></td>
                  <td>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: STATUS_COLORS[inv.status], background: `${STATUS_COLORS[inv.status]}18` }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{new Date(inv.expiresAt).toLocaleDateString('en-US')}</td>
                  <td style={{ fontSize: 12 }}>{inv.createdBy?.fullName ?? inv.createdBy?.email ?? '—'}</td>
                  <td>
                    {inv.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="db-btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => resendMutation.mutate(inv.id)} disabled={resendMutation.isPending}>
                          Resend
                        </button>
                        <button className="db-btn-secondary" style={{ fontSize: 11, padding: '3px 8px', color: '#EF4444' }} onClick={() => cancelMutation.mutate(inv.id)}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
