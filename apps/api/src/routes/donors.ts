import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DonorCreateSchema } from '@mahfil/schemas';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { requireRoles } from '../plugins/rbac.js';
import { writeAuditLog } from '../shared/audit.js';
import { Errors } from '../shared/errors.js';

const DonorUpdateSchema = DonorCreateSchema.partial().extend({
  clientGeneratedId: z.string().uuid().optional()
});

export async function registerDonorRoutes(app: FastifyInstance) {
  app.get('/donors', { preHandler: async (req) => app.requireAuth(req) }, async (req) => {
    const query = parseWith(
      z.object({ search: z.string().min(1).max(80).optional() }),
      req.query
    );

    const where = query.search
      ? {
          status: 'ACTIVE' as const,
          OR: [
            { fullName: { contains: query.search, mode: 'insensitive' as const } },
            { phone: { contains: query.search } },
            { altPhone: { contains: query.search } }
          ]
        }
      : { status: 'ACTIVE' as const };

    const donors = await app.prisma.donor.findMany({ where, orderBy: [{ updatedAt: 'desc' }], take: 200 });
    return ok({ donors }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.get('/donors/:id', { preHandler: async (req) => app.requireAuth(req) }, async (req) => {
    const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
    const donor = await app.prisma.donor.findFirst({ where: { id: params.id, status: 'ACTIVE' } });
    if (!donor) throw Errors.notFound('Donor not found');
    return ok({ donor }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.post('/donors', { preHandler: [requireRoles(app, ['super_admin', 'admin', 'collector'])] }, async (req) => {
    const body = parseWith(DonorCreateSchema, req.body);
    const metaId = await req.getOrCreateRequestMetaId();

    if (body.clientGeneratedId) {
      const existing = await app.prisma.donor.findUnique({ where: { clientGeneratedId: body.clientGeneratedId } });
      if (existing) {
        return ok({ donor: existing }, { serverTime: new Date().toISOString(), requestId: req.requestId });
      }
    }

    const donor = await app.prisma.donor.create({
      data: {
        clientGeneratedId: body.clientGeneratedId ?? undefined,
        fullName: body.fullName,
        phone: body.phone,
        altPhone: body.altPhone ?? undefined,
        address: body.address ?? undefined,
        district: body.district ?? undefined,
        thana: body.thana ?? undefined,
        donorType: body.donorType,
        note: body.note ?? undefined,
        preferredLanguage: body.preferredLanguage,
        tags: body.tags ?? [],
        createdByUserId: req.currentUser!.id,
        updatedByUserId: req.currentUser!.id,
        createdMetaId: metaId
      }
    });

    await writeAuditLog(app, req, { entityType: 'donor', entityId: donor.id, action: 'CREATE', after: donor });
    return ok({ donor }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.patch(
    '/donors/:id',
    { preHandler: [requireRoles(app, ['super_admin', 'admin', 'collector'])] },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
      const body = parseWith(DonorUpdateSchema, req.body);

      const before = await app.prisma.donor.findUnique({ where: { id: params.id } });
      if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Donor not found');

      const updated = await app.prisma.donor.update({
        where: { id: params.id },
        data: {
          ...body,
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

      return ok({ donor: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  app.delete(
    '/donors/:id',
    { preHandler: [requireRoles(app, ['super_admin', 'admin'])] },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
      const before = await app.prisma.donor.findUnique({ where: { id: params.id } });
      if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Donor not found');

      const updated = await app.prisma.donor.update({
        where: { id: params.id },
        data: { status: 'DELETED', deletedAt: new Date(), updatedByUserId: req.currentUser!.id }
      });

      await writeAuditLog(app, req, {
        entityType: 'donor',
        entityId: updated.id,
        action: 'DELETE',
        before,
        after: updated
      });

      return ok({ donor: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );
}

