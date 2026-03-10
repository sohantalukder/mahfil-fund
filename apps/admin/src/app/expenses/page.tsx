'use client';

import { useEffect, useMemo, useState } from 'react';
import { getApi } from '@/lib/api';
import { PageShell } from '../components/shell';
import { ActionsMenu, ConfirmModal } from '../components/actions';
import { useToast } from '../components/toast';
import { Button } from '../components/ui/button';

type Event = { id: string; name: string; year: number; isActive: boolean };
type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  expenseDate: string;
  status: string;
  vendor?: string;
  paymentMethod: string;
};

const BLANK = { title: '', category: '', amount: '', expenseDate: new Date().toISOString().slice(0, 10), vendor: '', paymentMethod: 'CASH', note: '' };
const fmt = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const fmtBDT = (n: number) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(n);

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

export default function AdminExpensesPage() {
  const api = useMemo(() => getApi(), []);
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [editId, setEditId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get<{ events: Event[] }>('/events')
      .then((res) => {
        const list = res.success ? ((res.data as any).events ?? res.data ?? []) : [];
        setEvents(list);
        const active = list.find((e: Event) => e.isActive) || list[0];
        if (active) { setEventId(active.id); load(active.id); }
      })
      .catch(() => {})
      .finally(() => setEventsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load(id = eventId) {
    if (!id) return;
    setLoading(true);
    const res = await api.get<{ expenses: Expense[] }>(`/expenses?eventId=${id}`);
    setLoading(false);
    if (!res.success) { toast(res.error.message, 'error'); return; }
    setExpenses((res.data as any).expenses ?? res.data ?? []);
  }

  function openCreate() { setForm({ ...BLANK }); setModal('create'); }
  function openEdit(x: Expense) {
    setForm({ title: x.title, category: x.category, amount: String(x.amount), expenseDate: x.expenseDate.slice(0, 10), vendor: x.vendor || '', paymentMethod: x.paymentMethod, note: '' });
    setEditId(x.id); setModal('edit');
  }

  async function save() {
    setSaving(true);
    const body = { eventId, title: form.title, category: form.category, amount: parseFloat(form.amount), expenseDate: new Date(form.expenseDate), vendor: form.vendor || null, paymentMethod: form.paymentMethod, note: form.note || null };
    const res = modal === 'create'
      ? await api.post<Expense>('/expenses', body)
      : await api.patch<Expense>(`/expenses/${editId}`, body);
    setSaving(false);
    if (!res.success) { toast(res.error.message, 'error'); return; }
    toast(modal === 'create' ? 'Expense added.' : 'Expense updated.', 'success');
    setModal(null); load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await api.delete(`/expenses/${deleteTarget.id}`);
    setDeleting(false);
    if (!res.success) { toast((res as any).error?.message || 'Delete failed', 'error'); return; }
    toast(`"${deleteTarget.title}" deleted.`, 'success');
    setDeleteTarget(null); load();
  }

  const f = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const total = expenses.reduce((s, x) => s + x.amount, 0);
  const hasEvents = !eventsLoading && events.length > 0;

  return (
    <PageShell
      title="Expense Management"
      subtitle="Review, add, and manage event expenses."
      actions={
        <>
          <select className="db-input" style={{ minWidth: 160 }} value={eventId}
            onChange={(e) => { setEventId(e.target.value); load(e.target.value); }}>
            {eventsLoading && <option value="">Loading…</option>}
            {!eventsLoading && events.length === 0 && <option value="">No events found</option>}
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}{ev.isActive ? ' (Active)' : ''}</option>
            ))}
          </select>
          {hasEvents && (
            <Button type="button" onClick={openCreate} disabled={!eventId || eventsLoading}>
              + Add Expense
            </Button>
          )}
        </>
      }
    >
      <div className="db-stat-grid animate-page" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        <div className="db-stat-card animate-card">
          <div className="db-stat-title">Total Expenses</div>
          <div className="db-stat-value">{fmtBDT(total)}</div>
        </div>
        <div className="db-stat-card animate-card">
          <div className="db-stat-title">Number of Items</div>
          <div className="db-stat-value">{expenses.length}</div>
        </div>
        <div className="db-stat-card animate-card">
          <div className="db-stat-title">Avg per Item</div>
          <div className="db-stat-value">{expenses.length ? fmtBDT(total / expenses.length) : '—'}</div>
        </div>
      </div>

      <div className="db-table-card animate-card">
        <div className="db-table-header">
          <span className="db-table-title">Expenses</span>
          <span className="db-stat-badge db-stat-badge-blue">{expenses.length} items</span>
        </div>
        {!eventId ? (
          <div className="db-empty">Select an event to load expenses.</div>
        ) : expenses.length === 0 && !loading ? (
          <div className="db-empty">No expenses found for this event.</div>
        ) : (
          <table className="db-table">
            <thead>
              <tr><th>Title</th><th>Category</th><th>Method</th><th>Date</th><th style={{ textAlign: 'right' }}>Amount</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {expenses.map((x) => (
                <tr key={x.id}>
                  <td style={{ color: 'var(--db-td-em)' }}>{x.title}</td>
                  <td>{x.category}</td>
                  <td>{fmt(x.paymentMethod)}</td>
                  <td>{new Date(x.expenseDate).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--db-td-em)' }}>{fmtBDT(x.amount)}</td>
                  <td>
                    <ActionsMenu items={[
                      { label: 'Edit', icon: ICON_EDIT, onClick: () => openEdit(x) },
                      { label: 'Delete', icon: ICON_DELETE, onClick: () => setDeleteTarget(x), danger: true },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="db-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="db-modal animate-modal">
            <div className="db-modal-title">{modal === 'create' ? 'Add Expense' : 'Edit Expense'}</div>
            <div className="db-form-row">
              <div className="db-field">
                <label className="db-label">Title *</label>
                <input className="db-input" value={form.title} onChange={(e) => f('title', e.target.value)} placeholder="Expense title" />
              </div>
              <div className="db-field">
                <label className="db-label">Category *</label>
                <input className="db-input" value={form.category} onChange={(e) => f('category', e.target.value)} placeholder="e.g. Catering" />
              </div>
            </div>
            <div className="db-form-row">
              <div className="db-field">
                <label className="db-label">Amount (BDT) *</label>
                <input className="db-input" type="number" value={form.amount} onChange={(e) => f('amount', e.target.value)} placeholder="0" />
              </div>
              <div className="db-field">
                <label className="db-label">Date *</label>
                <input className="db-input" type="date" value={form.expenseDate} onChange={(e) => f('expenseDate', e.target.value)} />
              </div>
            </div>
            <div className="db-form-row">
              <div className="db-field">
                <label className="db-label">Payment Method</label>
                <select className="db-select" value={form.paymentMethod} onChange={(e) => f('paymentMethod', e.target.value)}>
                  <option value="CASH">Cash</option>
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="BANK">Bank</option>
                </select>
              </div>
              <div className="db-field">
                <label className="db-label">Vendor</label>
                <input className="db-input" value={form.vendor} onChange={(e) => f('vendor', e.target.value)} placeholder="Vendor name" />
              </div>
            </div>
            <div className="db-field">
              <label className="db-label">Note</label>
              <textarea className="db-textarea" value={form.note} onChange={(e) => f('note', e.target.value)} placeholder="Optional notes…" />
            </div>
            <div className="db-form-actions">
              <Button type="button" variant="outline" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving || !form.title || !form.category || !form.amount}
                onClick={save}
              >
                {saving ? 'Saving…' : (modal === 'create' ? 'Add Expense' : 'Save Changes')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title={`Delete "${deleteTarget.title}"?`}
          description="This expense record will be permanently removed."
          confirmLabel="Delete Expense"
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </PageShell>
  );
}
