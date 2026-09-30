'use client';

import { useApiQuery } from '@/lib/query';
import { useCommunity } from '@/app/providers';
import { listAuditLogs, type AuditLogListParams } from '@/services/auditLogService';

export const AUDIT_LOGS_QUERY_KEY = 'audit-logs';

export function useAuditLogs(params: AuditLogListParams = {}) {
  const { activeCommunity } = useCommunity();
  const communityId = activeCommunity?.id ?? '';
  return useApiQuery(
    [
      AUDIT_LOGS_QUERY_KEY,
      communityId,
      params.entityType ?? '',
      params.action ?? '',
      params.page ?? 1,
      params.pageSize ?? 50,
    ],
    (api) => listAuditLogs(api, params),
    { enabled: !!communityId }
  );
}
