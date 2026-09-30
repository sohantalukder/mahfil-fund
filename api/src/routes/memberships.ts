import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { writeAuditLog } from '../shared/audit.js';
import { Errors } from '../shared/errors.js';

export async function registerMembershipRoutes(app: FastifyInstance) {
  // List members of a community
  app.get(
    '/communities/:communityId/members',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      const params = parseWith(z.object({ communityId: z.string().uuid() }), req.params);
      const query = parseWith(
        z.object({
          search: z.string().min(1).max(80).optional(),
          role: z.enum(['super_admin', 'admin', 'collector', 'viewer']).optional(),
          status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(25)
        }),
        req.query
      );

      const where = {
        communityId: params.communityId,
        ...(query.role ? { role: query.role as never } : {}),
        ...(query.status ? { status: query.status as never } : { status: 'ACTIVE' as const }),
        ...(query.search ? {
          user: {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } }
            ]
          }
        } : {})
      };

      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 25;

      const [members, total] = await Promise.all([
        app.prisma.communityMembership.findMany({
          where,
          include: { user: { select: { id: true, email: true, fullName: true, isActive: true, createdAt: true } } },
          orderBy: { joinedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        app.prisma.communityMembership.count({ where })
      ]);

      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      return ok(
        { members, page, pageSize, total, totalPages },
        { serverTime: new Date().toISOString(), requestId: req.requestId, pagination: { page: page as number, pageSize: pageSize as number, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } }
      );
    }
  );

  // Update member role
  app.patch(
    '/communities/:communityId/members/:userId',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      const params = parseWith(
        z.object({ communityId: z.string().uuid(), userId: z.string().uuid() }),
        req.params
      );

      if (req.memberRole !== 'super_admin' && req.memberRole !== 'admin') {
        throw Errors.forbidden('Only admins can update member roles');
      }

      const body = parseWith(
        z.object({
          role: z.enum(['admin', 'collector', 'viewer']).optional(),
          status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional()
        }),
        req.body
      );

      const membership = await app.prisma.communityMembership.findUnique({
        where: { userId_communityId: { userId: params.userId, communityId: params.communityId } }
      });

      if (!membership) throw Errors.notFound('Member not found');

      // Prevent changing own role
      if (params.userId === req.currentUser!.id) {
        throw Errors.badRequest('You cannot change your own membership role');
      }

      const before = membership;
      const updated = await app.prisma.communityMembership.update({
        where: { userId_communityId: { userId: params.userId, communityId: params.communityId } },
        data: { ...body }
      });

      await writeAuditLog(app, req, {
        entityType: 'community_membership',
        entityId: updated.id,
        communityId: params.communityId,
        action: 'UPDATE',
        before,
        after: updated
      });

      return ok({ membership: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  // Remove member from community
  app.delete(
    '/communities/:communityId/members/:userId',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      const params = parseWith(
        z.object({ communityId: z.string().uuid(), userId: z.string().uuid() }),
        req.params
      );

      if (req.memberRole !== 'super_admin' && req.memberRole !== 'admin') {
        throw Errors.forbidden('Only admins can remove members');
      }

      if (params.userId === req.currentUser!.id) {
        throw Errors.badRequest('You cannot remove yourself from a community');
      }

      const membership = await app.prisma.communityMembership.findUnique({
        where: { userId_communityId: { userId: params.userId, communityId: params.communityId } }
      });

      if (!membership) throw Errors.notFound('Member not found');

      const updated = await app.prisma.communityMembership.update({
        where: { userId_communityId: { userId: params.userId, communityId: params.communityId } },
        data: { status: 'INACTIVE' }
      });

      await writeAuditLog(app, req, {
        entityType: 'community_membership',
        entityId: updated.id,
        communityId: params.communityId,
        action: 'DELETE',
        before: membership,
        after: updated
      });

      return ok({ message: 'Member removed' }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );
}
