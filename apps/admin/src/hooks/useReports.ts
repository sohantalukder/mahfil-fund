'use client';

import { useApiQuery } from '@/lib/query';
import { getEventSummary } from '@/services/reportService';

export const REPORTS_QUERY_KEY = 'reports';

export function useEventSummary(eventId: string) {
  return useApiQuery(
    [REPORTS_QUERY_KEY, 'event-summary', eventId],
    (api) => getEventSummary(api, eventId),
    { enabled: !!eventId }
  );
}
