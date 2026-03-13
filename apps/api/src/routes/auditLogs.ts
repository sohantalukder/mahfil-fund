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
        take: z.coerce.number().int().min(1).max(200).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).optional()
      }),
      req.query
    );

    const where = {
      entityType: query.entityType,
      entityId: query.entityId,
      action: query.action
    };
    const page = query.page ?? 1;
    const effectivePageSize = query.pageSize ?? query.take ?? 50;
    const [logs, total] = await Promise.all([
      app.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * effectivePageSize,
        take: effectivePageSize,
        include: { actor: true, meta: true }
      }),
      app.prisma.auditLog.count({ where })
    ]);
    const totalPages = Math.max(1, Math.ceil(total / effectivePageSize));

    return ok(
      { logs, page, pageSize: effectivePageSize, total, totalPages },
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
}

