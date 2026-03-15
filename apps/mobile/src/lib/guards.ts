import type { Community } from '@/contexts/CommunityContext';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);
const COLLECTOR_ROLES = new Set(['collector', 'admin', 'super_admin']);

/** Full admin tab (manage events, donors, etc.) */
export function canAccessAdminArea(communityRole: string | undefined): boolean {
  if (!communityRole) return false;
  return ADMIN_ROLES.has(communityRole) || COLLECTOR_ROLES.has(communityRole);
}

/** Strict admin only (hide sensitive ops from collector if needed) */
export function canManageUsers(communityRole: string | undefined): boolean {
  if (!communityRole) return false;
  return ADMIN_ROLES.has(communityRole);
}

export function activeCommunityRole(active: Community | null): string | undefined {
  return active?.role;
}
