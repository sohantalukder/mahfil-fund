'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../components/shell';
import { useToast } from '../components/toast';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useAllEvents } from '@/hooks/useEvents';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/useExpenses';
import { TableCard } from '@/components/shared/TableCard';
import { StatGrid, StatCard } from '@/components/shared/StatGrid';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExpenseFormModal, type ExpenseFormValues } from '@/components/shared/ExpenseFormModal';
import { ActionsMenu } from '@/components/shared/ActionsMenu';
import { fmtBDT, formatLabel } from '@/constants/payments';
import type { Expense } from '@/types';
import styles from './expenses.module.css';

export default function AdminExpensesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [eventId, setEventId] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const { data: allEvents, isLoading: eventsLoading } = useAllEvents();
  const { data: expensesData, isLoading: expensesLoading } = useExpenses({
    eventId,
    page,
    pageSize,
    search: debouncedSearch.trim(),
  });

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const events = allEvents ?? [];
  const expenses = expensesData?.expenses ?? [];
  const total = expensesData?.total ?? 0;
  const totalPages = expensesData?.totalPages ?? 1;
  const totalAmount = expenses.reduce((s, x) => s + x.amount, 0);

  const isSaving = createExpense.isPending || updateExpense.isPending;
  const saveError = (createExpense.error ?? updateExpense.error)?.message;
  const hasEvents = !eventsLoading && events.length > 0;

  async function handleSubmit(values: ExpenseFormValues) {
    const payload = {
      eventId,
      title: values.title,
      category: values.category,
      amount: parseFloat(values.amount),
      expenseDate: new Date(values.expenseDate),
      vendor: values.vendor || null,
      paymentMethod: values.paymentMethod,
      note: values.note || null,
    };
    try {
      if (modalMode === 'create') {
        await createExpense.mutateAsync(payload);
        toast('Expense added.', 'success');
      } else if (editTarget) {
        await updateExpense.mutateAsync({ id: editTarget.id, input: payload });
        toast('Expense updated.', 'success');
      }
      setModalMode(null);
    } catch {
      // saveError surfaced via hook
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteExpense.mutateAsync(deleteTarget.id);
      toast(`"${deleteTarget.title}" deleted.`, 'success');
      setDeleteTarget(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  }

  return (
    <PageShell
      title={t('dashboard.expensesManagement')}
      subtitle={t('dashboard.expensesSubtitle')}
    >
      <ListToolbar
        searchPlaceholder={t('admin.forms.expensesPage.searchPlaceholder')}
        searchValue={searchInput}
        onSearchChange={(v) => { setSearchInput(v); setPage(1); }}
        primaryAction={
          hasEvents
            ? { label: `+ ${t('expenses.addExpense')}`, onClick: () => { setEditTarget(null); setModalMode('create'); createExpense.reset(); }, disabled: !eventId || eventsLoading }
            : undefined
        }
      >
        <select
          className={styles.eventSelect}
          value={eventId}
          onChange={(e) => { setEventId(e.target.value); setPage(1); }}
          disabled={eventsLoading}
        >
          {eventsLoading && <option value="">{t('admin.ui.loading')}</option>}
          {!eventsLoading && events.length === 0 && <option value="">{t('dashboard.noEventsFound')}</option>}
          {!eventsLoading && events.length > 0 && !eventId && <option value="">{t('dashboard.selectEvent')}</option>}
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.name}{ev.isActive ? ` (${t('dashboard.active')})` : ''}</option>
          ))}
        </select>
      </ListToolbar>

      <StatGrid columns={3}>
        <StatCard label={t('admin.forms.expensesPage.totalExpensesSum')}>
          <span className="text-amber-600 dark:text-amber-400">
            {expensesLoading ? '…' : fmtBDT(totalAmount)}
          </span>
        </StatCard>
        <StatCard label={t('admin.forms.expensesPage.numberOfItems')}>{expensesLoading ? '…' : expenses.length}</StatCard>
        <StatCard label={t('admin.forms.expensesPage.avgPerItem')}>
          {expensesLoading ? '…' : expenses.length ? fmtBDT(totalAmount / expenses.length) : '—'}
        </StatCard>
      </StatGrid>

      <TableCard
        title={t('expenses.expenses')}
        badge={expensesLoading ? t('admin.ui.loading') : t('admin.ui.onPageTotal', { onPage: expenses.length, total })}
        badgeVariant="blue"
        empty={
          !expensesLoading && !eventId
            ? t('admin.forms.expensesPage.selectEventLoad')
            : !expensesLoading && expenses.length === 0
            ? t('admin.forms.expensesPage.noExpensesEvent')
            : undefined
        }
      >
        {expenses.length > 0 && (
          <table className="dataTable">
            <thead>
              <tr>
                <th>{t('expenses.title')}</th>
                <th>{t('expenses.category')}</th>
                <th>{t('dashboard.method')}</th>
                <th>{t('dashboard.date')}</th>
                <th className="text-right">{t('dashboard.amount')}</th>
                <th>{t('admin.ui.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((x) => (
                <tr key={x.id}>
                  <td className="font-medium text-foreground">{x.title}</td>
                  <td>{x.category}</td>
                  <td>{formatLabel(x.paymentMethod)}</td>
                  <td>{new Date(x.expenseDate).toLocaleDateString()}</td>
                  <td className="text-right font-semibold text-foreground">
                    {fmtBDT(x.amount)}
                  </td>
                  <td>
                    <ActionsMenu
                      items={[
                        {
                          label: t('common.edit'),
                          onClick: () => {
                            setEditTarget(x);
                            setModalMode('edit');
                            updateExpense.reset();
                          },
                        },
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
          loading={expensesLoading}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </TableCard>

      <ExpenseFormModal
        open={modalMode !== null}
        mode={modalMode ?? 'create'}
        initial={
          editTarget
            ? {
                title: editTarget.title,
                category: editTarget.category,
                amount: String(editTarget.amount),
                expenseDate: editTarget.expenseDate.slice(0, 10),
                paymentMethod: editTarget.paymentMethod,
                vendor: editTarget.vendor ?? '',
                note: '',
              }
            : undefined
        }
        loading={isSaving}
        error={saveError}
        onClose={() => { setModalMode(null); createExpense.reset(); updateExpense.reset(); }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.title}"?`}
        description="This expense record will be permanently removed."
        confirmLabel="Delete Expense"
        variant="destructive"
        loading={deleteExpense.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageShell>
  );
}
