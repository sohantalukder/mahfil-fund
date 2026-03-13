import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { requireRoles } from '../plugins/rbac.js';
import { writeAuditLog } from '../shared/audit.js';
import { EventCreateSchema } from '@mahfil/schemas';
import { Errors } from '../shared/errors.js';

const EventUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable()
});

export async function registerEventRoutes(app: FastifyInstance) {
  app.get('/events', { preHandler: async (req) => app.requireAuth(req) }, async (req) => {
    const query = parseWith(
      z.object({
        search: z.string().min(1).max(80).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(25)
      }),
      req.query
    );

    const searchYear = Number(query.search);
    const where = query.search
      ? {
          status: 'ACTIVE' as const,
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            ...(Number.isNaN(searchYear) ? [] : [{ year: searchYear }])
          ]
        }
      : { status: 'ACTIVE' as const };
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
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return ok(
      { events, page, pageSize, total, totalPages },
      {
        serverTime: new Date().toISOString(),
        requestId: req.requestId,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    );
  });

  app.post(
    '/events',
    { preHandler: [requireRoles(app, ['super_admin', 'admin'])] },
    async (req) => {
      const body = parseWith(EventCreateSchema, req.body);
      const metaId = await req.getOrCreateRequestMetaId();

      const created = await app.prisma.event.create({
        data: {
          name: body.name,
          year: body.year,
          startsAt: body.startsAt ?? undefined,
          endsAt: body.endsAt ?? undefined,
          createdByUserId: req.currentUser!.id,
          updatedByUserId: req.currentUser!.id,
          createdMetaId: metaId
        }
      });

      await writeAuditLog(app, req, {
        entityType: 'event',
        entityId: created.id,
        action: 'CREATE',
        after: created
      });

      return ok({ event: created }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  app.patch(
    '/events/:id',
    { preHandler: [requireRoles(app, ['super_admin', 'admin'])] },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
      const body = parseWith(EventUpdateSchema, req.body);

      const before = await app.prisma.event.findUniqueOrThrow({ where: { id: params.id } });

      const updated = await app.prisma.event.update({
        where: { id: params.id },
        data: {
          ...body,
          updatedByUserId: req.currentUser!.id
        }
      });

      await writeAuditLog(app, req, {
        entityType: 'event',
        entityId: updated.id,
        action: 'UPDATE',
        before,
        after: updated
      });

      return ok({ event: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  app.post(
    '/events/:id/activate',
    { preHandler: [requireRoles(app, ['super_admin', 'admin'])] },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);

      await app.prisma.event.updateMany({ data: { isActive: false }, where: { isActive: true } });
      const updated = await app.prisma.event.update({
        where: { id: params.id },
        data: { isActive: true, updatedByUserId: req.currentUser!.id }
      });

      await writeAuditLog(app, req, {
        entityType: 'event',
        entityId: updated.id,
        action: 'UPDATE',
        after: updated
      });

      return ok({ event: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  app.delete(
    '/events/:id',
    { preHandler: [requireRoles(app, ['super_admin', 'admin'])] },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
      const before = await app.prisma.event.findUnique({ where: { id: params.id } });
      if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Event not found');

      const updated = await app.prisma.event.update({
        where: { id: params.id },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
          isActive: false,
          updatedByUserId: req.currentUser!.id
        }
      });

      await writeAuditLog(app, req, {
        entityType: 'event',
        entityId: updated.id,
        action: 'DELETE',
        before,
        after: updated
      });

      return ok({ event: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );
}

