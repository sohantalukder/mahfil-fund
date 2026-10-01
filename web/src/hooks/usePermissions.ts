'use client';

import { useCommunity, useCurrentUser } from '@/app/providers';

export function usePermissions() {
  const { user } = useCurrentUser();
  const { activeCommunity } = useCommunity();
  const roles = new Set([activeCommunity?.role].filter(Boolean));
  const canGovern = roles.has('admin');
  const canOperate = canGovern || roles.has('collector');

  return {
    canAccessAdmin: canOperate,
    isSuperAdmin: user?.isSuperAdmin ?? false,
    canOperate,
    canGovern,
    canDelete: canGovern,
    canManageEvents: canGovern,
  };
}
