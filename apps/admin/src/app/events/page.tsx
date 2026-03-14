'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../components/shell';
import { useToast } from '../components/toast';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import {
  useEvents,
  useCreateEvent,
  useUpdateEvent,
  useActivateEvent,
  useDeleteEvent,
} from '@/hooks/useEvents';
import { TableCard } from '@/components/shared/TableCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EventFormModal, type EventFormValues } from '@/components/shared/EventFormModal';
import type { AppEvent } from '@/types';
import { fmtBDT } from '@/constants/payments';
import styles from './events.module.css';

export default function AdminEventsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const { data: eventsData, isLoading } = useEvents({
    page,
    pageSize,
    search: debouncedSearch.trim(),
  });

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const activateEvent = useActivateEvent();
  const deleteEvent = useDeleteEvent();

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<AppEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppEvent | null>(null);

  const events = eventsData?.events ?? [];
  const total = eventsData?.total ?? 0;
  const totalPages = eventsData?.totalPages ?? 1;

  const isSaving = createEvent.isPending || updateEvent.isPending;
  const saveError = (createEvent.error ?? updateEvent.error)?.message;

  function openCreate() {
    setEditTarget(null);
    setModalMode('create');
    createEvent.reset();
  }

  function openEdit(ev: AppEvent) {
    setEditTarget(ev);
    setModalMode('edit');
    updateEvent.reset();
  }

  async function handleSubmit(values: EventFormValues) {
    const payload = {
      name: values.name,
      year: Number(values.year),
      startsAt: values.startsAt ? new Date(values.startsAt) : undefined,
      endsAt: values.endsAt ? new Date(values.endsAt) : undefined,
      targetAmount: values.targetAmount ? parseFloat(values.targetAmount) : undefined,
    };
    try {
      if (modalMode === 'create') {
        await createEvent.mutateAsync(payload);
        toast(t('admin.eventsPage.eventCreated'), 'success');
      } else if (editTarget) {
        await updateEvent.mutateAsync({ id: editTarget.id, input: payload });
        toast(t('admin.eventsPage.eventUpdated'), 'success');
      }
      setModalMode(null);
    } catch {
      // error surfaced via saveError
    }
  }

  async function handleActivate(id: string) {
    try {
      await activateEvent.mutateAsync(id);
      toast(t('admin.eventsPage.eventActivated'), 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : t('admin.eventsPage.activationFailed'), 'error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteEvent.mutateAsync(deleteTarget.id);
      toast(t('admin.eventsPage.eventDeleted'), 'success');
      setDeleteTarget(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : t('admin.eventsPage.deleteFailed'), 'error');
    }
  }

  return (
    <PageShell
      title={t('dashboard.eventsManagement')}
      subtitle={t('dashboard.eventsSubtitle')}
    >
      <ListToolbar
        searchPlaceholder={t('admin.eventsPage.searchPlaceholder')}
        searchValue={searchInput}
        onSearchChange={(v) => { setSearchInput(v); setPage(1); }}
        primaryAction={{ label: `+ ${t('admin.eventsPage.newEvent')}`, onClick: openCreate }}
      />

      <TableCard
        title={t('events.events')}
        badge={isLoading ? t('admin.ui.loading') : t('admin.ui.onPageTotal', { onPage: events.length, total })}
        badgeVariant="blue"
        empty={!isLoading && events.length === 0 ? t('admin.eventsPage.noEventsEmpty') : undefined}
      >
        {events.length > 0 && (
          <table className="dataTable">
            <thead>
              <tr>
                <th>{t('admin.ui.name')}</th>
                <th>{t('events.year')}</th>
                <th>{t('admin.eventsPage.starts')}</th>
                <th>{t('admin.eventsPage.ends')}</th>
                <th>{t('admin.eventsPage.target')}</th>
                <th>{t('admin.ui.status')}</th>
                <th>{t('admin.ui.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td className="font-medium text-foreground">{ev.name}</td>
                  <td>{ev.year}</td>
                  <td>{ev.startsAt ? new Date(ev.startsAt).toLocaleDateString() : '—'}</td>
                  <td>{ev.endsAt ? new Date(ev.endsAt).toLocaleDateString() : '—'}</td>
                  <td>{ev.targetAmount ? fmtBDT(ev.targetAmount) : '—'}</td>
                  <td>
                    <StatusBadge status={ev.isActive ? 'active' : 'archived'} />
                  </td>
                  <td>
                    <div className="flex gap-1.5 flex-wrap">
                      {!ev.isActive && (
                        <button
                          type="button"
                          className={styles.actionBtn}
                          disabled={activateEvent.isPending && activateEvent.variables === ev.id}
                          onClick={() => handleActivate(ev.id)}
                        >
                          {activateEvent.isPending && activateEvent.variables === ev.id ? '…' : t('admin.eventsPage.activate')}
                        </button>
                      )}
                      <button type="button" className={styles.actionBtn} onClick={() => openEdit(ev)}>
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        onClick={() => setDeleteTarget(ev)}
                      >
                        {t('common.delete')}
                      </button>
                    </div>
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

      <EventFormModal
        open={modalMode !== null}
        mode={modalMode ?? 'create'}
        initial={
          editTarget
            ? {
                name: editTarget.name,
                year: editTarget.year,
                startsAt: editTarget.startsAt ? editTarget.startsAt.slice(0, 10) : '',
                endsAt: editTarget.endsAt ? editTarget.endsAt.slice(0, 10) : '',
                targetAmount: editTarget.targetAmount ? String(editTarget.targetAmount) : '',
              }
            : undefined
        }
        loading={isSaving}
        error={saveError}
        onClose={() => { setModalMode(null); createEvent.reset(); updateEvent.reset(); }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('admin.eventsPage.deleteEventTitle', { name: deleteTarget?.name ?? '' })}
        description={t('admin.eventsPage.deleteEventDesc')}
        confirmLabel={t('admin.eventsPage.deleteEventConfirm')}
        variant="destructive"
        loading={deleteEvent.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageShell>
  );
}
