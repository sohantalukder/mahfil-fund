import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DonorCreateSchema, DonationCreateSchema, ExpenseCreateSchema } from '@mahfil/schemas';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { requireRoles } from '../plugins/rbac.js';
import { writeAuditLog } from '../shared/audit.js';

const SyncEntitySchema = z.enum(['donor', 'donation', 'expense']);
const SyncOpSchema = z.enum(['create', 'update', 'delete']);

const SyncPushSchema = z.object({
  operations: z
    .array(
      z.object({
        opId: z.string().uuid(),
        entity: SyncEntitySchema,
        op: SyncOpSchema,
        payload: z.unknown(),
        idempotencyKey: z.string().uuid().optional()
      })
    )
    .min(1)
    .max(200)
});

const SyncPullQuerySchema = z.object({
  since: z.coerce.date(),
  eventId: z.string().uuid().optional()
});

const SyncRefBaseSchema = z.object({
  id: z.string().uuid().optional(),
  clientGeneratedId: z.string().uuid().optional()
});

const withRequiredRef = <T extends { id?: string; clientGeneratedId?: string }>(schema: z.ZodType<T>) =>
  schema.refine((v) => !!v.id || !!v.clientGeneratedId, {
    message: 'id or clientGeneratedId is required'
  });

const SyncRefSchema = withRequiredRef(SyncRefBaseSchema);

const DonorUpdatePayloadSchema = withRequiredRef(SyncRefBaseSchema.merge(DonorCreateSchema.partial()));
const DonationUpdatePayloadSchema = withRequiredRef(SyncRefBaseSchema.merge(DonationCreateSchema.partial()));
const ExpenseUpdatePayloadSchema = withRequiredRef(SyncRefBaseSchema.merge(ExpenseCreateSchema.partial()));

async function findDonorByRef(
  app: FastifyInstance,
  ref: { id?: string; clientGeneratedId?: string }
) {
  if (ref.id) return app.prisma.donor.findUnique({ where: { id: ref.id } });
  if (ref.clientGeneratedId) {
    return app.prisma.donor.findUnique({ where: { clientGeneratedId: ref.clientGeneratedId } });
  }
  return null;
}

async function findDonationByRef(
  app: FastifyInstance,
  ref: { id?: string; clientGeneratedId?: string }
) {
  if (ref.id) return app.prisma.donation.findUnique({ where: { id: ref.id } });
  if (ref.clientGeneratedId) {
    return app.prisma.donation.findUnique({ where: { clientGeneratedId: ref.clientGeneratedId } });
  }
  return null;
}

async function findExpenseByRef(
  app: FastifyInstance,
  ref: { id?: string; clientGeneratedId?: string }
) {
  if (ref.id) return app.prisma.expense.findUnique({ where: { id: ref.id } });
  if (ref.clientGeneratedId) {
    return app.prisma.expense.findUnique({ where: { clientGeneratedId: ref.clientGeneratedId } });
  }
  return null;
}

export async function registerSyncRoutes(app: FastifyInstance) {
  app.post(
    '/sync/push',
    { preHandler: [requireRoles(app, ['super_admin', 'admin', 'collector'])] },
    async (req) => {
      const deviceId = typeof req.headers['x-device-id'] === 'string' ? req.headers['x-device-id'] : undefined;
      if (!deviceId) {
        // For offline sync, deviceId is required to correlate operations
        throw new Error('Missing X-Device-Id');
      }

      const body = parseWith(SyncPushSchema, req.body);

      const syncOp = await app.prisma.syncOperation.create({
        data: { userId: req.currentUser!.id, deviceId, status: 'IN_PROGRESS' }
      });

      const results: Array<{ opId: string; success: boolean; serverId?: string; error?: string }> = [];

      try {
        for (const op of body.operations) {
          try {
            if (op.entity === 'donor') {
              if (op.op === 'create') {
                const input = parseWith(DonorCreateSchema, op.payload);
                const metaId = await req.getOrCreateRequestMetaId();
                const existing = input.clientGeneratedId
                  ? await app.prisma.donor.findUnique({ where: { clientGeneratedId: input.clientGeneratedId } })
                  : null;
                const donor =
                  existing ??
                  (await app.prisma.donor.create({
                    data: {
                      clientGeneratedId: input.clientGeneratedId ?? undefined,
                      fullName: input.fullName,
                      phone: input.phone,
                      altPhone: input.altPhone ?? undefined,
                      address: input.address ?? undefined,
                      district: input.district ?? undefined,
                      thana: input.thana ?? undefined,
                      donorType: input.donorType,
                      note: input.note ?? undefined,
                      preferredLanguage: input.preferredLanguage,
                      tags: input.tags ?? [],
                      createdByUserId: req.currentUser!.id,
                      updatedByUserId: req.currentUser!.id,
                      createdMetaId: metaId
                    }
                  }));
                if (!existing) {
                  await writeAuditLog(app, req, { entityType: 'donor', entityId: donor.id, action: 'CREATE', after: donor });
                }
                results.push({ opId: op.opId, success: true, serverId: donor.id });
                continue;
              }
              if (op.op === 'update') {
                const input = parseWith(DonorUpdatePayloadSchema, op.payload);
                const existing = await findDonorByRef(app, input);
                if (!existing || existing.status !== 'ACTIVE') throw new Error('Donor not found');

                const before = existing;
                const updated = await app.prisma.donor.update({
                  where: { id: existing.id },
                  data: {
                    ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
                    ...(input.phone !== undefined ? { phone: input.phone } : {}),
                    ...(input.altPhone !== undefined ? { altPhone: input.altPhone ?? undefined } : {}),
                    ...(input.address !== undefined ? { address: input.address ?? undefined } : {}),
                    ...(input.district !== undefined ? { district: input.district ?? undefined } : {}),
                    ...(input.thana !== undefined ? { thana: input.thana ?? undefined } : {}),
                    ...(input.donorType !== undefined ? { donorType: input.donorType } : {}),
                    ...(input.note !== undefined ? { note: input.note ?? undefined } : {}),
                    ...(input.preferredLanguage !== undefined ? { preferredLanguage: input.preferredLanguage } : {}),
                    ...(input.tags !== undefined ? { tags: input.tags ?? [] } : {}),
                    updatedByUserId: req.currentUser!.id
                  }
                });

                await writeAuditLog(app, req, {
                  entityType: 'donor',
                  entityId: updated.id,
                  action: 'UPDATE',
                  before,
                  after: updated
                });
                results.push({ opId: op.opId, success: true, serverId: updated.id });
                continue;
              }
              if (op.op === 'delete') {
                const input = parseWith(SyncRefSchema, op.payload);
                const existing = await findDonorByRef(app, input);
                if (!existing || existing.status !== 'ACTIVE') throw new Error('Donor not found');

                const before = existing;
                const updated = await app.prisma.donor.update({
                  where: { id: existing.id },
                  data: { status: 'DELETED', deletedAt: new Date(), updatedByUserId: req.currentUser!.id }
                });
                await writeAuditLog(app, req, {
                  entityType: 'donor',
                  entityId: updated.id,
                  action: 'DELETE',
                  before,
                  after: updated
                });
                results.push({ opId: op.opId, success: true, serverId: updated.id });
                continue;
              }
            }

            if (op.entity === 'donation') {
              if (op.op === 'create') {
                const input = parseWith(DonationCreateSchema, op.payload);
                const metaId = await req.getOrCreateRequestMetaId();
                const existing = input.clientGeneratedId
                  ? await app.prisma.donation.findUnique({ where: { clientGeneratedId: input.clientGeneratedId } })
                  : null;

                const donor = await app.prisma.donor.findFirst({ where: { id: input.donorId, status: 'ACTIVE' } });
                if (!donor) throw new Error('Invalid donor');

                const donation =
                  existing ??
                  (await app.prisma.donation.create({
                    data: {
                      clientGeneratedId: input.clientGeneratedId ?? undefined,
                      eventId: input.eventId,
                      donorId: input.donorId,
                      donorSnapshotName: donor.fullName,
                      donorSnapshotPhone: donor.phone,
                      amount: input.amount,
                      paymentMethod: input.paymentMethod,
                      donationDate: input.donationDate,
                      note: input.note ?? undefined,
                      receiptNo: input.receiptNo ?? undefined,
                      transactionId: input.transactionId ?? undefined,
                      createdByUserId: req.currentUser!.id,
                      updatedByUserId: req.currentUser!.id,
                      createdMetaId: metaId
                    }
                  }));
                if (!existing) {
                  await writeAuditLog(app, req, { entityType: 'donation', entityId: donation.id, action: 'CREATE', after: donation });
                }
                results.push({ opId: op.opId, success: true, serverId: donation.id });
                continue;
              }
              if (op.op === 'update') {
                const input = parseWith(DonationUpdatePayloadSchema, op.payload);
                const existing = await findDonationByRef(app, input);
                if (!existing || existing.status !== 'ACTIVE') throw new Error('Donation not found');
                const before = existing;

                const donor =
                  input.donorId !== undefined
                    ? await app.prisma.donor.findFirst({ where: { id: input.donorId, status: 'ACTIVE' } })
                    : null;
                if (input.donorId !== undefined && !donor) throw new Error('Invalid donor');

                const updated = await app.prisma.donation.update({
                  where: { id: existing.id },
                  data: {
                    ...(input.eventId !== undefined ? { eventId: input.eventId } : {}),
                    ...(input.donorId !== undefined ? { donorId: input.donorId } : {}),
                    ...(input.amount !== undefined ? { amount: input.amount } : {}),
                    ...(input.paymentMethod !== undefined ? { paymentMethod: input.paymentMethod } : {}),
                    ...(input.donationDate !== undefined ? { donationDate: input.donationDate } : {}),
                    ...(input.note !== undefined ? { note: input.note ?? undefined } : {}),
                    ...(input.receiptNo !== undefined ? { receiptNo: input.receiptNo ?? undefined } : {}),
                    ...(input.transactionId !== undefined ? { transactionId: input.transactionId ?? undefined } : {}),
                    ...(donor ? { donorSnapshotName: donor.fullName, donorSnapshotPhone: donor.phone } : {}),
                    updatedByUserId: req.currentUser!.id
                  }
                });

                await writeAuditLog(app, req, {
                  entityType: 'donation',
                  entityId: updated.id,
                  action: 'UPDATE',
                  before,
                  after: updated
                });
                results.push({ opId: op.opId, success: true, serverId: updated.id });
                continue;
              }
              if (op.op === 'delete') {
                const input = parseWith(SyncRefSchema, op.payload);
                const existing = await findDonationByRef(app, input);
                if (!existing || existing.status !== 'ACTIVE') throw new Error('Donation not found');

                const before = existing;
                const updated = await app.prisma.donation.update({
                  where: { id: existing.id },
                  data: { status: 'DELETED', deletedAt: new Date(), updatedByUserId: req.currentUser!.id }
                });
                await writeAuditLog(app, req, {
                  entityType: 'donation',
                  entityId: updated.id,
                  action: 'DELETE',
                  before,
                  after: updated
                });
                results.push({ opId: op.opId, success: true, serverId: updated.id });
                continue;
              }
            }

            if (op.entity === 'expense') {
              if (op.op === 'create') {
                const input = parseWith(ExpenseCreateSchema, op.payload);
                const metaId = await req.getOrCreateRequestMetaId();
                const existing = input.clientGeneratedId
                  ? await app.prisma.expense.findUnique({ where: { clientGeneratedId: input.clientGeneratedId } })
                  : null;
                const expense =
                  existing ??
                  (await app.prisma.expense.create({
                    data: {
                      clientGeneratedId: input.clientGeneratedId ?? undefined,
                      eventId: input.eventId,
                      title: input.title,
                      category: input.category,
                      amount: input.amount,
                      expenseDate: input.expenseDate,
                      vendor: input.vendor ?? undefined,
                      paymentMethod: input.paymentMethod,
                      note: input.note ?? undefined,
                      createdByUserId: req.currentUser!.id,
                      updatedByUserId: req.currentUser!.id,
                      createdMetaId: metaId
                    }
                  }));
                if (!existing) {
                  await writeAuditLog(app, req, { entityType: 'expense', entityId: expense.id, action: 'CREATE', after: expense });
                }
                results.push({ opId: op.opId, success: true, serverId: expense.id });
                continue;
              }
              if (op.op === 'update') {
                const input = parseWith(ExpenseUpdatePayloadSchema, op.payload);
                const existing = await findExpenseByRef(app, input);
                if (!existing || existing.status !== 'ACTIVE') throw new Error('Expense not found');
                const before = existing;

                const updated = await app.prisma.expense.update({
                  where: { id: existing.id },
                  data: {
                    ...(input.eventId !== undefined ? { eventId: input.eventId } : {}),
                    ...(input.title !== undefined ? { title: input.title } : {}),
                    ...(input.category !== undefined ? { category: input.category } : {}),
                    ...(input.amount !== undefined ? { amount: input.amount } : {}),
                    ...(input.expenseDate !== undefined ? { expenseDate: input.expenseDate } : {}),
                    ...(input.vendor !== undefined ? { vendor: input.vendor ?? undefined } : {}),
                    ...(input.paymentMethod !== undefined ? { paymentMethod: input.paymentMethod } : {}),
                    ...(input.note !== undefined ? { note: input.note ?? undefined } : {}),
                    updatedByUserId: req.currentUser!.id
                  }
                });

                await writeAuditLog(app, req, {
                  entityType: 'expense',
                  entityId: updated.id,
                  action: 'UPDATE',
                  before,
                  after: updated
                });
                results.push({ opId: op.opId, success: true, serverId: updated.id });
                continue;
              }
              if (op.op === 'delete') {
                const input = parseWith(SyncRefSchema, op.payload);
                const existing = await findExpenseByRef(app, input);
                if (!existing || existing.status !== 'ACTIVE') throw new Error('Expense not found');

                const before = existing;
                const updated = await app.prisma.expense.update({
                  where: { id: existing.id },
                  data: { status: 'DELETED', deletedAt: new Date(), updatedByUserId: req.currentUser!.id }
                });
                await writeAuditLog(app, req, {
                  entityType: 'expense',
                  entityId: updated.id,
                  action: 'DELETE',
                  before,
                  after: updated
                });
                results.push({ opId: op.opId, success: true, serverId: updated.id });
                continue;
              }
            }

            results.push({ opId: op.opId, success: false, error: 'Unsupported operation' });
          } catch (e) {
            results.push({ opId: op.opId, success: false, error: e instanceof Error ? e.message : 'Unknown error' });
          }
        }

        await app.prisma.syncOperation.update({
          where: { id: syncOp.id },
          data: { status: 'SUCCESS', finishedAt: new Date() }
        });
      } catch (e) {
        await app.prisma.syncOperation.update({
          where: { id: syncOp.id },
          data: { status: 'FAILED', finishedAt: new Date(), error: e instanceof Error ? e.message : 'Unknown error' }
        });
        throw e;
      }

      return ok({ syncOperationId: syncOp.id, results }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  app.get('/sync/pull', { preHandler: async (req) => app.requireAuth(req) }, async (req) => {
    const query = parseWith(SyncPullQuerySchema, req.query);

    const [events, donors, donations, expenses] = await Promise.all([
      app.prisma.event.findMany({ where: { updatedAt: { gt: query.since } }, orderBy: { updatedAt: 'asc' } }),
      app.prisma.donor.findMany({ where: { updatedAt: { gt: query.since } }, orderBy: { updatedAt: 'asc' } }),
      app.prisma.donation.findMany({
        where: {
          updatedAt: { gt: query.since },
          ...(query.eventId ? { eventId: query.eventId } : {})
        },
        orderBy: { updatedAt: 'asc' }
      }),
      app.prisma.expense.findMany({
        where: {
          updatedAt: { gt: query.since },
          ...(query.eventId ? { eventId: query.eventId } : {})
        },
        orderBy: { updatedAt: 'asc' }
      })
    ]);

    return ok(
      { events, donors, donations, expenses, serverTime: new Date().toISOString() },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });
}

