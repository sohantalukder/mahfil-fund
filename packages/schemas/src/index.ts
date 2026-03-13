import { z } from 'zod';

// ─── Primitive schemas ─────────────────────────────────────────────────────────

export const UUIDSchema = z.string().uuid();
export const LocaleSchema = z.enum(['bn', 'en']);
export const UserRoleSchema = z.enum(['super_admin', 'admin', 'collector', 'viewer']);
export const DonorTypeSchema = z.enum(['individual', 'family', 'business', 'organization']);
export const PaymentMethodSchema = z.enum(['CASH', 'BKASH', 'NAGAD', 'BANK']);

// ─── Community schemas ─────────────────────────────────────────────────────────

export const CommunityCreateSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  description: z.string().max(500).optional(),
  location: z.string().max(120).optional(),
  district: z.string().max(80).optional(),
  thana: z.string().max(80).optional(),
  contactNumber: z.string().max(20).optional(),
  email: z.string().email().optional()
});

export const CommunityUpdateSchema = CommunityCreateSchema.partial().omit({ slug: true }).extend({
  status: z.enum(['ACTIVE', 'ARCHIVED', 'SUSPENDED']).optional()
});

// ─── Invitation schemas ────────────────────────────────────────────────────────

export const InvitationCreateSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  phoneNumber: z.string().max(20).optional(),
  role: z.enum(['admin', 'collector', 'viewer']),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
  note: z.string().max(300).optional()
});

export const InvitationVerifySchema = z.object({
  email: z.string().email(),
  inviteCode: z.string().min(16).max(19),
  fullName: z.string().min(2).max(120).optional(),
  password: z.string().min(8).max(72).optional()
});

// ─── Event schemas ─────────────────────────────────────────────────────────────

export const EventCreateSchema = z.object({
  name: z.string().min(2).max(80),
  year: z.coerce.number().int().min(2000).max(2100),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  clientGeneratedId: z.string().uuid().optional()
});

// ─── Donor schemas ─────────────────────────────────────────────────────────────

export const DonorCreateSchema = z.object({
  fullName: z.string().min(2).max(120),
  phone: z.string().min(6).max(20),
  altPhone: z.string().max(20).optional(),
  address: z.string().max(200).optional(),
  area: z.string().max(80).optional(),
  district: z.string().max(80).optional(),
  thana: z.string().max(80).optional(),
  donorType: DonorTypeSchema,
  note: z.string().max(500).optional(),
  preferredLanguage: LocaleSchema.default('bn'),
  tags: z.array(z.string().max(50)).max(10).optional(),
  clientGeneratedId: z.string().uuid().optional()
});

// ─── Donation schemas ──────────────────────────────────────────────────────────

export const DonationCreateSchema = z.object({
  eventId: UUIDSchema,
  donorId: UUIDSchema,
  amount: z.coerce.number().int().min(1),
  paymentMethod: PaymentMethodSchema,
  donationDate: z.coerce.date(),
  note: z.string().max(300).optional(),
  receiptNo: z.string().max(60).optional(),
  transactionId: z.string().max(80).optional(),
  clientGeneratedId: z.string().uuid().optional()
});

// ─── Expense schemas ───────────────────────────────────────────────────────────

export const ExpenseCreateSchema = z.object({
  eventId: UUIDSchema,
  title: z.string().min(1).max(120),
  category: z.string().min(1).max(60),
  amount: z.coerce.number().int().min(1),
  expenseDate: z.coerce.date(),
  vendor: z.string().max(120).optional(),
  paymentMethod: PaymentMethodSchema,
  note: z.string().max(300).optional(),
  clientGeneratedId: z.string().uuid().optional()
});

// ─── Invoice schemas ───────────────────────────────────────────────────────────

export const InvoiceCreateSchema = z.object({
  eventId: UUIDSchema.optional(),
  donorId: UUIDSchema.optional(),
  invoiceType: z.enum(['DONATION_RECEIPT', 'SPONSOR_RECEIPT', 'MANUAL']),
  issueDate: z.coerce.date(),
  payerName: z.string().min(1).max(120),
  payerPhone: z.string().max(20).optional(),
  payerAddress: z.string().max(200).optional(),
  amount: z.coerce.number().int().min(1),
  paymentMethod: PaymentMethodSchema.optional(),
  referenceNumber: z.string().max(80).optional(),
  note: z.string().max(300).optional()
});

// ─── Report export schemas ─────────────────────────────────────────────────────

export const ReportExportSchema = z.object({
  type: z.enum(['donation_summary', 'expense_summary', 'donor_totals', 'event_summary', 'balance_summary', 'payment_method_summary']),
  format: z.enum(['pdf', 'xlsx', 'csv']),
  filters: z.object({
    eventId: UUIDSchema.optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    donorId: UUIDSchema.optional(),
    paymentMethod: PaymentMethodSchema.optional()
  }).optional()
});

// ─── Upload schema ─────────────────────────────────────────────────────────────

export const UploadEntityTypeSchema = z.enum([
  'community_logo', 'donor_profile', 'donation_proof', 'expense_receipt', 'invoice_pdf'
]);

// ─── Inferred types ────────────────────────────────────────────────────────────

export type CommunityCreateInput = z.infer<typeof CommunityCreateSchema>;
export type CommunityUpdateInput = z.infer<typeof CommunityUpdateSchema>;
export type InvitationCreateInput = z.infer<typeof InvitationCreateSchema>;
export type InvitationVerifyInput = z.infer<typeof InvitationVerifySchema>;
export type EventCreateInput = z.infer<typeof EventCreateSchema>;
export type DonorCreateInput = z.infer<typeof DonorCreateSchema>;
export type DonationCreateInput = z.infer<typeof DonationCreateSchema>;
export type ExpenseCreateInput = z.infer<typeof ExpenseCreateSchema>;
export type InvoiceCreateInput = z.infer<typeof InvoiceCreateSchema>;
export type ReportExportInput = z.infer<typeof ReportExportSchema>;
