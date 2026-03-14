import type { ApiClient } from '@mahfil/api-sdk';
import type { Invoice } from '@mahfil/types';

export type InvoiceListParams = {
  communityId?: string;
  page?: number;
  pageSize?: number;
  status?: string;
  invoiceType?: string;
};

export type InvoiceListResponse = {
  invoices: Invoice[];
  total: number;
  page: number;
  totalPages: number;
};

function buildParams(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  return p.toString();
}

export async function listInvoices(
  api: ApiClient,
  params: InvoiceListParams = {}
): Promise<InvoiceListResponse> {
  const qs = buildParams({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 25,
    status: params.status,
    invoiceType: params.invoiceType,
  });
  const res = await api.get<InvoiceListResponse>(`/invoices?${qs}`);
  if (!res.success) throw new Error(res.error.message);
  const d = res.data as InvoiceListResponse | Invoice[];
  if (Array.isArray(d)) {
    return { invoices: d, total: d.length, page: 1, totalPages: 1 };
  }
  return d;
}

export async function downloadInvoicePdf(
  api: ApiClient,
  invoiceId: string
): Promise<Blob> {
  const response = await api.http.get(`/invoices/${invoiceId}/download`, {
    responseType: 'blob',
  });
  return response.data as Blob;
}
