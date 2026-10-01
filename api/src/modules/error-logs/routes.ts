import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok } from '../../shared/http.js';
import { parseWith } from '../../shared/validate.js';
import { Errors } from '../../shared/errors.js';
import { sanitizeLogMessage, sanitizeLogMetadata } from '../../services/errorLogger.js';
import { buildPagination } from '../../core/pagination.js';

export async function registerErrorLogRoutes(app: FastifyInstance) {
  const adminGuard = async (req: Parameters<typeof app.requireCommunity>[0]) => app.requireCommunity(req, ['ADMIN']);

  app.get('/error-logs', { preHandler: adminGuard }, async (req) => {
    const communityId = req.communityId!;
    const query = parseWith(z.object({
      level: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
      source: z.enum(['API', 'MOBILE', 'WEB', 'ADMIN', 'SYNC', 'UPLOAD', 'EMAIL']).optional(),
      from: z.coerce.date().optional(), to: z.coerce.date().optional(),
      errorCode: z.string().max(60).optional(), search: z.string().max(100).optional(),
      page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25),
    }), req.query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where = {
      communityId,
      ...(query.level ? { level: query.level } : {}), ...(query.source ? { source: query.source } : {}),
      ...(query.errorCode ? { errorCode: query.errorCode } : {}),
      ...(query.from || query.to ? { createdAt: { gte: query.from, lte: query.to } } : {}),
      ...(query.search ? { OR: [
        { message: { contains: query.search, mode: 'insensitive' as const } },
        { errorCode: { contains: query.search, mode: 'insensitive' as const } },
        { routeName: { contains: query.search, mode: 'insensitive' as const } },
      ] } : {}),
    };
    const [logs, total] = await Promise.all([
      app.prisma.errorLog.findMany({
        where,
        select: { id: true, level: true, source: true, userId: true, requestId: true, routeName: true,
          actionName: true, errorCode: true, message: true, reviewedAt: true, createdAt: true,
          user: { select: { email: true, fullName: true } } },
        orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
      }),
      app.prisma.errorLog.count({ where }),
    ]);
    const { totalPages } = buildPagination(page, pageSize, total);
    return ok({ logs, page, pageSize, total, totalPages }, {
      serverTime: new Date().toISOString(), requestId: req.requestId,
      pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    });
  });

  app.get('/error-logs/:id', { preHandler: adminGuard }, async (req) => {
    const { id } = parseWith(z.object({ id: z.string().uuid() }), req.params);
    const log = await app.prisma.errorLog.findFirst({
      where: { id, communityId: req.communityId! },
      select: { id: true, level: true, source: true, requestId: true, routeName: true, actionName: true,
        errorCode: true, message: true, metadata: true, reviewedAt: true, createdAt: true,
        user: { select: { email: true, fullName: true } }, reviewer: { select: { email: true, fullName: true } } },
    });
    if (!log) throw Errors.notFound('Error log not found');
    return ok({ log }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.patch('/error-logs/:id/review', { preHandler: adminGuard }, async (req) => {
    const { id } = parseWith(z.object({ id: z.string().uuid() }), req.params);
    const exists = await app.prisma.errorLog.findFirst({ where: { id, communityId: req.communityId! }, select: { id: true } });
    if (!exists) throw Errors.notFound('Error log not found');
    const log = await app.prisma.errorLog.update({ where: { id }, data: { reviewedBy: req.currentUser!.id, reviewedAt: new Date() } });
    return ok({ log }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.post('/error-logs/report', {
    preHandler: async (req) => app.requireCommunity(req),
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req) => {
    const body = parseWith(z.object({
      source: z.enum(['MOBILE', 'WEB', 'ADMIN']), message: z.string().min(1).max(1000),
      errorCode: z.string().max(60).optional(), metadata: z.record(z.unknown()).optional(),
    }), req.body);
    await app.prisma.errorLog.create({ data: {
      level: 'ERROR', source: body.source, communityId: req.communityId!, userId: req.currentUser!.id,
      requestId: req.requestId, errorCode: body.errorCode ?? null, message: sanitizeLogMessage(body.message),
      stackTrace: null, metadata: sanitizeLogMetadata(body.metadata ?? {}) as never,
      ipAddress: req.ip, userAgent: req.headers['user-agent']?.slice(0, 500) ?? null,
    } });
    return ok({ message: 'Error logged' }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });
}
