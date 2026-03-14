export const ROUTES = {
  home: '/',
  login: '/login',
  communities: '/communities',
  communityNew: '/communities/new',
  users: '/users',
  events: '/events',
  donations: '/donations',
  donors: '/donors',
  expenses: '/expenses',
  invoices: '/invoices',
  invitations: '/invitations',
  reports: '/reports',
  auditLogs: '/audit-logs',
  errorLogs: '/error-logs',
  profile: '/profile',
  settings: '/settings',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
