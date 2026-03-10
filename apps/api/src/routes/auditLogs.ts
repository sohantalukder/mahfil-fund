import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { requireRoles } from '../plugins/rbac.js';

export async function registerAuditLogRoutes(app: FastifyInstance) {
  app.get('/audit-logs', { preHandler: [requireRoles(app, ['super_admin', 'admin'])] }, async (req) => {
    const query = parseWith(
      z.object({
        entityType: z.string().optional(),
        entityId: z.string().uuid().optional(),
        action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'RESTORE']).optional(),
        take: z.coerce.number().int().min(1).max(200).default(50)
      }),
      req.query
    );

    const logs = await app.prisma.auditLog.findMany({
      where: {
        entityType: query.entityType,
        entityId: query.entityId,
        action: query.action
      },
      orderBy: { createdAt: 'desc' },
      take: query.take,
      include: { actor: true, meta: true }
    });

    return ok({ logs }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });
}

