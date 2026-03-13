import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DonationCreateSchema } from '@mahfil/schemas';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { requireRoles } from '../plugins/rbac.js';
import { writeAuditLog } from '../shared/audit.js';
import { Errors } from '../shared/errors.js';

const DonationUpdateSchema = DonationCreateSchema.partial().extend({
  clientGeneratedId: z.string().uuid().optional()
});

export async function registerDonationRoutes(app: FastifyInstance) {
  app.get('/donations', { preHandler: async (req) => app.requireAuth(req) }, async (req) => {
    const query = parseWith(
      z.object({
        eventId: z.string().uuid().optional(),
        donorId: z.string().uuid().optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        search: z.string().min(1).max(80).optional(),
        paymentMethod: z.enum(['CASH', 'BKASH', 'NAGAD', 'BANK']).optional(),
        limit: z.coerce.number().int().min(1).max(200).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(25)
      }),
      req.query
    );

    const donationDate =
      query.from || query.to
        ? {
            gte: query.from,
            lte: query.to
          }
        : undefined;

    const where = {
      status: 'ACTIVE' as const,
      eventId: query.eventId,
      donorId: query.donorId,
      paymentMethod: query.paymentMethod,
      donationDate,
      OR: query.search
        ? [
            { donorSnapshotName: { contains: query.search, mode: 'insensitive' as const } },
            { donorSnapshotPhone: { contains: query.search } }
          ]
        : undefined
    };

    const page = query.page ?? 1;
    const effectivePageSize = query.limit ?? query.pageSize ?? 25;
    const [donations, total] = await Promise.all([
      app.prisma.donation.findMany({
        where,
        orderBy: [{ donationDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * effectivePageSize,
        take: effectivePageSize
      }),
      app.prisma.donation.count({ where })
    ]);
    const totalPages = Math.max(1, Math.ceil(total / effectivePageSize));

    return ok(
      { donations, page, pageSize: effectivePageSize, total, totalPages },
      {
        serverTime: new Date().toISOString(),
        requestId: req.requestId,
        pagination: {
          page,
          pageSize: effectivePageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    );
  });

  app.post(
    '/donations',
    { preHandler: [requireRoles(app, ['super_admin', 'admin', 'collector'])] },
    async (req) => {
      const body = parseWith(DonationCreateSchema, req.body);
      const metaId = await req.getOrCreateRequestMetaId();

      if (body.clientGeneratedId) {
        const existing = await app.prisma.donation.findUnique({
          where: { clientGeneratedId: body.clientGeneratedId }
        });
        if (existing) {
          return ok({ donation: existing }, { serverTime: new Date().toISOString(), requestId: req.requestId });
        }
      }

      const donor = await app.prisma.donor.findFirst({ where: { id: body.donorId, status: 'ACTIVE' } });
      if (!donor) throw Errors.badRequest('Invalid donor');

      const donation = await app.prisma.donation.create({
        data: {
          clientGeneratedId: body.clientGeneratedId ?? undefined,
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

      await writeAuditLog(app, req, {
        entityType: 'donation',
        entityId: donation.id,
        action: 'CREATE',
        after: donation
      });

      return ok({ donation }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  app.patch(
    '/donations/:id',
    { preHandler: [requireRoles(app, ['super_admin', 'admin', 'collector'])] },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
      const body = parseWith(DonationUpdateSchema, req.body);

      const before = await app.prisma.donation.findUnique({ where: { id: params.id } });
      if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Donation not found');

      const updated = await app.prisma.donation.update({
        where: { id: params.id },
        data: {
          ...body,
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

      return ok({ donation: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  app.delete(
    '/donations/:id',
    { preHandler: [requireRoles(app, ['super_admin', 'admin'])] },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
      const before = await app.prisma.donation.findUnique({ where: { id: params.id } });
      if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Donation not found');

      const updated = await app.prisma.donation.update({
        where: { id: params.id },
        data: { status: 'DELETED', deletedAt: new Date(), updatedByUserId: req.currentUser!.id }
      });

      await writeAuditLog(app, req, {
        entityType: 'donation',
        entityId: updated.id,
        action: 'DELETE',
        before,
        after: updated
      });

      return ok({ donation: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );
}

