'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@/lib/query';
import { getApi } from '@/lib/api';
import {
  listDonors,
  listAllDonors,
  createDonor,
  updateDonor,
  deleteDonor,
  getDonorDonations,
  type DonorListParams,
  type CreateDonorInput,
  type UpdateDonorInput,
} from '@/services/donorService';

export const DONORS_QUERY_KEY = 'donors';

export function useDonors(params: DonorListParams = {}) {
  return useApiQuery(
    [DONORS_QUERY_KEY, params.page ?? 1, params.pageSize ?? 25, params.search ?? ''],
    (api) => listDonors(api, params)
  );
}

export function useAllDonors() {
  return useApiQuery(
    [DONORS_QUERY_KEY, 'all'],
    (api) => listAllDonors(api)
  );
}

export function useDonorDonations(donorId: string) {
  return useApiQuery(
    [DONORS_QUERY_KEY, donorId, 'donations'],
    (api) => getDonorDonations(api, donorId),
    { enabled: !!donorId }
  );
}

export function useCreateDonor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDonorInput) => createDonor(getApi(), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [DONORS_QUERY_KEY] });
    },
  });
}

export function useUpdateDonor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDonorInput }) =>
      updateDonor(getApi(), id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [DONORS_QUERY_KEY] });
    },
  });
}

export function useDeleteDonor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDonor(getApi(), id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [DONORS_QUERY_KEY] });
    },
  });
}
