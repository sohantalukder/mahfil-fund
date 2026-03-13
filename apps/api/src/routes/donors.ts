import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DonorCreateSchema } from '@mahfil/schemas';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { writeAuditLog } from '../shared/audit.js';
import { Errors } from '../shared/errors.js';

const DonorUpdateSchema = DonorCreateSchema.partial().extend({
  clientGeneratedId: z.string().uuid().optional()
});

export async function registerDonorRoutes(app: FastifyInstance) {
  app.get('/donors', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    const query = parseWith(
      z.object({
        search: z.string().min(1).max(80).optional(),
        donorType: z.enum(['individual', 'family', 'business', 'organization']).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(25)
      }),
      req.query
    );

    const communityId = req.communityId!;
    const where = {
      communityId,
      status: 'ACTIVE' as const,
      ...(query.donorType ? { donorType: query.donorType as never } : {}),
      ...(query.search ? {
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' as const } },
          { phone: { contains: query.search } },
          { altPhone: { contains: query.search } }
        ]
      } : {})
    };

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const [donors, total] = await Promise.all([
      app.prisma.donor.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      app.prisma.donor.count({ where })
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return ok(
      { donors, page, pageSize, total, totalPages },
      { serverTime: new Date().toISOString(), requestId: req.requestId, pagination: { page: page as number, pageSize: pageSize as number, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } }
    );
  });

  app.get('/donors/:id', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
    const communityId = req.communityId!;
    const donor = await app.prisma.donor.findFirst({ where: { id: params.id, communityId, status: 'ACTIVE' } });
    if (!donor) throw Errors.notFound('Donor not found');
    return ok({ donor }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.post('/donors', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    if (req.memberRole === 'viewer') throw Errors.forbidden('Viewers cannot add donors');
    const body = parseWith(DonorCreateSchema, req.body);
    const metaId = await req.getOrCreateRequestMetaId();
    const communityId = req.communityId!;

    if (body.clientGeneratedId) {
      const existing = await app.prisma.donor.findFirst({ where: { clientGeneratedId: body.clientGeneratedId, communityId } });
      if (existing) return ok({ donor: existing }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }

    const donor = await app.prisma.donor.create({
      data: {
        clientGeneratedId: body.clientGeneratedId ?? undefined,
        communityId,
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

    await writeAuditLog(app, req, { entityType: 'donor', entityId: donor.id, communityId, action: 'CREATE', after: donor });
    return ok({ donor }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.patch('/donors/:id', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    if (req.memberRole === 'viewer') throw Errors.forbidden('Viewers cannot update donors');
    const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
    const body = parseWith(DonorUpdateSchema, req.body);
    const communityId = req.communityId!;

    const before = await app.prisma.donor.findFirst({ where: { id: params.id, communityId } });
    if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Donor not found');

    const updated = await app.prisma.donor.update({
      where: { id: params.id },
      data: { ...body, updatedByUserId: req.currentUser!.id }
    });

    await writeAuditLog(app, req, { entityType: 'donor', entityId: updated.id, communityId, action: 'UPDATE', before, after: updated });
    return ok({ donor: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.delete('/donors/:id', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    if (req.memberRole !== 'super_admin' && req.memberRole !== 'admin') {
      throw Errors.forbidden('Only admins can delete donors');
    }
    const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
    const communityId = req.communityId!;

    const before = await app.prisma.donor.findFirst({ where: { id: params.id, communityId } });
    if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Donor not found');

    const updated = await app.prisma.donor.update({
      where: { id: params.id },
      data: { status: 'DELETED', deletedAt: new Date(), updatedByUserId: req.currentUser!.id }
    });

    await writeAuditLog(app, req, { entityType: 'donor', entityId: updated.id, communityId, action: 'DELETE', before, after: updated });
    return ok({ donor: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });
}
