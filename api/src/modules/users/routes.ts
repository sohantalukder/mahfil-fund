import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { ok } from '../../shared/http.js';
import { parseWith } from '../../shared/validate.js';
import { requireSuperAdmin } from '../../plugins/rbac.js';
import { Errors } from '../../shared/errors.js';
import { writeAuditLog } from '../../shared/audit.js';
import { hashPassword, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '../../services/password.js';
import { revokeAllUserTokens } from '../../services/token.js';
import { buildPagination } from '../../core/pagination.js';

export async function registerUserRoutes(app: FastifyInstance) {
  const guard = { preHandler: [requireSuperAdmin(app)] };

  app.get('/platform/users', guard, async (req) => {
    const query = parseWith(z.object({
      search: z.string().min(1).max(80).optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(25),
    }), req.query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where = query.search ? {
      OR: [
        { email: { contains: query.search, mode: 'insensitive' as const } },
        { fullName: { contains: query.search, mode: 'insensitive' as const } },
      ],
    } : undefined;
    const [users, total] = await Promise.all([
      app.prisma.user.findMany({
        where,
        select: {
          id: true, email: true, phone: true, fullName: true, isActive: true,
          isSuperAdmin: true, mustChangePassword: true, createdAt: true,
          memberships: { select: { communityId: true, role: true, status: true } },
        },
        orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
      }),
      app.prisma.user.count({ where }),
    ]);
    const { totalPages } = buildPagination(page, pageSize, total);
    return ok({ users, total, page, pageSize, totalPages }, {
      serverTime: new Date().toISOString(), requestId: req.requestId,
      pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    });
  });

  app.get('/platform/reports/summary', guard, async (req) => {
    const [
      totalCommunities,
      activeCommunities,
      totalUsers,
      totalEvents,
      donationsAgg,
      totalDonors,
    ] = await Promise.all([
      app.prisma.community.count(),
      app.prisma.community.count({ where: { status: 'ACTIVE' } }),
      app.prisma.user.count({ where: { isActive: true } }),
      app.prisma.event.count({ where: { status: 'ACTIVE' } }),
      app.prisma.donation.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      app.prisma.donor.count({ where: { status: 'ACTIVE' } }),
    ]);

    return ok({
      totalCommunities,
      activeCommunities,
      totalUsers,
      totalEvents,
      totalDonors,
      totalCollections: donationsAgg._sum.amount ?? 0,
      totalDonations: donationsAgg._count.id,
    }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.get('/platform/audit-logs', guard, async (req) => {
    const query = parseWith(z.object({
      communityId: z.string().uuid().optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(25),
    }), req.query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where = query.communityId ? { communityId: query.communityId } : {};
    const [items, total] = await Promise.all([
      app.prisma.auditLog.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
        include: { actor: { select: { id: true, fullName: true } }, community: { select: { id: true, name: true } } },
      }),
      app.prisma.auditLog.count({ where }),
    ]);
    const pagination = buildPagination(page, pageSize, total);
    return ok({ items }, { serverTime: new Date().toISOString(), requestId: req.requestId, pagination });
  });

  app.patch('/platform/users/:id/status', guard, async (req) => {
    const { id } = parseWith(z.object({ id: z.string().uuid() }), req.params);
    const { isActive } = parseWith(z.object({ isActive: z.boolean() }), req.body);
    if (id === req.currentUser!.id && !isActive) throw Errors.badRequest('You cannot deactivate your own account');
    const metaId = await req.getOrCreateRequestMetaId();
    const { updated } = await app.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE "isSuperAdmin" = true FOR UPDATE`;
      const before = await tx.user.findUnique({ where: { id } });
      if (!before) throw Errors.notFound('User not found');
      if (!isActive && before.isSuperAdmin) {
        const activeSuperAdmins = await tx.user.count({ where: { isSuperAdmin: true, isActive: true } });
        if (activeSuperAdmins <= 1) throw Errors.conflict('At least one active super administrator is required');
      }
      const updated = await tx.user.update({ where: { id }, data: { isActive } });
      await writeAuditLog(app, req, {
        entityType: 'user', entityId: id, action: 'UPDATE',
        before: { isActive: before.isActive }, after: { isActive },
      }, { store: tx, metaId, required: true });
      return { before, updated };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!isActive) await revokeAllUserTokens(app, id);
    return ok({ user: { id, isActive: updated.isActive } }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.patch('/platform/users/:id/super-admin', guard, async (req) => {
    const { id } = parseWith(z.object({ id: z.string().uuid() }), req.params);
    const { isSuperAdmin } = parseWith(z.object({ isSuperAdmin: z.boolean() }), req.body);
    if (id === req.currentUser!.id && !isSuperAdmin) throw Errors.badRequest('You cannot revoke your own super-admin access');
    const metaId = await req.getOrCreateRequestMetaId();
    const { updated } = await app.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE "isSuperAdmin" = true FOR UPDATE`;
      const before = await tx.user.findUnique({ where: { id } });
      if (!before) throw Errors.notFound('User not found');
      if (!isSuperAdmin && before.isSuperAdmin && before.isActive) {
        const count = await tx.user.count({ where: { isSuperAdmin: true, isActive: true } });
        if (count <= 1) throw Errors.conflict('At least one active super administrator is required');
      }
      const updated = await tx.user.update({ where: { id }, data: { isSuperAdmin } });
      await writeAuditLog(app, req, {
        entityType: 'user', entityId: id, action: 'UPDATE',
        before: { isSuperAdmin: before.isSuperAdmin }, after: { isSuperAdmin },
      }, { store: tx, metaId, required: true });
      return { before, updated };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await revokeAllUserTokens(app, id);
    return ok({ user: { id, isSuperAdmin: updated.isSuperAdmin } }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.post('/platform/users/:id/temporary-password', guard, async (req) => {
    const { id } = parseWith(z.object({ id: z.string().uuid() }), req.params);
    const { temporaryPassword } = parseWith(z.object({ temporaryPassword: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH) }), req.body);
    const passwordHash = await hashPassword(temporaryPassword);
    const metaId = await req.getOrCreateRequestMetaId();
    await app.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id } });
      if (!user) throw Errors.notFound('User not found');
      await tx.user.update({
        where: { id }, data: { passwordHash, mustChangePassword: true },
      });
      await writeAuditLog(app, req, {
        entityType: 'user', entityId: id, action: 'UPDATE', after: { action: 'TEMPORARY_PASSWORD_SET' },
      }, { store: tx, metaId, required: true });
    });
    await revokeAllUserTokens(app, id);
    return ok({ message: 'Temporary password set' }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });
}
