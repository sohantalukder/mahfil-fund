import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DonorCreateSchema } from '../../shared/schemas.js';
import { ok } from '../../shared/http.js';
import { parseWith } from '../../shared/validate.js';
import { Errors } from '../../shared/errors.js';
import { createDonor, deleteDonor, updateDonor } from './service.js';
import { buildPagination } from '../../core/pagination.js';

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
      ...(query.donorType ? { donorType: query.donorType } : {}),
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

    const { totalPages } = buildPagination(page, pageSize, total);
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
    if (req.memberRole === 'VIEWER') throw Errors.forbidden('Viewers cannot add donors');
    const body = parseWith(DonorCreateSchema, req.body);
    const communityId = req.communityId!;
    const { entity } = await createDonor(
      { app, req, communityId, actorUserId: req.currentUser!.id },
      { ...body, preferredLanguage: body.preferredLanguage ?? 'bn' },
    );
    return ok({ donor: entity }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.patch('/donors/:id', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    if (req.memberRole === 'VIEWER') throw Errors.forbidden('Viewers cannot update donors');
    const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
    const body = parseWith(DonorUpdateSchema, req.body);
    const communityId = req.communityId!;

    const updated = await updateDonor(
      { app, req, communityId, actorUserId: req.currentUser!.id },
      { id: params.id, ...body },
    );
    return ok({ donor: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.delete('/donors/:id', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    if (req.memberRole !== 'ADMIN') {
      throw Errors.forbidden('Only admins can delete donors');
    }
    const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
    const communityId = req.communityId!;

    const updated = await deleteDonor(
      { app, req, communityId, actorUserId: req.currentUser!.id },
      { id: params.id },
    );
    return ok({ donor: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });
}
