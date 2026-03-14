'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../components/shell';
import { useToast } from '../components/toast';
import { useCommunity } from '../providers';
import { useInvoices, triggerInvoiceDownload } from '@/hooks/useInvoices';
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

export default function InvoicesPage() {
  const { t } = useTranslation();
  const { activeCommunity } = useCommunity();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, isLoading } = useInvoices({
    communityId: activeCommunity?.id,
    status: statusFilter,
    invoiceType: typeFilter,
    page,
    pageSize,
  });

  const invoices = data?.invoices ?? [];

  if (!activeCommunity) {
    return (
      <PageShell title={t('dashboard.invoicesTitle')} subtitle={t('dashboard.selectCommunityForInvoices')}>
        <div className={styles.empty}>{t('dashboard.selectCommunityFromHeader')}</div>
      </PageShell>
    );
  }

  return (
    <PageShell title={t('dashboard.invoicesTitle')} subtitle={t('dashboard.invoicesForCommunity', { name: activeCommunity.name })}>
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
                          void triggerInvoiceDownload(inv.id, inv.invoiceNumber).catch(() =>
                            toast('Failed to download PDF', 'error')
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
