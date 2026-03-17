'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../components/shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '../components/toast';
import { useCommunity } from '../providers';
import { useInvoices, useCreateInvoice, triggerInvoiceDownload } from '@/hooks/useInvoices';
import { TableCard } from '@/components/shared/TableCard';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { StatusBadge } from '@/components/shared/StatusBadge';
import formStyles from '@/styles/form.module.css';
import styles from './invoices.module.css';

const TYPE_LABELS: Record<string, string> = {
  DONATION_RECEIPT: 'Donation Receipt',
  SPONSOR_RECEIPT: 'Sponsor Receipt',
  MANUAL: 'Manual',
};

const BLANK = {
  invoiceType: 'MANUAL' as const,
  issueDate: new Date().toISOString().slice(0, 10),
  payerName: '',
  payerPhone: '',
  payerAddress: '',
  amount: '',
  paymentMethod: '',
  referenceNumber: '',
  note: '',
};

export default function InvoicesPage() {
  const { t } = useTranslation();
  const { activeCommunity } = useCommunity();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [createdInvoiceNumber, setCreatedInvoiceNumber] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const pageSize = 25;

  const { data, isLoading } = useInvoices({
    communityId: activeCommunity?.id,
    status: statusFilter,
    invoiceType: typeFilter,
    page,
    pageSize,
  });

  const createInvoice = useCreateInvoice(activeCommunity?.id);
  const invoices = data?.invoices ?? [];

  async function handleCreate() {
    try {
      const amount = parseInt(form.amount, 10);
      if (!form.payerName.trim()) throw new Error('Payer name is required');
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be a positive number');

      const res = await createInvoice.mutateAsync({
        invoiceType: form.invoiceType,
        issueDate: form.issueDate,
        payerName: form.payerName.trim(),
        payerPhone: form.payerPhone.trim() || undefined,
        payerAddress: form.payerAddress.trim() || undefined,
        amount,
        paymentMethod: (form.paymentMethod || undefined) as
          | 'CASH'
          | 'BKASH'
          | 'NAGAD'
          | 'BANK'
          | undefined,
        referenceNumber: form.referenceNumber.trim() || undefined,
        note: form.note.trim() || undefined,
      });

      setCreatedInvoiceNumber(res.invoice.invoiceNumber);
      setShowCreate(false);
      setForm({ ...BLANK });
      toast('Invoice created!', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create invoice', 'error');
    }
  }

  if (!activeCommunity) {
    return (
      <PageShell title={t('dashboard.invoicesTitle')} subtitle={t('dashboard.selectCommunityForInvoices')}>
        <div className={styles.empty}>{t('dashboard.selectCommunityFromHeader')}</div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={t('dashboard.invoicesTitle')}
      subtitle={t('dashboard.invoicesForCommunity', { name: activeCommunity.name })}
      actions={
        <Button onClick={() => { setCreatedInvoiceNumber(null); setShowCreate(true); }}>
          + Create Invoice
        </Button>
      }
    >
      <div className={formStyles.filterRow}>
        <select
          className={formStyles.nativeSelect}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ISSUED">Issued</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          className={formStyles.nativeSelect}
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
        >
          <option value="">All types</option>
          <option value="DONATION_RECEIPT">Donation Receipt</option>
          <option value="SPONSOR_RECEIPT">Sponsor Receipt</option>
          <option value="MANUAL">Manual</option>
        </select>
      </div>

      {createdInvoiceNumber && (
        <div className={styles.createdBanner}>
          <div className={styles.createdLabel}>Invoice created:</div>
          <div className={styles.createdNumber}>{createdInvoiceNumber}</div>
        </div>
      )}

      {showCreate && (
        <div className={styles.createCard}>
          <div className={styles.createTitle}>Create Invoice</div>

          <div className={formStyles.formGrid}>
            <div className={formStyles.formRow}>
              <div className={formStyles.field}>
                <div className={`${formStyles.label} ${formStyles.labelRequired}`}>Type</div>
                <select
                  className={formStyles.nativeSelect}
                  value={form.invoiceType}
                  onChange={(e) => setForm((p) => ({ ...p, invoiceType: e.target.value as typeof p.invoiceType }))}
                >
                  <option value="DONATION_RECEIPT">Donation Receipt</option>
                  <option value="SPONSOR_RECEIPT">Sponsor Receipt</option>
                  <option value="MANUAL">Manual</option>
                </select>
              </div>

              <div className={formStyles.field}>
                <div className={`${formStyles.label} ${formStyles.labelRequired}`}>Issue date</div>
                <Input
                  type="date"
                  value={form.issueDate}
                  onChange={(e) => setForm((p) => ({ ...p, issueDate: e.target.value }))}
                />
              </div>
            </div>

            <div className={formStyles.formRow}>
              <div className={formStyles.field}>
                <div className={`${formStyles.label} ${formStyles.labelRequired}`}>Payer name</div>
                <Input
                  value={form.payerName}
                  onChange={(e) => setForm((p) => ({ ...p, payerName: e.target.value }))}
                  placeholder="Full name"
                />
              </div>

              <div className={formStyles.field}>
                <div className={`${formStyles.label} ${formStyles.labelRequired}`}>Amount</div>
                <Input
                  inputMode="numeric"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="e.g. 500"
                />
              </div>
            </div>

            <div className={formStyles.formRow}>
              <div className={formStyles.field}>
                <div className={formStyles.label}>Payment method</div>
                <select
                  className={formStyles.nativeSelect}
                  value={form.paymentMethod}
                  onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                >
                  <option value="">—</option>
                  <option value="CASH">Cash</option>
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="BANK">Bank</option>
                </select>
              </div>

              <div className={formStyles.field}>
                <div className={formStyles.label}>Reference</div>
                <Input
                  value={form.referenceNumber}
                  onChange={(e) => setForm((p) => ({ ...p, referenceNumber: e.target.value }))}
                  placeholder="Txn / cheque / ref no."
                />
              </div>
            </div>

            <div className={formStyles.formRow}>
              <div className={formStyles.field}>
                <div className={formStyles.label}>Phone</div>
                <Input
                  value={form.payerPhone}
                  onChange={(e) => setForm((p) => ({ ...p, payerPhone: e.target.value }))}
                  placeholder="01XXXXXXXXX"
                />
              </div>

              <div className={formStyles.field}>
                <div className={formStyles.label}>Address</div>
                <Input
                  value={form.payerAddress}
                  onChange={(e) => setForm((p) => ({ ...p, payerAddress: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className={formStyles.field}>
              <div className={formStyles.label}>Note</div>
              <Textarea
                value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                placeholder="Optional"
              />
            </div>

            <div className={formStyles.formActions}>
              <Button
                variant="secondary"
                onClick={() => { setShowCreate(false); setForm({ ...BLANK }); }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => { void handleCreate(); }}
                disabled={createInvoice.isPending}
              >
                {createInvoice.isPending ? 'Creating…' : 'Create invoice'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <TableCard
        title="Invoices"
        badge={data ? `${invoices.length} of ${data.total}` : undefined}
        empty={!isLoading && invoices.length === 0 ? 'No invoices found.' : undefined}
      >
        {isLoading ? (
          <div className={styles.loading}>Loading invoices…</div>
        ) : invoices.length > 0 ? (
          <>
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Payer</th>
                  <th>Amount</th>
                  <th>Event</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <code className={styles.invoiceNumber}>{inv.invoiceNumber}</code>
                    </td>
                    <td className={styles.typeCell}>
                      {TYPE_LABELS[inv.invoiceType] ?? inv.invoiceType}
                    </td>
                    <td className={styles.dateCell}>
                      {new Date(inv.issueDate).toLocaleDateString()}
                    </td>
                    <td>
                      <div className={styles.payerName}>{inv.payerName}</div>
                      {inv.payerPhone && (
                        <div className={styles.payerPhone}>{inv.payerPhone}</div>
                      )}
                    </td>
                    <td className={styles.amount}>
                      ৳{inv.amount.toLocaleString()}
                    </td>
                    <td className={styles.dateCell}>
                      {(inv as { event?: { name: string } }).event?.name ?? '—'}
                    </td>
                    <td>
                      <StatusBadge status={inv.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.downloadBtn}
                        onClick={() => {
                          void triggerInvoiceDownload(inv.id, inv.invoiceNumber).catch((err) =>
                            toast(err instanceof Error ? err.message : 'Failed to download PDF', 'error')
                          );
                        }}
                      >
                        ↓ PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationControls
              page={page}
              pageSize={pageSize}
              total={data?.total ?? 0}
              totalPages={data?.totalPages ?? 1}
              loading={isLoading}
              onPageChange={setPage}
            />
          </>
        ) : null}
      </TableCard>
    </PageShell>
  );
}
