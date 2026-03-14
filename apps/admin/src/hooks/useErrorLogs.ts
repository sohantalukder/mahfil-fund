'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@/lib/query';
import { getApi } from '@/lib/api';
import {
  listErrorLogs,
  reviewErrorLog,
  type ErrorLogListParams,
} from '@/services/errorLogService';

export const ERROR_LOGS_QUERY_KEY = 'error-logs';

export function useErrorLogs(params: ErrorLogListParams = {}) {
  return useApiQuery(
    [
      ERROR_LOGS_QUERY_KEY,
      params.communityId ?? '',
      params.level ?? '',
      params.source ?? '',
      params.search ?? '',
      params.page ?? 1,
    ],
    (api) => listErrorLogs(api, params)
  );
}

export function useReviewErrorLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reviewErrorLog(getApi(), id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ERROR_LOGS_QUERY_KEY] });
    },
  });
}
