import type { Community } from '@/contexts/CommunityContext';

/** Roles that can perform all admin operations (manage users, settings, etc.). */
const ADMIN_ROLES = new Set(['admin', 'super_admin']);

/** Roles that can access the admin area (includes collectors who can add expenses/donations). */
const AREA_ROLES = new Set(['collector', 'admin', 'super_admin']);

/**
 * Returns true if the user has a global super_admin role.
 * Global roles come from /me → user.roles (not community memberships).
 */
export function isSuperAdmin(globalRoles: string[]): boolean {
  return globalRoles.includes('super_admin');
}

/**
 * Returns true if the community role is allowed to open the Admin tab.
 * Collectors can add expenses and donations; admins can also manage users/settings.
 * Also returns true for global super_admin regardless of community role.
 */
export function canAccessAdminArea(
  communityRole: string | undefined,
  globalRoles: string[] = [],
): boolean {
  if (isSuperAdmin(globalRoles)) return true;
  if (!communityRole) return false;
  return AREA_ROLES.has(communityRole);
}

/**
 * Returns true if the community role is allowed to manage users
 * (invite, change roles, remove members). Admin/super_admin only.
 * Also returns true for global super_admin.
 */
export function canManageUsers(
  communityRole: string | undefined,
  globalRoles: string[] = [],
): boolean {
  if (isSuperAdmin(globalRoles)) return true;
  if (!communityRole) return false;
  return ADMIN_ROLES.has(communityRole);
}

/** Convenience accessor for the active community's role string. */
export function activeCommunityRole(active: Community | null): string | undefined {
  return active?.role;
}
