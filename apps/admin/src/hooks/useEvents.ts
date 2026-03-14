'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCommunity } from '@/app/providers';
import { useApiQuery } from '@/lib/query';
import { getApi } from '@/lib/api';
import {
  listEvents,
  listAllEvents,
  createEvent,
  updateEvent,
  activateEvent,
  deleteEvent,
  type EventListParams,
  type CreateEventInput,
  type UpdateEventInput,
} from '@/services/eventService';

export const EVENTS_QUERY_KEY = 'events';

export function useEvents(params: EventListParams = {}) {
  const { activeCommunity } = useCommunity();
  const communityId = activeCommunity?.id ?? '';
  return useApiQuery(
    [EVENTS_QUERY_KEY, communityId, params.page ?? 1, params.pageSize ?? 25, params.search ?? ''],
    (api) => listEvents(api, params),
    { enabled: !!communityId }
  );
}

export function useAllEvents() {
  const { activeCommunity } = useCommunity();
  const communityId = activeCommunity?.id ?? '';
  return useApiQuery(
    [EVENTS_QUERY_KEY, 'all', communityId],
    (api) => listAllEvents(api),
    { enabled: !!communityId }
  );
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) => createEvent(getApi(), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEventInput }) =>
      updateEvent(getApi(), id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
    },
  });
}

export function useActivateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateEvent(getApi(), id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEvent(getApi(), id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
    },
  });
}
