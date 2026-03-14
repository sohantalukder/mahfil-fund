import type { ApiClient } from '@mahfil/api-sdk';
import type { EventSummary } from '@/types';

export async function getEventSummary(
  api: ApiClient,
  eventId: string
): Promise<EventSummary> {
  const res = await api.get<{ summary?: EventSummary } | EventSummary>(
    `/reports/event-summary?eventId=${eventId}`
  );
  if (!res.success) throw new Error(res.error.message);
  const d = res.data as { summary?: EventSummary } | EventSummary;
  return (d as { summary?: EventSummary }).summary ?? (d as EventSummary);
}
