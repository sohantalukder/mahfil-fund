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

