'use client';

import { useEffect, useMemo, useState } from 'react';
import { getApi } from '@/lib/api';
import { PageShell } from '../components/shell';

type Event = {
  id: string;
  name: string;
  year: number;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  targetAmount?: number;
};

const BLANK = { name: '', year: new Date().getFullYear(), startsAt: '', endsAt: '', targetAmount: '' };
const fmtBDT = (n: number) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(n);

export default function AdminEventsPage() {
  const api = useMemo(() => getApi(), []);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [editId, setEditId] = useState('');
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState('');

  async function load() {
    setLoading(true); setError(null);
    const res = await api.get<{ events: Event[] }>('/events');
    setLoading(false);
    if (!res.success) { setError(res.error.message); return; }
    const list = (res.data as any).events ?? res.data ?? [];
    setEvents(list);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() { setForm({ ...BLANK }); setModal('create'); }
  function openEdit(ev: Event) {
    setForm({
      name: ev.name,
      year: ev.year,
      startsAt: ev.startsAt ? ev.startsAt.slice(0, 10) : '',
      endsAt: ev.endsAt ? ev.endsAt.slice(0, 10) : '',
      targetAmount: ev.targetAmount ? String(ev.targetAmount) : '',
    });
    setEditId(ev.id); setModal('edit');
  }

  async function save() {
    setSaving(true); setError(null);
    const body = {
      name: form.name,
      year: Number(form.year),
      startsAt: form.startsAt ? new Date(form.startsAt) : undefined,
      endsAt: form.endsAt ? new Date(form.endsAt) : undefined,
      targetAmount: form.targetAmount ? parseFloat(form.targetAmount) : undefined,
    };
    const res = modal === 'create'
      ? await api.post<Event>('/events', body)
      : await api.patch<Event>(`/events/${editId}`, body);
    setSaving(false);
    if (!res.success) { setError(res.error.message); return; }
    setModal(null); load();
  }

  async function activate(id: string) {
    setActivating(id);
    const res = await api.post(`/events/${id}/activate`, {});
    setActivating('');
    if (!res.success) { setError((res as any).error?.message || 'Activation failed'); return; }
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this event? All associated data may be affected.')) return;
    const res = await api.delete(`/events/${id}`);
    if (!res.success) { setError((res as any).error?.message || 'Delete failed'); return; }
    load();
  }

  const f = (k: keyof typeof form, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <PageShell
      title="Event Management"
      subtitle="Create, edit, activate, and manage Mahfil events."
      actions={<button className="db-btn db-btn-primary" type="button" onClick={openCreate}>+ New Event</button>}
    >
      {error && <div className="db-error">{error}</div>}

      <div className="db-table-card">
        <div className="db-table-header">
          <span className="db-table-title">Events</span>
          <span className="db-stat-badge db-stat-badge-blue">{events.length} total</span>
        </div>
        {events.length === 0 && !loading ? (
          <div className="db-empty">No events found. Create your first event.</div>
        ) : (
          <table className="db-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Year</th>
                <th>Starts</th>
                <th>Ends</th>
                <th>Target</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td style={{ color: 'var(--db-td-em)', fontWeight: 500 }}>{ev.name}</td>
                  <td>{ev.year}</td>
                  <td>{ev.startsAt ? new Date(ev.startsAt).toLocaleDateString() : '—'}</td>
                  <td>{ev.endsAt ? new Date(ev.endsAt).toLocaleDateString() : '—'}</td>
                  <td>{ev.targetAmount ? fmtBDT(ev.targetAmount) : '—'}</td>
                  <td>
                    {ev.isActive
                      ? <span className="db-status-active">Active</span>
                      : <span className="db-status-archived">Inactive</span>}
                  </td>
                  <td>
                    {!ev.isActive && (
                      <button className="db-action-btn" type="button" disabled={activating === ev.id}
                        onClick={() => activate(ev.id)}>
                        {activating === ev.id ? '…' : 'Activate'}
                      </button>
                    )}
                    <button className="db-action-btn" type="button" onClick={() => openEdit(ev)}>Edit</button>
                    <button className="db-action-btn db-action-btn-danger" type="button" onClick={() => remove(ev.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="db-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="db-modal">
            <div className="db-modal-title">{modal === 'create' ? 'New Event' : 'Edit Event'}</div>
            <div className="db-form-row">
              <div className="db-field">
                <label className="db-label">Event Name *</label>
                <input className="db-input" value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="e.g. Ramadan Iftar 2025" />
              </div>
              <div className="db-field">
                <label className="db-label">Year *</label>
                <input className="db-input" type="number" value={form.year} onChange={(e) => f('year', e.target.value)} />
              </div>
            </div>
            <div className="db-form-row">
              <div className="db-field">
                <label className="db-label">Start Date</label>
                <input className="db-input" type="date" value={form.startsAt} onChange={(e) => f('startsAt', e.target.value)} />
              </div>
              <div className="db-field">
                <label className="db-label">End Date</label>
                <input className="db-input" type="date" value={form.endsAt} onChange={(e) => f('endsAt', e.target.value)} />
              </div>
            </div>
            <div className="db-field">
              <label className="db-label">Target Amount (BDT)</label>
              <input className="db-input" type="number" value={form.targetAmount} onChange={(e) => f('targetAmount', e.target.value)} placeholder="0" />
            </div>
            <div className="db-form-actions">
              <button className="db-btn" type="button" onClick={() => setModal(null)}>Cancel</button>
              <button className="db-btn db-btn-primary" type="button"
                disabled={saving || !form.name || !form.year} onClick={save}>
                {saving ? 'Saving…' : (modal === 'create' ? 'Create Event' : 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
