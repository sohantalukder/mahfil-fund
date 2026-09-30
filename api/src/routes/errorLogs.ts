import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { Errors } from '../shared/errors.js';
import { requireRoles } from '../plugins/rbac.js';

export async function registerErrorLogRoutes(app: FastifyInstance) {
  // List error logs
  app.get(
    '/error-logs',
    { preHandler: [requireRoles(app, ['super_admin', 'admin'])] },
    async (req) => {
      const query = parseWith(
        z.object({
          level: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
          source: z.enum(['API', 'MOBILE', 'WEB', 'ADMIN', 'SYNC', 'UPLOAD', 'EMAIL']).optional(),
          communityId: z.string().uuid().optional(),
          from: z.coerce.date().optional(),
          to: z.coerce.date().optional(),
          errorCode: z.string().max(60).optional(),
          search: z.string().max(100).optional(),
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(25)
        }),
        req.query
      );

      const isSuperAdmin = req.currentUser!.roles.includes('super_admin');
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 25;

      // Admins can only see their own community's error logs
      let communityFilter: string | undefined;
      if (!isSuperAdmin) {
        if (!query.communityId) {
          throw Errors.badRequest('Admin must provide communityId to filter error logs');
        }
        // Verify admin is a member of that community
        const membership = await app.prisma.communityMembership.findUnique({
          where: { userId_communityId: { userId: req.currentUser!.id, communityId: query.communityId } }
        });
        if (!membership || membership.role !== 'admin' || membership.status !== 'ACTIVE') {
          throw Errors.forbidden('You can only view error logs for communities you admin');
        }
        communityFilter = query.communityId;
      } else {
        communityFilter = query.communityId;
      }

      const where = {
        ...(communityFilter ? { communityId: communityFilter } : {}),
        ...(query.level ? { level: query.level as never } : {}),
        ...(query.source ? { source: query.source as never } : {}),
        ...(query.errorCode ? { errorCode: query.errorCode } : {}),
        ...(query.from || query.to ? { createdAt: { gte: query.from, lte: query.to } } : {}),
        ...(query.search ? {
          OR: [
            { message: { contains: query.search, mode: 'insensitive' as const } },
            { errorCode: { contains: query.search, mode: 'insensitive' as const } },
            { routeName: { contains: query.search, mode: 'insensitive' as const } }
          ]
        } : {})
      };

      const [logs, total] = await Promise.all([
        app.prisma.errorLog.findMany({
          where,
          select: {
            id: true, level: true, source: true, communityId: true, userId: true,
            requestId: true, routeName: true, actionName: true, errorCode: true,
            message: true, ipAddress: true, reviewedAt: true, createdAt: true,
            community: { select: { name: true } },
            user: { select: { email: true, fullName: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        app.prisma.errorLog.count({ where })
      ]);

      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      return ok(
        { logs, page, pageSize, total, totalPages },
        { serverTime: new Date().toISOString(), requestId: req.requestId, pagination: { page: page as number, pageSize: pageSize as number, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } }
      );
    }
  );

  // Get single error log
  app.get(
    '/error-logs/:id',
    { preHandler: [requireRoles(app, ['super_admin', 'admin'])] },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
      const isSuperAdmin = req.currentUser!.roles.includes('super_admin');

      const log = await app.prisma.errorLog.findUnique({
        where: { id: params.id },
        include: {
          community: { select: { name: true } },
          user: { select: { email: true, fullName: true } },
          reviewer: { select: { email: true, fullName: true } }
        }
      });

      if (!log) throw Errors.notFound('Error log not found');

      if (!isSuperAdmin && log.communityId) {
        const membership = await app.prisma.communityMembership.findUnique({
          where: { userId_communityId: { userId: req.currentUser!.id, communityId: log.communityId } }
        });
        if (!membership || membership.role !== 'admin') {
          throw Errors.forbidden('Access denied');
        }
      }

      return ok({ log }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  // Mark as reviewed
  app.patch(
    '/error-logs/:id/review',
    { preHandler: [requireRoles(app, ['super_admin', 'admin'])] },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);

      const log = await app.prisma.errorLog.findUnique({ where: { id: params.id } });
      if (!log) throw Errors.notFound('Error log not found');

      const updated = await app.prisma.errorLog.update({
        where: { id: params.id },
        data: { reviewedBy: req.currentUser!.id, reviewedAt: new Date() }
      });

      return ok({ log: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  // Client-reported errors
  app.post(
    '/error-logs/report',
    { preHandler: async (req) => app.requireAuth(req) },
    async (req) => {
      const body = parseWith(
        z.object({
          source: z.enum(['MOBILE', 'WEB', 'ADMIN']),
          message: z.string().min(1).max(1000),
          errorCode: z.string().max(60).optional(),
          stackTrace: z.string().max(5000).optional(),
          metadata: z.record(z.unknown()).optional(),
          communityId: z.string().uuid().optional()
        }),
        req.body
      );

      await app.prisma.errorLog.create({
        data: {
          level: 'ERROR',
          source: body.source,
          communityId: body.communityId ?? null,
          userId: req.currentUser!.id,
          requestId: req.requestId,
          errorCode: body.errorCode ?? null,
          message: body.message,
          stackTrace: body.stackTrace ?? null,
          metadata: (body.metadata ?? {}) as never,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] ?? null
        }
      });

      return ok({ message: 'Error logged' }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );
}
