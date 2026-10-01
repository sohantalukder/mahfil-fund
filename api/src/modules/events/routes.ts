import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok } from '../../shared/http.js';
import { parseWith } from '../../shared/validate.js';
import { writeAuditLog } from '../../shared/audit.js';
import { EventCreateSchema } from '../../shared/schemas.js';
import { Errors } from '../../shared/errors.js';
import { buildPagination } from '../../core/pagination.js';

const EventUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable()
});

export async function registerEventRoutes(app: FastifyInstance) {
  app.get('/events', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    const query = parseWith(
      z.object({
        search: z.string().min(1).max(80).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(25)
      }),
      req.query
    );

    const communityId = req.communityId!;
    const searchYear = Number(query.search);
    const where = {
      communityId,
      status: 'ACTIVE' as const,
      ...(query.search ? {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          ...(Number.isNaN(searchYear) ? [] : [{ year: searchYear }])
        ]
      } : {})
    };

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const [events, total] = await Promise.all([
      app.prisma.event.findMany({
        where,
        orderBy: [{ year: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      app.prisma.event.count({ where })
    ]);
    const { totalPages } = buildPagination(page, pageSize, total);

    return ok(
      { events, page, pageSize, total, totalPages },
      { serverTime: new Date().toISOString(), requestId: req.requestId, pagination: { page: page as number, pageSize: pageSize as number, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } }
    );
  });

  app.post(
    '/events',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      if (req.memberRole !== 'ADMIN') {
        throw Errors.forbidden('Only admins can create events');
      }
      const body = parseWith(EventCreateSchema, req.body);
      const metaId = await req.getOrCreateRequestMetaId();
      const communityId = req.communityId!;

      const created = await app.prisma.$transaction(async (store) => {
        const event = await store.event.create({ data: {
          name: body.name,
          year: body.year,
          startsAt: body.startsAt ?? undefined,
          endsAt: body.endsAt ?? undefined,
          communityId,
          createdByUserId: req.currentUser!.id,
          updatedByUserId: req.currentUser!.id,
          createdMetaId: metaId
        } });
        await writeAuditLog(app, req, {
          entityType: 'event', entityId: event.id, communityId, action: 'CREATE', after: event,
        }, { store, metaId, required: true });
        return event;
      });
      return ok({ event: created }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  app.patch(
    '/events/:id',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      if (req.memberRole !== 'ADMIN') {
        throw Errors.forbidden('Only admins can update events');
      }
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
      const body = parseWith(EventUpdateSchema, req.body);
      const communityId = req.communityId!;

      const metaId = await req.getOrCreateRequestMetaId();
      const updated = await app.prisma.$transaction(async (store) => {
        const before = await store.event.findFirst({ where: { id: params.id, communityId } });
        if (!before) throw Errors.notFound('Event not found');
        const event = await store.event.update({
          where: { id: params.id }, data: { ...body, updatedByUserId: req.currentUser!.id },
        });
        await writeAuditLog(app, req, {
          entityType: 'event', entityId: event.id, communityId, action: 'UPDATE', before, after: event,
        }, { store, metaId, required: true });
        return event;
      });
      return ok({ event: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  app.post(
    '/events/:id/activate',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      if (req.memberRole !== 'ADMIN') {
        throw Errors.forbidden('Only admins can activate events');
      }
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
      const communityId = req.communityId!;

      const metaId = await req.getOrCreateRequestMetaId();
      const updated = await app.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Community" WHERE id = ${communityId}::uuid FOR UPDATE`;
        const event = await tx.event.findFirst({ where: { id: params.id, communityId, status: 'ACTIVE' } });
        if (!event) throw Errors.notFound('Event not found');
        await tx.event.updateMany({ data: { isActive: false }, where: { communityId, isActive: true } });
        const activated = await tx.event.update({
          where: { id: params.id },
          data: { isActive: true, updatedByUserId: req.currentUser!.id }
        });
        await writeAuditLog(app, req, {
          entityType: 'event', entityId: activated.id, communityId, action: 'UPDATE', after: activated,
        }, { store: tx, metaId, required: true });
        return activated;
      });
      return ok({ event: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  app.delete(
    '/events/:id',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      if (req.memberRole !== 'ADMIN') {
        throw Errors.forbidden('Only admins can delete events');
      }
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
      const communityId = req.communityId!;

      const metaId = await req.getOrCreateRequestMetaId();
      const updated = await app.prisma.$transaction(async (store) => {
        const before = await store.event.findFirst({ where: { id: params.id, communityId } });
        if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Event not found');
        const event = await store.event.update({
          where: { id: params.id },
          data: { status: 'DELETED', deletedAt: new Date(), isActive: false, updatedByUserId: req.currentUser!.id },
        });
        await writeAuditLog(app, req, {
          entityType: 'event', entityId: event.id, communityId, action: 'DELETE', before, after: event,
        }, { store, metaId, required: true });
        return event;
      });
      return ok({ event: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );
}
