'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@/lib/query';
import { getApi } from '@/lib/api';
import {
  listInvoices,
  downloadInvoicePdf,
  downloadInvoicesReportPdf,
  downloadExcessInvoicesPdf,
  createInvoice,
  type InvoiceListParams,
  type CreateInvoiceInput,
} from '@/services/invoiceService';

export const INVOICES_QUERY_KEY = 'invoices';

export function useInvoices(params: InvoiceListParams = {}) {
  return useApiQuery(
    [
      INVOICES_QUERY_KEY,
      params.communityId ?? '',
      params.status ?? '',
      params.invoiceType ?? '',
      params.search ?? '',
      params.page ?? 1,
    ],
    (api) => listInvoices(api, params),
    { enabled: !!params.communityId }
  );
}

export function useCreateInvoice(communityId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvoiceInput) => createInvoice(getApi(), input),
    onSuccess: () => {
      if (!communityId) return;
      void queryClient.invalidateQueries({ queryKey: [INVOICES_QUERY_KEY, communityId] });
    },
  });
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

export async function triggerInvoicesReportDownload(params: {
  status?: string;
  invoiceType?: string;
  fileName?: string;
}): Promise<void> {
  const api = getApi();
  const blob = await downloadInvoicesReportPdf(api, {
    status: params.status,
    invoiceType: params.invoiceType,
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = params.fileName ?? `invoices-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function triggerExcessInvoicesDownload(params: {
  status?: string;
  invoiceType?: string;
  minAmount: number;
  fileName?: string;
}): Promise<void> {
  const api = getApi();
  const blob = await downloadExcessInvoicesPdf(api, {
    status: params.status,
    invoiceType: params.invoiceType,
    minAmount: params.minAmount,
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    params.fileName ??
    `excess-invoices-${params.minAmount}-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
