'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../components/shell';
import { Button } from '@/components/ui/button';
import { useToast } from '../components/toast';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useDonors, useCreateDonor, useUpdateDonor, useDeleteDonor, useDonorDonations } from '@/hooks/useDonors';
import { TableCard } from '@/components/shared/TableCard';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ActionsMenu } from '@/components/shared/ActionsMenu';
import { DonorFormModal, type DonorFormValues } from '@/components/shared/DonorFormModal';
import { fmtBDT, formatLabel } from '@/constants/payments';
import type { Donor } from '@/types';
import styles from './donors.module.css';

export default function AdminDonorsPage() {
  return <Suspense><DonorsContent /></Suspense>;
}

function DonorsContent() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const { data: donorsData, isLoading } = useDonors({
    page,
    pageSize,
    search: debouncedSearch.trim(),
  });

  const createDonor = useCreateDonor();
  const updateDonor = useUpdateDonor();
  const deleteDonor = useDeleteDonor();

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Donor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Donor | null>(null);
  const [donationPanelDonor, setDonationPanelDonor] = useState<Donor | null>(null);

  const { data: donorDonationsData, isLoading: donationsLoading } = useDonorDonations(
    donationPanelDonor?.id ?? ''
  );

  const donors = donorsData?.donors ?? [];
  const total = donorsData?.total ?? 0;
  const totalPages = donorsData?.totalPages ?? 1;
  const panelDonations = donorDonationsData ?? [];
  const donorTotal = panelDonations.reduce((s, d) => s + d.amount, 0);

  const isSaving = createDonor.isPending || updateDonor.isPending;
  const saveError = (createDonor.error ?? updateDonor.error)?.message;

  async function handleSubmit(values: DonorFormValues) {
    const payload = {
      fullName: values.fullName,
      phone: values.phone,
      altPhone: values.altPhone || null,
      address: values.address || null,
      donorType: values.donorType,
      note: values.note || null,
      preferredLanguage: 'en',
      tags: [],
    };
    try {
      if (modalMode === 'create') {
        await createDonor.mutateAsync(payload);
        toast(t('admin.forms.donorsPage.donorAdded'), 'success');
      } else if (editTarget) {
        await updateDonor.mutateAsync({ id: editTarget.id, input: payload });
        toast(t('admin.forms.donorsPage.donorUpdated'), 'success');
      }
      setModalMode(null);
    } catch {
      // saveError surfaced via hook
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDonor.mutateAsync(deleteTarget.id);
      toast(`${deleteTarget.fullName} deleted.`, 'success');
      setDeleteTarget(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  }

  return (
    <PageShell
      title={t('dashboard.donorManagement')}
      subtitle={t('dashboard.donorManagementSubtitle')}
    >
      <ListToolbar
        searchPlaceholder={t('dashboard.searchByNameOrPhone')}
        searchValue={searchInput}
        onSearchChange={(v) => { setSearchInput(v); setPage(1); }}
        primaryAction={{ label: `+ ${t('donors.addDonor')}`, onClick: () => { setEditTarget(null); setModalMode('create'); createDonor.reset(); } }}
      />

      <TableCard
        title={t('donors.donors')}
        badge={`${total} ${t('common.total')}`}
        badgeVariant="blue"
        empty={!isLoading && donors.length === 0 ? t('dashboard.noDonorsFound') : undefined}
      >
        {donors.length > 0 && (
          <table className="dataTable">
            <thead>
              <tr>
                <th>{t('admin.ui.name')}</th>
                <th>{t('donors.phone')}</th>
                <th>{t('donors.donorType')}</th>
                <th>{t('admin.ui.status')}</th>
                <th>{t('admin.ui.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {donors.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className={styles.donorCell}>
                      <UserAvatar name={d.fullName} size="sm" />
                      <span className="text-foreground">{d.fullName}</span>
                    </div>
                  </td>
                  <td>{d.phone}</td>
                  <td className="capitalize">{d.donorType}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td>
                    <ActionsMenu
                      items={[
                        { label: t('admin.forms.donorsPage.viewDonations'), onClick: () => setDonationPanelDonor(d) },
                        { label: t('common.edit'), onClick: () => { setEditTarget(d); setModalMode('edit'); updateDonor.reset(); } },
                        { label: t('common.delete'), onClick: () => setDeleteTarget(d), danger: true },
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
          loading={isLoading}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </TableCard>

      {donationPanelDonor && (
        <TableCard
          title={t('admin.forms.donorsPage.donationsFor', { name: donationPanelDonor.fullName })}
          actions={
            <Button variant="outline" size="sm" onClick={() => setDonationPanelDonor(null)}>
              {t('common.close')}
            </Button>
          }
        >
          {donationsLoading ? (
            <div className="p-6 text-center text-muted-foreground">
              {t('admin.forms.donorsPage.loadingHistory')}
            </div>
          ) : panelDonations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {t('admin.forms.donorsPage.noDonationsForDonor')}
            </div>
          ) : (
            <>
              <div className="px-5 py-2 text-xs text-muted-foreground">
                {panelDonations.length} donations • Total {fmtBDT(donorTotal)}
              </div>
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>{t('dashboard.date')}</th>
                    <th>{t('dashboard.method')}</th>
                    <th className="text-right">{t('dashboard.amount')}</th>
                    <th>{t('donors.note')}</th>
                  </tr>
                </thead>
                <tbody>
                  {panelDonations.map((x) => (
                    <tr key={x.id}>
                      <td>{new Date(x.donationDate).toLocaleDateString()}</td>
                      <td>{formatLabel(x.paymentMethod)}</td>
                      <td className="text-right font-semibold text-foreground">
                        {fmtBDT(x.amount)}
                      </td>
                      <td>{x.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </TableCard>
      )}

      <DonorFormModal
        open={modalMode !== null}
        mode={modalMode ?? 'create'}
        initial={
          editTarget
            ? {
                fullName: editTarget.fullName,
                phone: editTarget.phone,
                altPhone: editTarget.altPhone ?? '',
                address: editTarget.address ?? '',
                donorType: editTarget.donorType,
                note: editTarget.note ?? '',
              }
            : undefined
        }
        loading={isSaving}
        error={saveError}
        onClose={() => { setModalMode(null); createDonor.reset(); updateDonor.reset(); }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('admin.forms.donorsPage.deleteDonorTitle', { name: deleteTarget?.fullName ?? '' })}
        description={t('admin.forms.donorsPage.deleteDonorDesc')}
        confirmLabel={t('admin.forms.donorsPage.deleteDonorConfirm')}
        variant="destructive"
        loading={deleteDonor.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageShell>
  );
}
