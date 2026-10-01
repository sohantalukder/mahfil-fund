// ─── Primitives ───────────────────────────────────────────────────────────────

export type UUID = string;

export type Locale = 'bn' | 'en';

export type ThemeMode = 'light' | 'dark' | 'system';

export type CommunityRole = 'admin' | 'collector' | 'viewer';

export type DonorType = 'individual' | 'family' | 'business' | 'organization';

export type PaymentMethod = 'CASH' | 'BKASH' | 'NAGAD' | 'BANK';

export type SyncStatus = 'SYNCED' | 'PENDING' | 'SYNCING' | 'FAILED';

// ─── Multi-tenant enums ───────────────────────────────────────────────────────

export type CommunityStatus = 'ACTIVE' | 'ARCHIVED' | 'SUSPENDED';

export type MembershipStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type InvoiceType = 'DONATION_RECEIPT' | 'SPONSOR_RECEIPT' | 'MANUAL';

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'CANCELLED';

export type ErrorLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type ErrorSource = 'API' | 'MOBILE' | 'WEB' | 'ADMIN' | 'SYNC' | 'UPLOAD' | 'EMAIL';

export type ReportExportFormat = 'pdf' | 'xlsx' | 'csv';

export type ReportType =
  | 'donation_summary'
  | 'expense_summary'
  | 'donor_totals'
  | 'event_summary'
  | 'balance_summary'
  | 'payment_method_summary';

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface Community {
  id: UUID;
  name: string;
  slug: string;
  description?: string | null;
  logoAttachmentId?: string | null;
  location?: string | null;
  district?: string | null;
  thana?: string | null;
  contactNumber?: string | null;
  email?: string | null;
  status: CommunityStatus;
  createdByUserId: UUID;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityWithMembership extends Community {
  memberRole: CommunityRole;
  joinedAt: string;
}

export interface CommunityMembership {
  id: UUID;
  userId: UUID;
  communityId: UUID;
  role: CommunityRole;
  status: MembershipStatus;
  addedByUserId?: UUID | null;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: UUID;
  communityId: UUID;
  eventId?: UUID | null;
  donorId?: UUID | null;
  donationId?: UUID | null;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  issueDate: string;
  payerName: string;
  payerPhone?: string | null;
  payerAddress?: string | null;
  amount: number;
  amountInWordsBangla?: string | null;
  paymentMethod?: PaymentMethod | null;
  referenceNumber?: string | null;
  note?: string | null;
  status: InvoiceStatus;
  pdfAttachmentId?: UUID | null;
  createdByUserId?: UUID | null;
  createdAt: string;
  updatedAt: string;
}

export interface ErrorLog {
  id: UUID;
  level: ErrorLevel;
  source: ErrorSource;
  communityId?: UUID | null;
  userId?: UUID | null;
  requestId?: string | null;
  routeName?: string | null;
  actionName?: string | null;
  errorCode?: string | null;
  message: string;
  stackTrace?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  reviewedBy?: UUID | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface Attachment {
  id: UUID;
  communityId?: UUID | null;
  entityType?: string | null;
  entityId?: string | null;
  bucket: string;
  objectPath: string;
  originalName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  isPublic: boolean;
  uploadedByUserId?: UUID | null;
  createdAt: string;
  signedUrl?: string;
  publicUrl?: string;
}

// ─── API response types ───────────────────────────────────────────────────────

export interface ApiMeta {
  requestId?: string;
  serverTime: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export type ApiResponse<T> =
  | { success: true; data: T; meta: ApiMeta }
  | { success: false; error: ApiErrorShape; meta: ApiMeta };

export type UserDonation = {
  id: string;
  amount: number;
  eventName?: string;
  donationDate: string;
  status?: string;
};

export type UserDonationSummary = {
  totalDonated: number;
  lastDonationAmount: number | null;
  lastDonationAt: string | null;
  donationsCount: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function requiredString(value: unknown, field: string): string {
  if (typeof value === 'string' && value.length > 0) return value;
  throw new Error(`Invalid API response: ${field} must be a non-empty string`);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function parseUserDonations(payload: unknown): UserDonation[] {
  const body = asRecord(payload);
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(body.donations)
      ? body.donations
      : [];

  return rows.map((value) => {
    const item = asRecord(value);
    const event = asRecord(item.event);
    return {
      id: requiredString(item.id, 'donation.id'),
      amount: numberValue(item.amount),
      eventName: optionalString(item.eventName ?? item.eventSnapshotName ?? event.name),
      donationDate: requiredString(item.donationDate, 'donation.donationDate'),
      status: optionalString(item.status),
    };
  });
}

export function parseUserDonationSummary(payload: unknown): UserDonationSummary {
  const value = asRecord(payload);
  return {
    totalDonated: numberValue(value.totalDonated),
    lastDonationAmount:
      value.lastDonationAmount === null || value.lastDonationAmount === undefined
        ? null
        : numberValue(value.lastDonationAmount),
    lastDonationAt: typeof value.lastDonationAt === 'string' ? value.lastDonationAt : null,
    donationsCount: numberValue(value.donationsCount),
  };
}

// ─── Community creation stats ─────────────────────────────────────────────────

export interface CommunityCreationStats {
  created: number;
  limit: number | null;
  remaining: number | null;
}
