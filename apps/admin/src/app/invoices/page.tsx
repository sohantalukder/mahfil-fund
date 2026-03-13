'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCommunity } from '../providers';
import { PageShell } from '../components/shell';
import { useToast } from '../components/toast';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: string;
  issueDate: string;
  payerName: string;
  payerPhone?: string;
  amount: number;
  status: string;
  donor?: { fullName: string };
  event?: { name: string };
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#D97706',
  ISSUED: '#16A34A',
  CANCELLED: '#EF4444'
};

const TYPE_LABELS: Record<string, string> = {
  DONATION_RECEIPT: 'Donation Receipt',
  SPONSOR_RECEIPT: 'Sponsor Receipt',
  MANUAL: 'Manual'
};

export default function InvoicesPage() {
  const { activeCommunity } = useCommunity();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ invoices: Invoice[]; total: number; totalPages: number }>({
    queryKey: ['invoices', activeCommunity?.id, statusFilter, typeFilter, page],
    queryFn: async () => {
      if (!activeCommunity?.id) return { invoices: [], total: 0, page: 1, totalPages: 1 };
      const params = new URLSearchParams({ page: String(page), pageSize: '25' });
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('invoiceType', typeFilter);
      const res = await fetch(`/api/invoices?${params}`, {
        headers: { 'X-Community-Id': activeCommunity.id }
      });
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json() as { data: { invoices: Invoice[]; total: number; totalPages: number } };
      return json.data;
    },
    enabled: !!activeCommunity?.id
  });

  async function handleDownload(id: string, invoiceNumber: string) {
    if (!activeCommunity?.id) return;
    try {
      const res = await fetch(`/api/invoices/${id}/download`, {
        headers: { 'X-Community-Id': activeCommunity.id }
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast('Failed to download PDF', 'error');
    }
  }

  if (!activeCommunity) {
    return (
      <PageShell title="Invoices" subtitle="Select a community to view invoices">
        <div className="db-card" style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
          Please select a community from the header switcher
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Invoices" subtitle={`Invoices for ${activeCommunity.name}`}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select className="db-input" style={{ flex: '0 0 160px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ISSUED">Issued</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select className="db-input" style={{ flex: '0 0 200px' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          <option value="DONATION_RECEIPT">Donation Receipt</option>
          <option value="SPONSOR_RECEIPT">Sponsor Receipt</option>
          <option value="MANUAL">Manual</option>
        </select>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>Loading invoices...</div>
      ) : (
        <div className="db-card" style={{ overflow: 'hidden' }}>
          <table className="db-table" style={{ width: '100%' }}>
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
              {!data?.invoices?.length ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>No invoices found</td></tr>
              ) : data.invoices.map((inv) => (
                <tr key={inv.id}>
                  <td><code style={{ fontSize: 11, fontWeight: 600 }}>{inv.invoiceNumber}</code></td>
                  <td style={{ fontSize: 12 }}>{TYPE_LABELS[inv.invoiceType] ?? inv.invoiceType}</td>
                  <td style={{ fontSize: 12 }}>{new Date(inv.issueDate).toLocaleDateString('en-US')}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{inv.payerName}</div>
                    {inv.payerPhone && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{inv.payerPhone}</div>}
                  </td>
                  <td style={{ fontWeight: 600, color: '#0F7B53' }}>৳{inv.amount.toLocaleString('en-US')}</td>
                  <td style={{ fontSize: 12 }}>{inv.event?.name ?? '—'}</td>
                  <td>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: STATUS_COLORS[inv.status], background: `${STATUS_COLORS[inv.status]}18` }}>
                      {inv.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="db-btn-secondary"
                      style={{ fontSize: 11, padding: '3px 8px' }}
                      onClick={() => void handleDownload(inv.id, inv.invoiceNumber)}
                    >
                      ↓ PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(data?.totalPages ?? 0) > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px' }}>
              <button className="db-btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
              <span style={{ padding: '6px 12px', fontSize: 13 }}>Page {page} of {data?.totalPages}</span>
              <button className="db-btn-secondary" disabled={page >= (data?.totalPages ?? 1)} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
