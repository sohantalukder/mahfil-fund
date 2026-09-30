export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
};

export type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type AppUser = {
  id: string;
  email?: string;
  fullName?: string;
  isActive: boolean;
  roles: string[];
  createdAt: string;
};

export type AppEvent = {
  id: string;
  name: string;
  year: number;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  targetAmount?: number;
};

export type Donor = {
  id: string;
  fullName: string;
  phone: string;
  altPhone?: string;
  address?: string;
  donorType: string;
  status: string;
  note?: string;
};

export type Donation = {
  id: string;
  eventId: string;
  donorId: string;
  donorSnapshotName: string;
  donorSnapshotPhone: string;
  amount: number;
  paymentMethod: string;
  donationDate: string;
  note?: string | null;
};

export type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  expenseDate: string;
  status: string;
  vendor?: string;
  paymentMethod: string;
  note?: string | null;
};

export type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  actor?: { id: string };
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  createdAt: string;
};

export type AppErrorLog = {
  id: string;
  level: string;
  source: string;
  communityId?: string;
  userId?: string;
  requestId?: string;
  routeName?: string;
  actionName?: string;
  errorCode?: string;
  message: string;
  ipAddress?: string;
  reviewedAt?: string;
  createdAt: string;
  community?: { name: string };
  user?: { email: string; fullName?: string };
};

export type EventSummary = {
  eventId: string;
  eventName?: string;
  totalDonors: number;
  totalDonations?: number;
  totalDonationsCount?: number;
  totalCollection: number;
  totalExpenses: number;
  totalExpensesCount?: number;
  balance: number;
  donationsByMethod?: Record<string, number>;
  expensesByCategory?: Record<string, number>;
};

export type UserListResponse = {
  users: AppUser[];
  total: number;
  totalPages: number;
  page: number;
};

export type EventListResponse = {
  events: AppEvent[];
  total: number;
  totalPages: number;
  page: number;
};

export type DonationListResponse = {
  donations: Donation[];
  total: number;
  totalPages: number;
  page: number;
};

export type DonorListResponse = {
  donors: Donor[];
  total: number;
  totalPages: number;
  page: number;
};

export type ExpenseListResponse = {
  expenses: Expense[];
  total: number;
  totalPages: number;
  page: number;
};

export type AuditLogListResponse = {
  logs: AuditLog[];
  total: number;
  totalPages: number;
  page: number;
};

export type ErrorLogListResponse = {
  logs: AppErrorLog[];
  total: number;
  totalPages: number;
  page: number;
};
