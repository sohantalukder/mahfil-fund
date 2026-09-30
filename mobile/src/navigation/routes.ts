const routes = {
  // Root
  splash: 'Splash',
  login: 'Login',
  signup: 'SignUp',
  forgotPassword: 'ForgotPassword',
  main: 'Main',

  // Main tabs
  home: 'Home',
  communities: 'Communities',
  profile: 'Profile',

  // Home stack
  notifications: 'Notifications',

  // Communities stack
  join: 'Join',

  // Menu stack — member features
  events: 'Events',
  donations: 'Donations',
  reports: 'Reports',

  // Menu stack — expenses
  addExpense: 'AddExpense',
  expenses: 'Expenses',

  // Admin stack
  admin: 'Admin',
  adminEvents: 'AdminEvents',
  adminDonations: 'AdminDonations',
  adminExpenses: 'AdminExpenses',
  adminDonors: 'AdminDonors',
  adminAddDonor: 'AdminAddDonor',
  adminDonorDonations: 'AdminDonorDonations',
  adminInvoices: 'AdminInvoices',
  adminAddInvoice: 'AdminAddInvoice',
  adminUsers: 'AdminUsers',
  adminInvitations: 'AdminInvitations',
  adminAuditLogs: 'AdminAuditLogs',

  // Profile stack
  settings: 'Settings',
} as const;

export default routes;
