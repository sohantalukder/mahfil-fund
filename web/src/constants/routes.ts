export const ROUTES = {
  home: '/admin',
  login: '/login',
  communities: '/admin/communities',
  communityNew: '/admin/communities/new',
  users: '/admin/users',
  events: '/admin/events',
  donations: '/admin/donations',
  donors: '/admin/donors',
  expenses: '/admin/expenses',
  invoices: '/admin/invoices',
  invitations: '/admin/invitations',
  reports: '/admin/reports',
  auditLogs: '/admin/audit-logs',
  errorLogs: '/admin/error-logs',
  profile: '/admin/profile',
  settings: '/admin/settings',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
