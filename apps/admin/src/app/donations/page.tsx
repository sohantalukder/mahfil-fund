'use client';

import { useEffect, useMemo, useState } from 'react';
import { getApi } from '@/lib/api';
import { PageShell } from '../components/shell';
import { ActionsMenu, ConfirmModal } from '../components/actions';
import { useToast } from '../components/toast';
import { Button } from '../components/ui/button';

type Event = { id: string; name: string; year: number; isActive: boolean };

type Donor = {
  id: string;
  fullName: string;
  phone: string;
};

type Donation = {
  id: string;
  eventId: string;
  donorId: string;
  donorSnapshotName: string;
  donorSnapshotPhone: string;
  amount: number;
  paymentMethod: string;
  donationDate: string;
  note?: string | null;
};

type DonationFormState = {
  donorId: string;
  donorFullName: string;
  donorPhone: string;
  amount: string;
  paymentMethod: string;
  donationDate: string;
  note: string;
};

const BLANK: DonationFormState = {
  donorId: '',
  donorFullName: '',
  donorPhone: '',
  amount: '',
  paymentMethod: 'CASH',
  donationDate: new Date().toISOString().slice(0, 10),
  note: '',
};

const fmt = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const fmtBDT = (n: number) =>
  `৳ ${new Intl.NumberFormat('en-BD', {
    maximumFractionDigits: 0,
  }).format(n)}`;

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

export default function AdminDonationsPage() {
  const api = useMemo(() => getApi(), []);
  const { toast } = useToast();

  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState('');
  const [eventsLoading, setEventsLoading] = useState(true);

  const [donors, setDonors] = useState<Donor[]>([]);
  const [donorSearch, setDonorSearch] = useState('');
  const [donorsLoading, setDonorsLoading] = useState(true);

  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(false);

  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<DonationFormState>({ ...BLANK });
  const [useExistingDonor, setUseExistingDonor] = useState(true);
  const [editId, setEditId] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Donation | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get<{ events: Event[] }>('/events')
      .then((res) => {
        const list = res.success ? ((res.data as any).events ?? res.data ?? []) : [];
        setEvents(list);
        const active = list.find((e: Event) => e.isActive) || list[0];
        if (active) {
          setEventId(active.id);
          loadDonations(active.id);
        }
      })
      .catch(() => {})
      .finally(() => setEventsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api
      .get<{ donors: Donor[] }>('/donors')
      .then((res) => {
        const list = res.success ? ((res.data as any).donors ?? res.data ?? []) : [];
        const sorted = [...list].sort((a: Donor, b: Donor) => a.fullName.localeCompare(b.fullName));
        setDonors(sorted);
      })
      .catch(() => {})
      .finally(() => setDonorsLoading(false));
  }, [api]);

  async function loadDonations(id = eventId) {
    if (!id) return;
    setLoading(true);
    const res = await api.get<{ donations: Donation[] }>(`/donations?eventId=${id}`);
    setLoading(false);
    if (!res.success) {
      toast(res.error.message, 'error');
      return;
    }
    setDonations((res.data as any).donations ?? res.data ?? []);
  }

  function openCreate() {
    setForm({
      ...BLANK,
      donationDate: new Date().toISOString().slice(0, 10),
    });
    setUseExistingDonor(true);
    setEditId('');
    setModal('create');
  }

  function openEdit(x: Donation) {
    setForm({
      donorId: x.donorId,
      donorFullName: '',
      donorPhone: '',
      amount: String(x.amount),
      paymentMethod: x.paymentMethod,
      donationDate: x.donationDate.slice(0, 10),
      note: x.note ?? '',
    });
    setUseExistingDonor(true);
    setEditId(x.id);
    setModal('edit');
  }

  const updateForm = (k: keyof DonationFormState, v: string) =>
    setForm((p) => ({
      ...p,
      [k]: v,
    }));

  async function save() {
    if (!eventId) {
      toast('Please select an event first.', 'error');
      return;
    }

    let donorId = form.donorId;

    if (modal === 'create' && !useExistingDonor) {
      if (!form.donorFullName.trim() || !form.donorPhone.trim()) {
        toast('Donor name and phone are required.', 'error');
        return;
      }
      try {
        const donorRes = await api.post<Donor>('/donors', {
          fullName: form.donorFullName.trim(),
          phone: form.donorPhone.trim(),
          altPhone: null,
          address: null,
          donorType: 'individual',
          note: null,
          preferredLanguage: 'en',
          tags: [],
        });
        if (!donorRes.success) {
          toast(donorRes.error.message, 'error');
          return;
        }
        const created = (donorRes.data as any).donor ?? donorRes.data;
        donorId = created.id;
        setDonors((prev) => [created as Donor, ...prev]);
      } catch (e) {
        toast('Failed to create donor for this donation.', 'error');
        return;
      }
    }

    const amountValue = parseFloat(form.amount);
    if (!donorId || Number.isNaN(amountValue) || amountValue <= 0) {
      toast('Donor and a positive amount are required.', 'error');
      return;
    }

    setSaving(true);
    const body = {
      eventId,
      donorId,
      amount: amountValue,
      paymentMethod: form.paymentMethod,
      donationDate: new Date(form.donationDate),
      note: form.note || null,
    };

    const res =
      modal === 'create'
        ? await api.post<Donation>('/donations', body)
        : await api.patch<Donation>(`/donations/${editId}`, body);
    setSaving(false);

    if (!res.success) {
      toast(res.error.message, 'error');
      return;
    }

    toast(modal === 'create' ? 'Donation added.' : 'Donation updated.', 'success');
    setModal(null);
    loadDonations();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await api.delete(`/donations/${deleteTarget.id}`);
    setDeleting(false);
    if (!res.success) {
      toast((res as any).error?.message || 'Delete failed', 'error');
      return;
    }
    toast(`Donation from ${deleteTarget.donorSnapshotName} deleted.`, 'success');
    setDeleteTarget(null);
    loadDonations();
  }

  const totalAmount = donations.reduce((s, x) => s + x.amount, 0);
  const uniqueDonors = new Set(donations.map((d) => d.donorId)).size;
  const hasEvents = !eventsLoading && events.length > 0;

  const filteredDonors = useMemo(() => {
    const q = donorSearch.trim().toLowerCase();
    if (!q) return donors;
    return donors.filter(
      (d) =>
        d.fullName.toLowerCase().includes(q) ||
        (d.phone ?? '').toLowerCase().includes(q),
    );
  }, [donors, donorSearch]);

  function switchToExistingDonor() {
    setUseExistingDonor(true);
    setForm((prev) => ({
      ...prev,
      donorFullName: '',
      donorPhone: '',
    }));
  }

  function switchToNewDonor() {
    setUseExistingDonor(false);
    setForm((prev) => ({
      ...prev,
      donorId: '',
    }));
    setDonorSearch('');
  }

  return (
    <PageShell
      title="Donation Management"
      subtitle="Review, add, and manage event donations."
      actions={
        <>
          <select
            className="db-input"
            style={{ minWidth: 160 }}
            value={eventId}
            onChange={(e) => {
              const id = e.target.value;
              setEventId(id);
              loadDonations(id);
            }}
          >
            {eventsLoading && <option value="">Loading…</option>}
            {!eventsLoading && events.length === 0 && <option value="">No events found</option>}
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
                {ev.isActive ? ' (Active)' : ''}
              </option>
            ))}
          </select>
          {hasEvents && (
            <Button type="button" onClick={openCreate} disabled={!eventId || eventsLoading || donorsLoading}>
              + Add Donation
            </Button>
          )}
        </>
      }
    >
      <div className="db-stat-grid animate-page" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        <div className="db-stat-card animate-card">
          <div className="db-stat-title">Total Collected</div>
          <div className="db-stat-value">{fmtBDT(totalAmount)}</div>
        </div>
        <div className="db-stat-card animate-card">
          <div className="db-stat-title">Total Donations</div>
          <div className="db-stat-value">{donations.length}</div>
        </div>
        <div className="db-stat-card animate-card">
          <div className="db-stat-title">Unique Donors</div>
          <div className="db-stat-value">{uniqueDonors}</div>
        </div>
      </div>

      <div className="db-table-card animate-card">
        <div className="db-table-header">
          <span className="db-table-title">Donations</span>
          <span className="db-stat-badge db-stat-badge-green">{donations.length} items</span>
        </div>
        {!eventId ? (
          <div className="db-empty">Select an event to load donations.</div>
        ) : donations.length === 0 && !loading ? (
          <div className="db-empty">No donations found for this event.</div>
        ) : (
          <table className="db-table">
            <thead>
              <tr>
                <th>Donor</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Phone</th>
                <th>Method</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((x) => {
                const initials = (x.donorSnapshotName || 'DN')
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                return (
                  <tr key={x.id}>
                    <td>
                      <div className="db-donor-cell">
                        <div className="db-donor-avatar">{initials}</div>
                        <span style={{ color: 'var(--db-td-em)' }}>{x.donorSnapshotName}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--db-td-em)' }}>
                      {fmtBDT(x.amount)}
                    </td>
                    <td>{x.donorSnapshotPhone}</td>
                    <td>{fmt(x.paymentMethod)}</td>
                    <td>{new Date(x.donationDate).toLocaleDateString()}</td>
                    <td>
                      <ActionsMenu
                        items={[
                          { label: 'Edit', icon: ICON_EDIT, onClick: () => openEdit(x) },
                          { label: 'Delete', icon: ICON_DELETE, onClick: () => setDeleteTarget(x), danger: true },
                        ]}
                      />
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
          <form
            className="db-modal animate-modal"
            onSubmit={(e) => {
              e.preventDefault();
              if (!saving) {
                void save();
              }
            }}
          >
            <div className="db-modal-title">
              {modal === 'create' ? 'Add Donation' : 'Edit Donation'}
            </div>

            <div className="db-form-row">
              <div className="db-field">
                <label className="db-label">Donor *</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12 }}>
                  <button
                    type="button"
                    onClick={switchToExistingDonor}
                    className="db-chip"
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      border: useExistingDonor ? '1px solid var(--db-accent)' : '1px solid var(--db-card-bd)',
                      background: useExistingDonor ? 'var(--db-accent-soft)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    Existing donor
                  </button>
                  <button
                    type="button"
                    onClick={switchToNewDonor}
                    className="db-chip"
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      border: !useExistingDonor ? '1px solid var(--db-accent)' : '1px solid var(--db-card-bd)',
                      background: !useExistingDonor ? 'var(--db-accent-soft)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    New donor
                  </button>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--db-muted)' }}>
                  Choose an existing donor from the list or quickly create a new donor for this
                  donation.
                </p>

                {useExistingDonor ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input
                      className="db-input"
                      placeholder="Search by name or phone"
                      value={donorSearch}
                      onChange={(e) => setDonorSearch(e.target.value)}
                      disabled={donorsLoading || donors.length === 0}
                    />
                    <select
                      className="db-select"
                      value={form.donorId}
                      onChange={(e) => updateForm('donorId', e.target.value)}
                      disabled={donorsLoading || donors.length === 0}
                      required
                    >
                      <option value="">
                        {donorsLoading
                          ? 'Loading donors…'
                          : donors.length === 0
                          ? 'No donors found. Switch to “New donor”.'
                          : filteredDonors.length === 0
                          ? 'No donors match your search.'
                          : 'Select donor'}
                      </option>
                      {filteredDonors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fullName} ({d.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div className="db-field" style={{ flex: 1 }}>
                      <label className="db-label">Full name *</label>
                      <input
                        className="db-input"
                        value={form.donorFullName}
                        onChange={(e) => updateForm('donorFullName', e.target.value)}
                        placeholder="Donor full name"
                        required
                      />
                    </div>
                    <div className="db-field" style={{ flex: 1 }}>
                      <label className="db-label">Phone *</label>
                      <input
                        className="db-input"
                        type="tel"
                        inputMode="tel"
                        value={form.donorPhone}
                        onChange={(e) => updateForm('donorPhone', e.target.value)}
                        placeholder="+880…"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="db-field">
                <label className="db-label">Amount (BDT) *</label>
                <input
                  className="db-input"
                  type="number"
                  min="0"
                  step="1"
                  value={form.amount}
                  onChange={(e) => updateForm('amount', e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="db-form-row">
              <div className="db-field">
                <label className="db-label">Payment Method</label>
                <select
                  className="db-select"
                  value={form.paymentMethod}
                  onChange={(e) => updateForm('paymentMethod', e.target.value)}
                >
                  <option value="CASH">Cash</option>
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="BANK">Bank</option>
                </select>
              </div>
              <div className="db-field">
                <label className="db-label">Date *</label>
                <input
                  className="db-input"
                  type="date"
                  value={form.donationDate}
                  onChange={(e) => updateForm('donationDate', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="db-field">
              <label className="db-label">Note</label>
              <textarea
                className="db-textarea"
                value={form.note}
                onChange={(e) => updateForm('note', e.target.value)}
                placeholder="Optional notes…"
              />
            </div>

            <div className="db-form-actions">
              <Button type="button" variant="outline" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : modal === 'create' ? 'Add Donation' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title={`Delete donation from "${deleteTarget.donorSnapshotName}"?`}
          description="This donation record will be permanently removed."
          confirmLabel="Delete Donation"
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </PageShell>
  );
}

