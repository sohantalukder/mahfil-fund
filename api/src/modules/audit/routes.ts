import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok } from '../../shared/http.js';
import { parseWith } from '../../shared/validate.js';
import { buildPagination } from '../../core/pagination.js';

export async function registerAuditLogRoutes(app: FastifyInstance) {
  app.get('/audit-logs', { preHandler: async (req) => app.requireCommunity(req, ['ADMIN']) }, async (req) => {
    const communityId = req.communityId!;
    const query = parseWith(z.object({
      entityType: z.string().max(80).optional(), entityId: z.string().uuid().optional(),
      action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'RESTORE']).optional(),
      from: z.coerce.date().optional(), to: z.coerce.date().optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(50),
    }), req.query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where = {
      communityId,
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.from || query.to ? { createdAt: { gte: query.from, lte: query.to } } : {}),
    };
    const [logs, total] = await Promise.all([
      app.prisma.auditLog.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
        include: { actor: { select: { email: true, fullName: true } }, meta: { select: { ip: true, userAgent: true, deviceType: true } } },
      }),
      app.prisma.auditLog.count({ where }),
    ]);
    const { totalPages } = buildPagination(page, pageSize, total);
    return ok({ logs, page, pageSize, total, totalPages }, {
      serverTime: new Date().toISOString(), requestId: req.requestId,
      pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    });
  });
}
