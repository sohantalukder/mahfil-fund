'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../components/shell';
import { useToast } from '../components/toast';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useAllEvents } from '@/hooks/useEvents';
import { useDonations, useCreateDonation, useUpdateDonation, useDeleteDonation } from '@/hooks/useDonations';
import { useAllDonors, useCreateDonor } from '@/hooks/useDonors';
import { TableCard } from '@/components/shared/TableCard';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { StatGrid, StatCard } from '@/components/shared/StatGrid';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DonationFormModal, type DonationFormValues } from '@/components/shared/DonationFormModal';
import { ActionsMenu } from '@/components/shared/ActionsMenu';
import { fmtBDT, formatLabel } from '@/constants/payments';
import type { Donation } from '@/types';
import styles from './donations.module.css';
import formStyles from '@/styles/form.module.css';

export default function AdminDonationsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [eventId, setEventId] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const { data: allEvents, isLoading: eventsLoading } = useAllEvents();
  const { data: allDonorsData, isLoading: donorsLoading } = useAllDonors();
  const { data: donationsData, isLoading: donationsLoading } = useDonations({
    eventId,
    page,
    pageSize,
    search: debouncedSearch.trim(),
  });

  const createDonation = useCreateDonation();
  const updateDonation = useUpdateDonation();
  const deleteDonation = useDeleteDonation();
  const createDonor = useCreateDonor();

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Donation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Donation | null>(null);

  const events = allEvents ?? [];
  const allDonors = useMemo(() => {
    const list = allDonorsData ?? [];
    return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [allDonorsData]);
  const donations = donationsData?.donations ?? [];
  const total = donationsData?.total ?? 0;
  const totalPages = donationsData?.totalPages ?? 1;

  const totalAmount = donations.reduce((s, x) => s + x.amount, 0);
  const uniqueDonors = new Set(donations.map((d) => d.donorId)).size;

  const isSaving = createDonation.isPending || updateDonation.isPending;
  const saveError = (createDonation.error ?? updateDonation.error)?.message;

  function openCreate() {
    setEditTarget(null);
    setModalMode('create');
    createDonation.reset();
  }

  function openEdit(x: Donation) {
    setEditTarget(x);
    setModalMode('edit');
    updateDonation.reset();
  }

  async function handleSubmit(values: DonationFormValues, useExistingDonor: boolean) {
    let donorId = values.donorId;

    if (modalMode === 'create' && !useExistingDonor) {
      const normalizePhone = (p: string) => p.replace(/\s+/g, '');
      const existingByPhone = allDonors.find(
        (d) => normalizePhone(d.phone) === normalizePhone(values.donorPhone),
      );
      if (existingByPhone) {
        donorId = existingByPhone.id;
      } else {
        try {
          const newDonor = await createDonor.mutateAsync({
            fullName: values.donorFullName.trim(),
            phone: values.donorPhone.trim(),
            altPhone: null,
            address: null,
            donorType: 'individual',
            note: null,
            preferredLanguage: 'en',
            tags: [],
          });
          donorId = newDonor.id;
        } catch {
          toast('Failed to create donor.', 'error');
          return;
        }
      }
    }

    const payload = {
      eventId,
      donorId,
      amount: parseFloat(values.amount),
      paymentMethod: values.paymentMethod,
      donationDate: new Date(values.donationDate),
      note: values.note || null,
    };

    try {
      if (modalMode === 'create') {
        await createDonation.mutateAsync(payload);
        toast('Donation added.', 'success');
      } else if (editTarget) {
        await updateDonation.mutateAsync({
          id: editTarget.id,
          input: {
            amount: payload.amount,
            paymentMethod: payload.paymentMethod,
            donationDate: payload.donationDate,
            note: payload.note,
          },
        });
        toast('Donation updated.', 'success');
      }
      setModalMode(null);
    } catch {
      // saveError surfaced via createDonation.error / updateDonation.error
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDonation.mutateAsync(deleteTarget.id);
      toast(`Donation from ${deleteTarget.donorSnapshotName} deleted.`, 'success');
      setDeleteTarget(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  }

  const hasEvents = !eventsLoading && events.length > 0;

  return (
    <PageShell
      title={t('donations.donations')}
      subtitle={t('dashboard.donationsSubtitle')}
    >
      <ListToolbar
        searchPlaceholder={t('admin.forms.donationsPage.searchPlaceholder')}
        searchValue={searchInput}
        onSearchChange={(v) => { setSearchInput(v); setPage(1); }}
        primaryAction={
          hasEvents
            ? { label: `+ ${t('donations.addDonation')}`, onClick: openCreate, disabled: !eventId || eventsLoading }
            : undefined
        }
      >
        <select
          className={`${formStyles.nativeSelect} min-w-[160px]`}
          value={eventId}
          onChange={(e) => { setEventId(e.target.value); setPage(1); }}
          disabled={eventsLoading}
        >
          {eventsLoading && <option value="">{t('admin.ui.loading')}</option>}
          {!eventsLoading && events.length === 0 && <option value="">{t('dashboard.noEventsFound')}</option>}
          {!eventsLoading && events.length > 0 && !eventId && <option value="">{t('dashboard.selectEvent')}</option>}
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}{ev.isActive ? ` (${t('dashboard.active')})` : ''}
            </option>
          ))}
        </select>
      </ListToolbar>

      <StatGrid columns={3}>
        <StatCard label={t('admin.forms.donationsPage.totalCollected')}>
          <span className="font-bold text-green-600 dark:text-green-400">
            {donationsLoading ? '…' : fmtBDT(totalAmount)}
          </span>
        </StatCard>
        <StatCard label={t('admin.forms.donationsPage.totalDonationsCount')}>{donationsLoading ? '…' : donations.length}</StatCard>
        <StatCard label={t('admin.forms.donationsPage.uniqueDonors')}>{donationsLoading ? '…' : uniqueDonors}</StatCard>
      </StatGrid>

      <TableCard
        title={t('donations.donations')}
        badge={donationsLoading ? t('admin.ui.loading') : t('admin.ui.onPageTotal', { onPage: donations.length, total })}
        badgeVariant="green"
        empty={
          !donationsLoading && !eventId
            ? t('admin.forms.donationsPage.selectEventLoad')
            : !donationsLoading && donations.length === 0
            ? t('admin.forms.donationsPage.noDonationsEvent')
            : undefined
        }
      >
        {donations.length > 0 && (
          <table className="dataTable">
            <thead>
              <tr>
                <th>{t('dashboard.donor')}</th>
                <th className="text-right">{t('dashboard.amount')}</th>
                <th>{t('donors.phone')}</th>
                <th>{t('dashboard.method')}</th>
                <th>{t('dashboard.date')}</th>
                <th>{t('admin.ui.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((x) => (
                <tr key={x.id}>
                  <td>
                    <div className={styles.donorCell}>
                      <UserAvatar name={x.donorSnapshotName || 'DN'} size="sm" />
                      <span className="text-foreground">{x.donorSnapshotName}</span>
                    </div>
                  </td>
                  <td className="text-right font-semibold text-foreground">
                    {fmtBDT(x.amount)}
                  </td>
                  <td>{x.donorSnapshotPhone}</td>
                  <td>{formatLabel(x.paymentMethod)}</td>
                  <td>{new Date(x.donationDate).toLocaleDateString()}</td>
                  <td>
                    <ActionsMenu
                      items={[
                        { label: t('common.edit'), onClick: () => openEdit(x) },
                        { label: t('common.delete'), onClick: () => setDeleteTarget(x), danger: true },
                      ]}
                    />
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
          loading={donationsLoading}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </TableCard>

      <DonationFormModal
        open={modalMode !== null}
        mode={modalMode ?? 'create'}
        initial={
          editTarget
            ? {
                donorId: editTarget.donorId,
                amount: String(editTarget.amount),
                paymentMethod: editTarget.paymentMethod,
                donationDate: editTarget.donationDate.slice(0, 10),
                note: editTarget.note ?? '',
              }
            : undefined
        }
        donors={allDonors}
        donorsLoading={donorsLoading}
        loading={isSaving}
        error={saveError}
        onClose={() => { setModalMode(null); createDonation.reset(); updateDonation.reset(); }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete donation from "${deleteTarget?.donorSnapshotName}"?`}
        description="This donation record will be permanently removed."
        confirmLabel="Delete Donation"
        variant="destructive"
        loading={deleteDonation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageShell>
  );
}
