import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { createHmac } from 'node:crypto';
import { DonorCreateSchema, DonationCreateSchema, ExpenseCreateSchema } from '../../shared/schemas.js';
import { ok } from '../../shared/http.js';
import { parseWith } from '../../shared/validate.js';
import { AppError, Errors } from '../../shared/errors.js';
import { createDonor, deleteDonor, updateDonor } from '../donors/service.js';
import { createDonation, deleteDonation, updateDonation } from '../donations/service.js';
import { createExpense, deleteExpense, updateExpense } from '../expenses/service.js';

const SyncEntitySchema = z.enum(['donor', 'donation', 'expense']);
const SyncOpSchema = z.enum(['create', 'update', 'delete']);
const SyncItemSchema = z.object({
  opId: z.string().uuid(),
  entity: SyncEntitySchema,
  op: SyncOpSchema,
  payload: z.unknown(),
});
const SyncPushSchema = z.object({ operations: z.array(SyncItemSchema).min(1).max(200) });
const SyncPullQuerySchema = z.object({
  since: z.coerce.date(),
  eventId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
  eventCursor: z.string().uuid().optional(),
  donorCursor: z.string().uuid().optional(),
  donationCursor: z.string().uuid().optional(),
  expenseCursor: z.string().uuid().optional(),
});
const SyncRefBaseSchema = z.object({ id: z.string().uuid().optional(), clientGeneratedId: z.string().uuid().optional() });
const withRequiredRef = <T extends { id?: string; clientGeneratedId?: string }>(schema: z.ZodType<T>) =>
  schema.refine((value) => Boolean(value.id || value.clientGeneratedId), { message: 'id or clientGeneratedId is required' });
const SyncRefSchema = withRequiredRef(SyncRefBaseSchema);
const DonorUpdatePayloadSchema = withRequiredRef(SyncRefBaseSchema.merge(DonorCreateSchema.partial()));
const DonationUpdatePayloadSchema = withRequiredRef(SyncRefBaseSchema.merge(DonationCreateSchema.partial()));
const ExpenseUpdatePayloadSchema = withRequiredRef(SyncRefBaseSchema.merge(ExpenseCreateSchema.partial()));

type SyncItem = z.infer<typeof SyncItemSchema>;
type SyncResult = { opId: string; success: boolean; serverId?: string; errorCode?: string };

async function executeSyncItem(
  app: FastifyInstance,
  req: FastifyRequest,
  store: Prisma.TransactionClient,
  metaId: string,
  communityId: string,
  item: SyncItem,
): Promise<SyncResult> {
  const context = { app, req, store, metaId, communityId, actorUserId: req.currentUser!.id };
  if (item.entity === 'donor') {
    if (item.op === 'create') {
      const { entity } = await createDonor(context, { ...parseWith(DonorCreateSchema, item.payload), preferredLanguage: parseWith(DonorCreateSchema, item.payload).preferredLanguage ?? 'bn' });
      return { opId: item.opId, success: true, serverId: entity.id };
    }
    if (item.op === 'update') {
      const entity = await updateDonor(context, parseWith(DonorUpdatePayloadSchema, item.payload));
      return { opId: item.opId, success: true, serverId: entity.id };
    }
    if (req.memberRole !== 'ADMIN') throw Errors.forbidden('Only admins can delete donors');
    const entity = await deleteDonor(context, parseWith(SyncRefSchema, item.payload));
    return { opId: item.opId, success: true, serverId: entity.id };
  }

  if (item.entity === 'donation') {
    if (item.op === 'create') {
      const { entity } = await createDonation(context, parseWith(DonationCreateSchema, item.payload));
      return { opId: item.opId, success: true, serverId: entity.id };
    }
    if (item.op === 'update') {
      const entity = await updateDonation(context, parseWith(DonationUpdatePayloadSchema, item.payload));
      return { opId: item.opId, success: true, serverId: entity.id };
    }
    if (req.memberRole !== 'ADMIN') throw Errors.forbidden('Only admins can delete donations');
    const entity = await deleteDonation(context, parseWith(SyncRefSchema, item.payload));
    return { opId: item.opId, success: true, serverId: entity.id };
  }

  if (item.op === 'create') {
    const { entity } = await createExpense(context, parseWith(ExpenseCreateSchema, item.payload));
    return { opId: item.opId, success: true, serverId: entity.id };
  }
  if (item.op === 'update') {
    const entity = await updateExpense(context, parseWith(ExpenseUpdatePayloadSchema, item.payload));
    return { opId: item.opId, success: true, serverId: entity.id };
  }
  if (req.memberRole !== 'ADMIN') throw Errors.forbidden('Only admins can delete expenses');
  const entity = await deleteExpense(context, parseWith(SyncRefSchema, item.payload));
  return { opId: item.opId, success: true, serverId: entity.id };
}

function stableErrorCode(error: unknown) {
  return error instanceof AppError ? error.code : 'SYNC_ITEM_FAILED';
}

export async function registerSyncRoutes(app: FastifyInstance) {
  app.post('/sync/push', {
    preHandler: async (req) => app.requireCommunity(req),
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (req) => {
    if (req.memberRole === 'VIEWER') throw Errors.forbidden('Viewers cannot sync data');
    const rawDeviceId = typeof req.headers['x-device-id'] === 'string' ? req.headers['x-device-id'] : undefined;
    if (!rawDeviceId || rawDeviceId.length > 200) throw Errors.badRequest('A valid X-Device-Id header is required');
    const deviceId = createHmac('sha256', app.env.JWT_SECRET).update(rawDeviceId).digest('hex');
    const body = parseWith(SyncPushSchema, req.body);
    const communityId = req.communityId!;
    const userId = req.currentUser!.id;
    const metaId = await req.getOrCreateRequestMetaId();
    const syncOp = await app.prisma.syncOperation.create({
      data: { userId, communityId, deviceId, status: 'IN_PROGRESS' },
    });
    const results: SyncResult[] = [];

    for (const item of body.operations) {
      try {
        const result = await app.prisma.$transaction(async (store) => {
          await store.syncOperationItem.create({ data: {
            syncOperationId: syncOp.id, userId, communityId, deviceId, opId: item.opId,
            status: 'IN_PROGRESS', success: null,
          } });
          const completed = await executeSyncItem(app, req, store, metaId, communityId, item);
          await store.syncOperationItem.update({
            where: { userId_communityId_deviceId_opId: { userId, communityId, deviceId, opId: item.opId } },
            data: { status: 'SUCCESS', success: true, serverId: completed.serverId ?? null, error: null },
          });
          return completed;
        });
        results.push(result);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const replay = await app.prisma.syncOperationItem.findUniqueOrThrow({
            where: { userId_communityId_deviceId_opId: { userId, communityId, deviceId, opId: item.opId } },
          });
          results.push({
            opId: item.opId,
            success: replay.status === 'SUCCESS',
            serverId: replay.serverId ?? undefined,
            errorCode: replay.status === 'IN_PROGRESS' ? 'SYNC_ITEM_IN_PROGRESS' : replay.error ?? undefined,
          });
          continue;
        }
        const errorCode = stableErrorCode(error);
        await app.prisma.syncOperationItem.upsert({
          where: { userId_communityId_deviceId_opId: { userId, communityId, deviceId, opId: item.opId } },
          create: {
            syncOperationId: syncOp.id, userId, communityId, deviceId, opId: item.opId,
            status: 'FAILED', success: false, error: errorCode,
          },
          update: { status: 'FAILED', success: false, error: errorCode },
        });
        results.push({ opId: item.opId, success: false, errorCode });
      }
    }

    const successful = results.filter((result) => result.success).length;
    const status = successful === results.length ? 'SUCCESS' : successful === 0 ? 'FAILED' : 'PARTIAL';
    await app.prisma.syncOperation.update({
      where: { id: syncOp.id },
      data: { status, finishedAt: new Date(), error: status === 'FAILED' ? 'SYNC_BATCH_FAILED' : null },
    });
    return ok({ syncOperationId: syncOp.id, status, results }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.get('/sync/pull', {
    preHandler: async (req) => app.requireCommunity(req),
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (req) => {
    const query = parseWith(SyncPullQuerySchema, req.query);
    const communityId = req.communityId!;
    const snapshot = new Date();
    if (query.since >= snapshot) throw Errors.unprocessable('since must be earlier than the current server snapshot');
    if (query.eventId) {
      const event = await app.prisma.event.findFirst({ where: { id: query.eventId, communityId }, select: { id: true } });
      if (!event) throw Errors.unprocessable('eventId does not belong to this community');
    }

    const cursorChecks = await Promise.all([
      query.eventCursor ? app.prisma.event.count({ where: { id: query.eventCursor, communityId } }) : 1,
      query.donorCursor ? app.prisma.donor.count({ where: { id: query.donorCursor, communityId } }) : 1,
      query.donationCursor ? app.prisma.donation.count({ where: { id: query.donationCursor, communityId } }) : 1,
      query.expenseCursor ? app.prisma.expense.count({ where: { id: query.expenseCursor, communityId } }) : 1,
    ]);
    if (cursorChecks.some((count) => count === 0)) throw Errors.unprocessable('A sync cursor does not belong to this community');
    const limit = query.limit ?? 200;
    const take = limit + 1;
    const updatedAt = { gt: query.since, lte: snapshot };
    const [eventRows, donorRows, donationRows, expenseRows] = await Promise.all([
      app.prisma.event.findMany({ where: { communityId, updatedAt }, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], take, ...(query.eventCursor ? { cursor: { id: query.eventCursor }, skip: 1 } : {}) }),
      app.prisma.donor.findMany({ where: { communityId, updatedAt }, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], take, ...(query.donorCursor ? { cursor: { id: query.donorCursor }, skip: 1 } : {}) }),
      app.prisma.donation.findMany({ where: { communityId, updatedAt, ...(query.eventId ? { eventId: query.eventId } : {}) }, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], take, ...(query.donationCursor ? { cursor: { id: query.donationCursor }, skip: 1 } : {}) }),
      app.prisma.expense.findMany({ where: { communityId, updatedAt, ...(query.eventId ? { eventId: query.eventId } : {}) }, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], take, ...(query.expenseCursor ? { cursor: { id: query.expenseCursor }, skip: 1 } : {}) }),
    ]);
    const page = <T extends { id: string }>(rows: T[]) => ({
      items: rows.slice(0, limit),
      nextCursor: rows.length > limit ? rows[limit - 1]?.id ?? null : null,
    });
    const events = page(eventRows);
    const donors = page(donorRows);
    const donations = page(donationRows);
    const expenses = page(expenseRows);
    return ok({ snapshot: snapshot.toISOString(), events, donors, donations, expenses }, {
      serverTime: snapshot.toISOString(), requestId: req.requestId,
    });
  });
}
