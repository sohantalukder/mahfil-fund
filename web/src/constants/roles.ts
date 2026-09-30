export const ALL_ROLES = ['super_admin', 'admin', 'collector', 'viewer'] as const;
export type RoleName = typeof ALL_ROLES[number];

export const ROLE_COLOR: Record<RoleName, string> = {
  super_admin: '#7c3aed',
  admin: '#2563eb',
  collector: '#059669',
  viewer: '#6b7280',
};

export const ROLE_PERMS: Record<RoleName, { read: boolean; write: boolean; del: boolean; admin: boolean }> = {
  viewer:      { read: true,  write: false, del: false, admin: false },
  collector:   { read: true,  write: true,  del: false, admin: false },
  admin:       { read: true,  write: true,  del: true,  admin: false },
  super_admin: { read: true,  write: true,  del: true,  admin: true  },
};

export const ROLE_LABELS: Record<RoleName, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  collector: 'Collector',
  viewer: 'Viewer',
};

export function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
