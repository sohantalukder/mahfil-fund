'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@/lib/query';
import { getApi } from '@/lib/api';
import {
  listInvitations,
  createInvitation,
  cancelInvitation,
  resendInvitation,
  type InvitationListParams,
  type CreateInvitationInput,
} from '@/services/invitationService';

export const INVITATIONS_QUERY_KEY = 'invitations';

export function useInvitations(params: InvitationListParams) {
  return useApiQuery(
    [INVITATIONS_QUERY_KEY, params.communityId, params.status ?? '', params.page ?? 1],
    (api) => listInvitations(api, params),
    { enabled: !!params.communityId }
  );
}

export function useCreateInvitation(communityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvitationInput) =>
      createInvitation(getApi(), communityId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [INVITATIONS_QUERY_KEY, communityId] });
    },
  });
}

export function useCancelInvitation(communityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelInvitation(getApi(), id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [INVITATIONS_QUERY_KEY, communityId] });
    },
  });
}

export function useResendInvitation(communityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resendInvitation(getApi(), id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [INVITATIONS_QUERY_KEY, communityId] });
    },
  });
}
