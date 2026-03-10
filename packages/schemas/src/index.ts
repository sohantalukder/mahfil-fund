import { z } from 'zod';

export const UUIDSchema = z.string().uuid();

export const LocaleSchema = z.enum(['bn', 'en']);

export const UserRoleSchema = z.enum(['super_admin', 'admin', 'collector', 'viewer']);

export const DonorTypeSchema = z.enum(['individual', 'family', 'business', 'organization']);

export const PaymentMethodSchema = z.enum(['CASH', 'BKASH', 'NAGAD', 'BANK']);

export const EventCreateSchema = z.object({
  name: z.string().min(2).max(80),
  year: z.number().int().min(2000).max(2100),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

export const DonorCreateSchema = z.object({
  fullName: z.string().min(2).max(120),
  phone: z.string().min(6).max(30),
  altPhone: z.string().min(6).max(30).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  district: z.string().max(80).optional().nullable(),
  thana: z.string().max(80).optional().nullable(),
  donorType: DonorTypeSchema,
  note: z.string().max(500).optional().nullable(),
  preferredLanguage: LocaleSchema.default('bn'),
  tags: z.array(z.string().min(1).max(40)).default([]),
  clientGeneratedId: UUIDSchema.optional()
});

export const DonationCreateSchema = z.object({
  eventId: UUIDSchema,
  donorId: UUIDSchema,
  amount: z.number().positive(),
  paymentMethod: PaymentMethodSchema,
  donationDate: z.coerce.date(),
  note: z.string().max(500).optional().nullable(),
  receiptNo: z.string().max(60).optional().nullable(),
  transactionId: z.string().max(80).optional().nullable(),
  clientGeneratedId: UUIDSchema.optional()
});

export const ExpenseCreateSchema = z.object({
  eventId: UUIDSchema,
  title: z.string().min(2).max(120),
  category: z.string().min(2).max(80),
  amount: z.number().positive(),
  expenseDate: z.coerce.date(),
  vendor: z.string().max(120).optional().nullable(),
  paymentMethod: PaymentMethodSchema,
  note: z.string().max(500).optional().nullable(),
  clientGeneratedId: UUIDSchema.optional()
});

export type EventCreateInput = z.infer<typeof EventCreateSchema>;
export type DonorCreateInput = z.infer<typeof DonorCreateSchema>;
export type DonationCreateInput = z.infer<typeof DonationCreateSchema>;
export type ExpenseCreateInput = z.infer<typeof ExpenseCreateSchema>;

