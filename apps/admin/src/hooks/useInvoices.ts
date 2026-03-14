'use client';

import { useApiQuery } from '@/lib/query';
import { getApi } from '@/lib/api';
import {
  listInvoices,
  downloadInvoicePdf,
  type InvoiceListParams,
} from '@/services/invoiceService';

export const INVOICES_QUERY_KEY = 'invoices';

export function useInvoices(params: InvoiceListParams = {}) {
  return useApiQuery(
    [
      INVOICES_QUERY_KEY,
      params.communityId ?? '',
      params.status ?? '',
      params.invoiceType ?? '',
      params.page ?? 1,
    ],
    (api) => listInvoices(api, params),
    { enabled: !!params.communityId }
  );
}

export async function triggerInvoiceDownload(
  invoiceId: string,
  invoiceNumber: string
): Promise<void> {
  const api = getApi();
  const blob = await downloadInvoicePdf(api, invoiceId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invoiceNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
