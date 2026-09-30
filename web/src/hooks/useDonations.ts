'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@/lib/query';
import { getApi } from '@/lib/api';
import { useCommunity } from '@/app/providers';
import {
  listDonations,
  createDonation,
  updateDonation,
  deleteDonation,
  downloadDonationsReportPdf,
  type DonationListParams,
  type CreateDonationInput,
  type UpdateDonationInput,
} from '@/services/donationService';

export const DONATIONS_QUERY_KEY = 'donations';

export function useDonations(params: DonationListParams = {}) {
  const { activeCommunity } = useCommunity();
  const communityId = activeCommunity?.id ?? '';
  return useApiQuery(
    [
      DONATIONS_QUERY_KEY,
      communityId,
      params.eventId ?? '',
      params.donorId ?? '',
      params.page ?? 1,
      params.pageSize ?? 25,
      params.search ?? '',
    ],
    (api) => listDonations(api, params),
    { enabled: !!communityId && !!(params.eventId || params.donorId) }
  );
}

export function useCreateDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDonationInput) => createDonation(getApi(), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [DONATIONS_QUERY_KEY] });
    },
  });
}

export function useUpdateDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDonationInput }) =>
      updateDonation(getApi(), id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [DONATIONS_QUERY_KEY] });
    },
  });
}

export function useDeleteDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDonation(getApi(), id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [DONATIONS_QUERY_KEY] });
    },
  });
}

export async function triggerDonationsReportDownload(params: {
  eventId: string;
  search?: string;
  fileName?: string;
}): Promise<void> {
  const api = getApi();
  const blob = await downloadDonationsReportPdf(api, { eventId: params.eventId, search: params.search });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = params.fileName ?? `donations-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
