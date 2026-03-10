'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getApi } from '@/lib/api';
import { PageShell } from '../components/shell';
import { ActionsMenu, ConfirmModal } from '../components/actions';
import { useToast } from '../components/toast';

type Donor = {
  id: string;
  fullName: string;
  phone: string;
  altPhone?: string;
  address?: string;
  donorType: string;
  status: string;
  note?: string;
};

const BLANK: Omit<Donor, 'id' | 'status'> = {
  fullName: '', phone: '', altPhone: '', address: '', donorType: 'individual', note: '',
};

const fmt = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const ICON_EDIT = (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M11 2l3 3-8 8H3v-3L11 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);
const ICON_DELETE = (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M3 5h10M6 5V3h4v2M6 8v4M10 8v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="2" y="5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

export default function AdminDonorsPage() {
  const api = useMemo(() => getApi(), []);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [donors, setDonors] = useState<Donor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [editId, setEditId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Donor | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load(q = search) {
    setLoading(true);
    const query = q ? `?search=${encodeURIComponent(q)}` : '';
    const res = await api.get<{ donors: Donor[] }>(`/donors${query}`);
    setLoading(false);
    if (!res.success) { toast(res.error.message, 'error'); return; }
    setDonors((res.data as any).donors ?? res.data ?? []);
  }

  useEffect(() => {
    const initial = searchParams.get('search') ?? '';
    setSearch(initial);
    load(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function openCreate() { setForm({ ...BLANK }); setModal('create'); }
  function openEdit(d: Donor) {
    setForm({ fullName: d.fullName, phone: d.phone, altPhone: d.altPhone || '', address: d.address || '', donorType: d.donorType, note: d.note || '' });
    setEditId(d.id); setModal('edit');
  }

  async function save() {
    setSaving(true);
    const body = { fullName: form.fullName, phone: form.phone, altPhone: form.altPhone || null, address: form.address || null, donorType: form.donorType, note: form.note || null, preferredLanguage: 'en', tags: [] };
    const res = modal === 'create'
      ? await api.post<Donor>('/donors', body)
      : await api.patch<Donor>(`/donors/${editId}`, body);
    setSaving(false);
    if (!res.success) { toast(res.error.message, 'error'); return; }
    toast(modal === 'create' ? 'Donor added successfully.' : 'Donor updated successfully.', 'success');
    setModal(null); load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await api.delete(`/donors/${deleteTarget.id}`);
    setDeleting(false);
    if (!res.success) { toast((res as any).error?.message || 'Delete failed', 'error'); return; }
    toast(`${deleteTarget.fullName} deleted.`, 'success');
    setDeleteTarget(null); load();
  }

  const f = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <PageShell
      title="Donor Management"
      subtitle="Search, add, edit, and remove donor records."
      actions={<button className="db-btn db-btn-primary" type="button" onClick={openCreate}>+ Add Donor</button>}
    >
      <div className="db-toolbar">
        <input
          className="db-input"
          style={{ flex: 1, maxWidth: 320 }}
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <button className="db-btn db-btn-primary" type="button" onClick={() => load()}>Search</button>
      </div>

      <div className="db-table-card">
        <div className="db-table-header">
          <span className="db-table-title">Donors</span>
          <span className="db-stat-badge db-stat-badge-blue">{donors.length} results</span>
        </div>
        {donors.length === 0 && !loading ? (
          <div className="db-empty">No donors found. Try a different search or add a new donor.</div>
        ) : (
          <table className="db-table">
            <thead>
              <tr><th>Name</th><th>Phone</th><th>Type</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {donors.map((d) => {
                const initials = d.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <tr key={d.id}>
                    <td>
                      <div className="db-donor-cell">
                        <div className="db-donor-avatar">{initials}</div>
                        <span style={{ color: 'var(--db-td-em)' }}>{d.fullName}</span>
                      </div>
                    </td>
                    <td>{d.phone}</td>
                    <td>{fmt(d.donorType)}</td>
                    <td>
                      <span className={d.status === 'ACTIVE' ? 'db-status-active' : 'db-status-archived'}>
                        {fmt(d.status)}
                      </span>
                    </td>
                    <td>
                      <ActionsMenu items={[
                        { label: 'Edit', icon: ICON_EDIT, onClick: () => openEdit(d) },
                        { label: 'Delete', icon: ICON_DELETE, onClick: () => setDeleteTarget(d), danger: true },
                      ]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="db-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="db-modal">
            <div className="db-modal-title">{modal === 'create' ? 'Add Donor' : 'Edit Donor'}</div>
            <div className="db-form-row">
              <div className="db-field">
                <label className="db-label">Full Name *</label>
                <input className="db-input" value={form.fullName} onChange={(e) => f('fullName', e.target.value)} placeholder="Full name" />
              </div>
              <div className="db-field">
                <label className="db-label">Phone *</label>
                <input className="db-input" value={form.phone} onChange={(e) => f('phone', e.target.value)} placeholder="+880…" />
              </div>
            </div>
            <div className="db-form-row">
              <div className="db-field">
                <label className="db-label">Alt Phone</label>
                <input className="db-input" value={form.altPhone} onChange={(e) => f('altPhone', e.target.value)} placeholder="Optional" />
              </div>
              <div className="db-field">
                <label className="db-label">Donor Type</label>
                <select className="db-select" value={form.donorType} onChange={(e) => f('donorType', e.target.value)}>
                  <option value="individual">Individual</option>
                  <option value="family">Family</option>
                  <option value="business">Business</option>
                  <option value="organization">Organization</option>
                </select>
              </div>
            </div>
            <div className="db-field">
              <label className="db-label">Address</label>
              <input className="db-input" value={form.address} onChange={(e) => f('address', e.target.value)} placeholder="Address" />
            </div>
            <div className="db-field">
              <label className="db-label">Note</label>
              <textarea className="db-textarea" value={form.note} onChange={(e) => f('note', e.target.value)} placeholder="Internal notes…" />
            </div>
            <div className="db-form-actions">
              <button className="db-btn" type="button" onClick={() => setModal(null)}>Cancel</button>
              <button className="db-btn db-btn-primary" type="button" disabled={saving || !form.fullName || !form.phone} onClick={save}>
                {saving ? 'Saving…' : (modal === 'create' ? 'Add Donor' : 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title={`Delete "${deleteTarget.fullName}"?`}
          description="This donor will be permanently removed. This action cannot be undone."
          confirmLabel="Delete Donor"
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </PageShell>
  );
}
