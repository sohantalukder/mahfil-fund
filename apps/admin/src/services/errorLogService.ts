import type { ApiClient } from '@mahfil/api-sdk';
import type { AppErrorLog, ErrorLogListResponse } from '@/types';

export type ErrorLogListParams = {
  communityId?: string;
  level?: string;
  source?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

function buildParams(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  return p.toString();
}

export async function listErrorLogs(
  api: ApiClient,
  params: ErrorLogListParams = {}
): Promise<ErrorLogListResponse> {
  const qs = buildParams({
    communityId: params.communityId,
    level: params.level,
    source: params.source,
    search: params.search,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 25,
  });
  const res = await api.get(`/error-logs?${qs}`);
  if (!res.success) throw new Error(res.error.message);
  const d = res.data as ErrorLogListResponse | AppErrorLog[];
  if (Array.isArray(d)) {
    return { logs: d, total: d.length, totalPages: 1, page: 1 };
  }
  return {
    logs: d.logs ?? [],
    total: d.total ?? 0,
    totalPages: Math.max(1, d.totalPages ?? 1),
    page: d.page ?? 1,
  };
}

export async function reviewErrorLog(api: ApiClient, id: string): Promise<void> {
  const res = await api.patch(`/error-logs/${id}/review`, {});
  if (!res.success) throw new Error(res.error.message);
}
