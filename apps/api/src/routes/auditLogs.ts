import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { requireRoles } from '../plugins/rbac.js';
import { Errors } from '../shared/errors.js';

export async function registerAuditLogRoutes(app: FastifyInstance) {
  app.get('/audit-logs', { preHandler: [requireRoles(app, ['super_admin', 'admin'])] }, async (req) => {
    const query = parseWith(
      z.object({
        communityId: z.string().uuid().optional(),
        entityType: z.string().optional(),
        entityId: z.string().uuid().optional(),
        action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'RESTORE']).optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(50)
      }),
      req.query
    );

    const isSuperAdmin = req.currentUser!.roles.includes('super_admin');

    // Admins can only view their community's audit logs
    let communityId = query.communityId;
    if (!isSuperAdmin) {
      if (!communityId) throw Errors.badRequest('Admin must provide communityId');
      const membership = await app.prisma.communityMembership.findUnique({
        where: { userId_communityId: { userId: req.currentUser!.id, communityId } }
      });
      if (!membership || membership.role !== 'admin' || membership.status !== 'ACTIVE') {
        throw Errors.forbidden('Access denied to this community audit logs');
      }
    }

    const where = {
      ...(communityId ? { communityId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.action ? { action: query.action as never } : {}),
      ...(query.from || query.to ? { createdAt: { gte: query.from, lte: query.to } } : {})
    };

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const [logs, total] = await Promise.all([
      app.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: { select: { email: true, fullName: true } },
          meta: { select: { ip: true, userAgent: true, deviceType: true } },
          community: { select: { name: true } }
        }
      }),
      app.prisma.auditLog.count({ where })
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return ok(
      { logs, page, pageSize, total, totalPages },
      { serverTime: new Date().toISOString(), requestId: req.requestId, pagination: { page: page as number, pageSize: pageSize as number, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } }
    );
  });
}
