import type { CurrentUser } from '@/app/providers';

export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  if (value === '/login' || value.startsWith('/auth/')) return null;
  return value;
}

export function canAccessAdminPortal(user: Pick<CurrentUser, 'roles' | 'communities'>): boolean {
  if (user.roles.some((role) => role === 'super_admin' || role === 'admin' || role === 'collector')) {
    return true;
  }
  return user.communities.some((community) =>
    community.role === 'super_admin' || community.role === 'admin' || community.role === 'collector',
  );
}

