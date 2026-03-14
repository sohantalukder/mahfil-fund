import type { ApiClient } from '@mahfil/api-sdk';
import type { AppEvent, EventListResponse } from '@/types';

export type EventListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type CreateEventInput = {
  name: string;
  year: number;
  startsAt?: Date;
  endsAt?: Date;
  targetAmount?: number;
};

export type UpdateEventInput = Partial<CreateEventInput>;

function buildParams(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  return p.toString();
}

function normalizeEventList(data: unknown): EventListResponse {
  if (Array.isArray(data)) {
    return { events: data as AppEvent[], total: (data as AppEvent[]).length, totalPages: 1, page: 1 };
  }
  const d = data as { events?: AppEvent[]; total?: number; totalPages?: number; page?: number };
  return {
    events: d.events ?? [],
    total: d.total ?? 0,
    totalPages: Math.max(1, d.totalPages ?? 1),
    page: d.page ?? 1,
  };
}

export async function listEvents(
  api: ApiClient,
  params: EventListParams = {}
): Promise<EventListResponse> {
  const qs = buildParams({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 25,
    search: params.search,
  });
  const res = await api.get(`/events?${qs}`);
  if (!res.success) throw new Error(res.error.message);
  return normalizeEventList(res.data);
}

export async function listAllEvents(api: ApiClient): Promise<AppEvent[]> {
  const res = await api.get('/events?page=1&pageSize=100');
  if (!res.success) throw new Error(res.error.message);
  return normalizeEventList(res.data).events;
}

export async function createEvent(
  api: ApiClient,
  input: CreateEventInput
): Promise<AppEvent> {
  const res = await api.post<{ event: AppEvent }>('/events', input);
  if (!res.success) throw new Error(res.error.message);
  return res.data.event;
}

export async function updateEvent(
  api: ApiClient,
  id: string,
  input: UpdateEventInput
): Promise<AppEvent> {
  const res = await api.patch<{ event: AppEvent }>(`/events/${id}`, input);
  if (!res.success) throw new Error(res.error.message);
  return res.data.event;
}

export async function activateEvent(api: ApiClient, id: string): Promise<void> {
  const res = await api.post(`/events/${id}/activate`, {});
  if (!res.success) throw new Error(res.error.message);
}

export async function deleteEvent(api: ApiClient, id: string): Promise<void> {
  const res = await api.delete(`/events/${id}`);
  if (!res.success) throw new Error(res.error.message);
}
