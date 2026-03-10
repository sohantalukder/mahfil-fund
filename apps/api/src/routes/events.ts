import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { requireRoles } from '../plugins/rbac.js';
import { writeAuditLog } from '../shared/audit.js';
import { EventCreateSchema } from '@mahfil/schemas';

const EventUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable()
});

export async function registerEventRoutes(app: FastifyInstance) {
  app.get('/events', { preHandler: async (req) => app.requireAuth(req) }, async (req) => {
    const events = await app.prisma.event.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ year: 'desc' }]
    });
    return ok({ events }, { serverTime: new Date().toISOString(), requestId: req.requestId });
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
}

