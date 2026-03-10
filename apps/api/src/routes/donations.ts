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
        eventId: z.string().uuid(),
        donorId: z.string().uuid().optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        paymentMethod: z.enum(['CASH', 'BKASH', 'NAGAD', 'BANK']).optional()
      }),
      req.query
    );

    const donations = await app.prisma.donation.findMany({
      where: {
        status: 'ACTIVE',
        eventId: query.eventId,
        donorId: query.donorId,
        paymentMethod: query.paymentMethod,
        donationDate: {
          gte: query.from,
          lte: query.to
        }
      },
      orderBy: [{ donationDate: 'desc' }, { createdAt: 'desc' }],
      take: 200
    });

    return ok({ donations }, { serverTime: new Date().toISOString(), requestId: req.requestId });
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

