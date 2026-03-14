import type { ApiClient } from '@mahfil/api-sdk';
import type { AuditLog, AuditLogListResponse } from '@/types';

export type AuditLogListParams = {
  page?: number;
  pageSize?: number;
  entityType?: string;
  action?: string;
};

function buildParams(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  return p.toString();
}

export async function listAuditLogs(
  api: ApiClient,
  params: AuditLogListParams = {}
): Promise<AuditLogListResponse> {
  const qs = buildParams({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 50,
    entityType: params.entityType,
    action: params.action,
  });
  const res = await api.get(`/audit-logs?${qs}`);
  if (!res.success) throw new Error(res.error.message);
  const d = res.data as AuditLogListResponse | AuditLog[];
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
