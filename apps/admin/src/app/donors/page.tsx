'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'next/navigation';
import { getApi } from '@/lib/api';
import { PageShell } from '../components/shell';
import { ActionsMenu, ConfirmModal } from '../components/actions';
import { useToast } from '../components/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Table, Tbody, Td, Th, Thead, Tr } from '../components/ui/table';
import { Form, FormField } from '../components/ui/form';
import { Skeleton } from '../components/ui/skeleton';
import { ListToolbar } from '../components/list-toolbar';

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

type Donation = {
  id: string;
  eventId: string;
  donorId: string;
  amount: number;
  paymentMethod: string;
  donationDate: string;
  note?: string | null;
};

type DonorFormValues = {
  fullName: string;
  phone: string;
  altPhone?: string;
  address?: string;
  donorType: string;
  note?: string;
};

const BLANK: DonorFormValues = {
  fullName: '',
  phone: '',
  altPhone: '',
  address: '',
  donorType: 'individual',
  note: '',
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
  const [editId, setEditId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Donor | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [donationPanel, setDonationPanel] = useState<Donor | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(false);

  const form = useForm<DonorFormValues>({
    defaultValues: BLANK,
  });

  async function load(q = search) {
    setLoading(true);
    const query = q ? `?search=${encodeURIComponent(q)}` : '';
    const res = await api.get<{ donors: Donor[] }>(`/donors${query}`);
    setLoading(false);
    if (!res.success) { toast(res.error.message, 'error'); return; }
    const d = res.data as { donors?: Donor[] } | Donor[];
    setDonors(Array.isArray(d) ? d : (d.donors ?? []));
  }

  useEffect(() => {
    const initial = searchParams.get('search') ?? '';
    setSearch(initial);
    load(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function openCreate() {
    form.reset(BLANK);
    setEditId('');
    setModal('create');
  }

  function openEdit(d: Donor) {
    form.reset({
      fullName: d.fullName,
      phone: d.phone,
      altPhone: d.altPhone || '',
      address: d.address || '',
      donorType: d.donorType,
      note: d.note || '',
    });
    setEditId(d.id);
    setModal('edit');
  }

  async function handleSubmit(values: DonorFormValues) {
    setSaving(true);
    const body = {
      fullName: values.fullName,
      phone: values.phone,
      altPhone: values.altPhone || null,
      address: values.address || null,
      donorType: values.donorType,
      note: values.note || null,
      preferredLanguage: 'en',
      tags: [],
    };
    const res = modal === 'create'
      ? await api.post<Donor>('/donors', body)
      : await api.patch<Donor>(`/donors/${editId}`, body);
    setSaving(false);
    if (!res.success) { toast(res.error.message, 'error'); return; }
    toast(modal === 'create' ? 'Donor added successfully.' : 'Donor updated successfully.', 'success');
    setModal(null);
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await api.delete(`/donors/${deleteTarget.id}`);
    setDeleting(false);
    if (!res.success) { toast((res as { error?: { message?: string } }).error?.message || 'Delete failed', 'error'); return; }
    toast(`${deleteTarget.fullName} deleted.`, 'success');
    setDeleteTarget(null); load();
  }

  const isSubmitting = form.formState.isSubmitting || saving;

  async function openDonations(donor: Donor) {
    setDonationPanel(donor);
    setDonations([]);
    setDonationsLoading(true);
    try {
      const res = await api.get<{ donations: Donation[] }>(`/donations?donorId=${encodeURIComponent(donor.id)}`);
      if (!res.success) {
        toast(res.error.message, 'error');
      } else {
        const dd = res.data as { donations?: Donation[] } | Donation[];
        setDonations(Array.isArray(dd) ? dd : (dd.donations ?? []));
      }
    } finally {
      setDonationsLoading(false);
    }
  }

  const donorTotal = donations.reduce((sum, d) => sum + d.amount, 0);

  return (
    <PageShell
      title="Donor Management"
      subtitle="Search, add, edit, and remove donor records."
    >
      <ListToolbar
        searchPlaceholder="Search by name or phone…"
        searchValue={search}
        onSearchChange={setSearch}
        onSearchSubmit={() => load()}
        primaryAction={{
          label: '+ Add Donor',
          onClick: openCreate,
        }}
      />

      <div className="db-table-card animate-card">
        <div className="db-table-header">
          <span className="db-table-title">Donors</span>
          <span className="db-stat-badge db-stat-badge-blue">{donors.length} results</span>
        </div>
        {loading && donors.length === 0 ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((key) => (
              <div key={key} className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ))}
          </div>
        ) : donors.length === 0 ? (
          <div className="db-empty">No donors found. Try a different search or add a new donor.</div>
        ) : (
          <Table className="db-table">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {donors.map((d) => {
                const initials = d.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <Tr key={d.id}>
                    <Td>
                      <div className="db-donor-cell">
                        <div className="db-donor-avatar">{initials}</div>
                        <span style={{ color: 'var(--db-td-em)' }}>{d.fullName}</span>
                      </div>
                    </Td>
                    <Td>{d.phone}</Td>
                    <Td>{fmt(d.donorType)}</Td>
                    <Td>
                      <span className={d.status === 'ACTIVE' ? 'db-status-active' : 'db-status-archived'}>
                        {fmt(d.status)}
                      </span>
                    </Td>
                    <Td>
                      <ActionsMenu
                        items={[
                          { label: 'View Donations', icon: ICON_EDIT, onClick: () => openDonations(d) },
                          { label: 'Edit', icon: ICON_EDIT, onClick: () => openEdit(d) },
                          { label: 'Delete', icon: ICON_DELETE, onClick: () => setDeleteTarget(d), danger: true },
                        ]}
                      />
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </div>

      {modal && (
        <div className="db-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="db-modal w-full max-w-xl animate-modal">
            <div className="db-modal-title">{modal === 'create' ? 'Add Donor' : 'Edit Donor'}</div>
            <Form form={form} onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  name="fullName"
                  control={form.control}
                  label="Full Name"
                  rules={{ required: 'Full name is required' }}
                >
                  {(field) => (
                    <Input
                      {...field}
                      placeholder="Full name"
                      className="db-input"
                    />
                  )}
                </FormField>
                <FormField
                  name="phone"
                  control={form.control}
                  label="Phone"
                  rules={{ required: 'Phone is required' }}
                >
                  {(field) => (
                    <Input
                      {...field}
                      placeholder="+880…"
                      className="db-input"
                    />
                  )}
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  name="altPhone"
                  control={form.control}
                  label="Alt Phone"
                >
                  {(field) => (
                    <Input
                      {...field}
                      placeholder="Optional"
                      className="db-input"
                    />
                  )}
                </FormField>
                <FormField
                  name="donorType"
                  control={form.control}
                  label="Donor Type"
                >
                  {(field) => (
                    <NativeSelect
                      {...field}
                      className="db-select"
                    >
                      <option value="individual">Individual</option>
                      <option value="family">Family</option>
                      <option value="business">Business</option>
                      <option value="organization">Organization</option>
                    </NativeSelect>
                  )}
                </FormField>
              </div>

              <FormField
                name="address"
                control={form.control}
                label="Address"
              >
                {(field) => (
                  <Input
                    {...field}
                    placeholder="Address"
                    className="db-input"
                  />
                )}
              </FormField>

              <FormField
                name="note"
                control={form.control}
                label="Note"
                helperText="Internal notes, visible only to admins."
              >
                {(field) => (
                  <Textarea
                    {...field}
                    placeholder="Internal notes…"
                    className="db-textarea"
                  />
                )}
              </FormField>

              <div className="db-form-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? 'Saving…' : (modal === 'create' ? 'Add Donor' : 'Save Changes')}
                </Button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {donationPanel && (
        <div className="db-table-card animate-card" style={{ marginTop: 20 }}>
          <div className="db-table-header">
            <div>
              <span className="db-table-title">
                Donations – {donationPanel.fullName}
              </span>
              <div className="db-page-subtitle">
                {donationsLoading
                  ? 'Loading donation history…'
                  : donations.length === 0
                  ? 'No donations found for this donor.'
                  : `${donations.length} donations • Total ${new Intl.NumberFormat('en-BD', {
                      style: 'currency',
                      currency: 'BDT',
                      maximumFractionDigits: 0,
                    }).format(donorTotal)}`}
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => setDonationPanel(null)}>
              Close
            </Button>
          </div>
          {donationsLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/6" />
                </div>
              ))}
            </div>
          ) : donations.length === 0 ? null : (
            <Table className="db-table">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Method</Th>
                  <Th style={{ textAlign: 'right' }}>Amount</Th>
                  <Th>Note</Th>
                </Tr>
              </Thead>
              <Tbody>
                {donations.map((x) => (
                  <Tr key={x.id}>
                    <Td>{new Date(x.donationDate).toLocaleDateString()}</Td>
                    <Td>{fmt(x.paymentMethod)}</Td>
                    <Td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--db-td-em)' }}>
                      {new Intl.NumberFormat('en-BD', {
                        style: 'currency',
                        currency: 'BDT',
                        maximumFractionDigits: 0,
                      }).format(x.amount)}
                    </Td>
                    <Td>{x.note || '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
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
