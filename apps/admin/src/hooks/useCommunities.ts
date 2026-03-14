'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@/lib/query';
import { getApi } from '@/lib/api';
import {
  listCommunities,
  getCreationStats,
  createCommunity,
  archiveCommunity,
  type CommunityListParams,
  type CreateCommunityInput,
} from '@/services/communityService';

export const COMMUNITY_QUERY_KEY = 'communities';

export function useCommunities(params: CommunityListParams = {}) {
  return useApiQuery(
    [COMMUNITY_QUERY_KEY, params.page ?? 1, params.pageSize ?? 20, params.search ?? ''],
    (api) => listCommunities(api, params)
  );
}

export function useCommunityCreationStats() {
  return useApiQuery(
    [COMMUNITY_QUERY_KEY, 'creation-stats'],
    (api) => getCreationStats(api)
  );
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCommunityInput) => createCommunity(getApi(), payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [COMMUNITY_QUERY_KEY] });
    },
  });
}

export function useArchiveCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveCommunity(getApi(), id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [COMMUNITY_QUERY_KEY] });
    },
  });
}
