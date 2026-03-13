'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApi } from '@/lib/api';
import { PageShell } from '../components/shell';
import { Button } from '../components/ui/button';
import { ListToolbar } from '../components/list-toolbar';
import { useToast } from '../components/toast';
import { ConfirmModal } from '../components/actions';
import { PaginationControls } from '../components/pagination-controls';
import { useDebouncedValue } from '@/lib/use-debounced-value';

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
  const { toast } = useToast();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [editId, setEditId] = useState('');
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const queryClient = useQueryClient();

  const {
    data: eventsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['events', searchQuery, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize)
      });
      if (searchQuery) {
        params.set('search', searchQuery);
      }
      const res = await api.get<{ events: Event[]; total: number; totalPages: number; page: number }>(`/events?${params.toString()}`);
      if (!res.success) {
        throw new Error(res.error.message);
      }
      const d = res.data as { events?: Event[]; total?: number; totalPages?: number } | Event[];
      if (Array.isArray(d)) {
        return { events: d, total: d.length, totalPages: 1 };
      }
      return {
        events: d.events ?? [],
        total: d.total ?? 0,
        totalPages: Math.max(1, d.totalPages ?? 1)
      };
    },
  });

  useEffect(() => {
    setSearchQuery(debouncedSearch.trim());
    setPage(1);
  }, [debouncedSearch]);

  const events = eventsData?.events ?? [];
  const total = eventsData?.total ?? 0;
  const totalPages = eventsData?.totalPages ?? 1;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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

  const saveMutation = useMutation({
    mutationFn: async () => {
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
      if (!res.success) {
        throw new Error(res.error.message);
      }
      return res;
    },
    onSuccess: () => {
      toast(modal === 'create' ? 'Event created successfully.' : 'Event updated successfully.', 'success');
      setModal(null);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (err: Error) => {
      toast(err.message, 'error');
    },
  });

  async function save() {
    setSaving(true);
    try {
      await saveMutation.mutateAsync();
    } finally {
      setSaving(false);
    }
  }

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/events/${id}/activate`, {});
      if (!res.success) {
        throw new Error((res as { error?: { message?: string } }).error?.message || 'Activation failed');
      }
      return res;
    },
    onMutate: (id: string) => {
      setActivating(id);
    },
    onSettled: () => {
      setActivating('');
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onSuccess: () => {
      toast('Event activated successfully.', 'success');
    },
    onError: (err: Error) => {
      toast(err.message, 'error');
    },
  });

  async function activate(id: string) {
    await activateMutation.mutateAsync(id);
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/events/${id}`);
      if (!res.success) {
        throw new Error((res as { error?: { message?: string } }).error?.message || 'Delete failed');
      }
      return res;
    },
    onSuccess: () => {
      toast('Event deleted successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      toast(err.message, 'error');
    },
  });

  async function remove(id: string) {
    await deleteMutation.mutateAsync(id);
  }

  const f = (k: keyof typeof form, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <PageShell
      title="Event Management"
      subtitle="Create, edit, activate, and manage Mahfil events."
    >
      {error && <div className="db-error">{(error as Error).message}</div>}

      <ListToolbar
        searchPlaceholder="Search by name or year…"
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={() => {
          setSearchQuery(searchInput.trim());
          setPage(1);
        }}
        primaryAction={{
          label: '+ New Event',
          onClick: openCreate,
        }}
      />

      <div className="db-table-card animate-page">
        <div className="db-table-header">
          <span className="db-table-title">Events</span>
          <span className="db-stat-badge db-stat-badge-blue">
            {isLoading
              ? 'Loading…'
              : `${events.length} on page / ${total} total`}
          </span>
        </div>
        {isLoading ? (
          <div className="db-empty">Loading events…</div>
        ) : events.length === 0 ? (
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
              {events.map((ev: Event) => (
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
                    <button className="db-action-btn db-action-btn-danger" type="button" onClick={() => setDeleteTarget(ev)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          loading={isLoading}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {modal && (
        <div className="db-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="db-modal animate-modal">
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
              <Button type="button" variant="outline" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving || !form.name || !form.year}
                onClick={save}
              >
                {saving ? 'Saving…' : (modal === 'create' ? 'Create Event' : 'Save Changes')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title={`Delete "${deleteTarget.name}"?`}
          description="This event will be archived/deleted from active operations. This action can impact related records."
          confirmLabel="Delete Event"
          loading={deleteMutation.isPending}
          onConfirm={() => remove(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </PageShell>
  );
}
