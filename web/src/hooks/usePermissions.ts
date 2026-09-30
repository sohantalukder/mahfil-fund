'use client';

import { useCommunity, useCurrentUser } from '@/app/providers';

export function usePermissions() {
  const { user } = useCurrentUser();
  const { activeCommunity } = useCommunity();
  const roles = new Set([...(user?.roles ?? []), activeCommunity?.role].filter(Boolean));
  const canGovern = roles.has('super_admin') || roles.has('admin');
  const canOperate = canGovern || roles.has('collector');

  return {
    canAccessAdmin: canOperate,
    canOperate,
    canGovern,
    canDelete: canGovern,
    canManageEvents: canGovern,
  };
}
