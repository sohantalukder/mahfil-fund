import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DonationCreateSchema } from '@mahfil/schemas';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { writeAuditLog } from '../shared/audit.js';
import { Errors } from '../shared/errors.js';

const DonationUpdateSchema = DonationCreateSchema.partial().extend({
  clientGeneratedId: z.string().uuid().optional()
});

export async function registerDonationRoutes(app: FastifyInstance) {
  app.get('/donations', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    const query = parseWith(
      z.object({
        eventId: z.string().uuid().optional(),
        donorId: z.string().uuid().optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        search: z.string().min(1).max(80).optional(),
        paymentMethod: z.enum(['CASH', 'BKASH', 'NAGAD', 'BANK']).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(25)
      }),
      req.query
    );

    const communityId = req.communityId!;
    const donationDate = query.from || query.to ? { gte: query.from, lte: query.to } : undefined;

    const where = {
      communityId,
      status: 'ACTIVE' as const,
      eventId: query.eventId,
      donorId: query.donorId,
      paymentMethod: query.paymentMethod as never,
      donationDate,
      OR: query.search ? [
        { donorSnapshotName: { contains: query.search, mode: 'insensitive' as const } },
        { donorSnapshotPhone: { contains: query.search } }
      ] : undefined
    };

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const [donations, total] = await Promise.all([
      app.prisma.donation.findMany({
        where,
        orderBy: [{ donationDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      app.prisma.donation.count({ where })
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return ok(
      { donations, page, pageSize, total, totalPages },
      { serverTime: new Date().toISOString(), requestId: req.requestId, pagination: { page: page as number, pageSize: pageSize as number, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } }
    );
  });

  app.post('/donations', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    if (req.memberRole === 'viewer') throw Errors.forbidden('Viewers cannot add donations');
    const body = parseWith(DonationCreateSchema, req.body);
    const metaId = await req.getOrCreateRequestMetaId();
    const communityId = req.communityId!;

    if (body.clientGeneratedId) {
      const existing = await app.prisma.donation.findFirst({ where: { clientGeneratedId: body.clientGeneratedId, communityId } });
      if (existing) return ok({ donation: existing }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }

    const donor = await app.prisma.donor.findFirst({ where: { id: body.donorId, communityId, status: 'ACTIVE' } });
    if (!donor) throw Errors.badRequest('Invalid donor');

    const event = await app.prisma.event.findFirst({ where: { id: body.eventId, communityId, status: 'ACTIVE' } });
    if (!event) throw Errors.badRequest('Invalid event');

    const donation = await app.prisma.donation.create({
      data: {
        clientGeneratedId: body.clientGeneratedId ?? undefined,
        communityId,
        eventId: body.eventId,
        donorId: body.donorId,
        donorSnapshotName: donor.fullName,
        donorSnapshotPhone: donor.phone,
        amount: body.amount,
        paymentMethod: body.paymentMethod,
        donationDate: body.donationDate,
        note: body.note ?? undefined,
        receiptNo: body.receiptNo ?? undefined,
        transactionId: body.transactionId ?? undefined,
        createdByUserId: req.currentUser!.id,
        updatedByUserId: req.currentUser!.id,
        createdMetaId: metaId
      }
    });

    await writeAuditLog(app, req, { entityType: 'donation', entityId: donation.id, communityId, action: 'CREATE', after: donation });
    return ok({ donation }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.patch('/donations/:id', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    if (req.memberRole === 'viewer') throw Errors.forbidden('Viewers cannot update donations');
    const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
    const body = parseWith(DonationUpdateSchema, req.body);
    const communityId = req.communityId!;

    const before = await app.prisma.donation.findFirst({ where: { id: params.id, communityId } });
    if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Donation not found');

    const updated = await app.prisma.donation.update({
      where: { id: params.id },
      data: { ...body, updatedByUserId: req.currentUser!.id }
    });

    await writeAuditLog(app, req, { entityType: 'donation', entityId: updated.id, communityId, action: 'UPDATE', before, after: updated });
    return ok({ donation: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.delete('/donations/:id', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    if (req.memberRole !== 'super_admin' && req.memberRole !== 'admin') {
      throw Errors.forbidden('Only admins can delete donations');
    }
    const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
    const communityId = req.communityId!;

    const before = await app.prisma.donation.findFirst({ where: { id: params.id, communityId } });
    if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Donation not found');

    const updated = await app.prisma.donation.update({
      where: { id: params.id },
      data: { status: 'DELETED', deletedAt: new Date(), updatedByUserId: req.currentUser!.id }
    });

    await writeAuditLog(app, req, { entityType: 'donation', entityId: updated.id, communityId, action: 'DELETE', before, after: updated });
    return ok({ donation: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });
}
