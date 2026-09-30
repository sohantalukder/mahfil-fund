import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { requireRoles } from '../plugins/rbac.js';
import { writeAuditLog } from '../shared/audit.js';
import { Errors } from '../shared/errors.js';
import { checkAdminCommunityLimit, getCommunityCreationStats } from '../services/communityLimit.js';

const CommunityCreateSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().max(500).optional(),
  location: z.string().max(120).optional(),
  district: z.string().max(80).optional(),
  thana: z.string().max(80).optional(),
  contactNumber: z.string().max(20).optional(),
  email: z.string().email().optional()
});

const CommunityUpdateSchema = CommunityCreateSchema.partial().omit({ slug: true }).extend({
  status: z.enum(['ACTIVE', 'ARCHIVED', 'SUSPENDED']).optional()
});

export async function registerCommunityRoutes(app: FastifyInstance) {
  // List communities
  app.get(
    '/communities',
    { preHandler: [requireRoles(app, ['super_admin', 'admin'])] },
    async (req) => {
      const query = parseWith(
        z.object({
          search: z.string().min(1).max(80).optional(),
          status: z.enum(['ACTIVE', 'ARCHIVED', 'SUSPENDED']).optional(),
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(25)
        }),
        req.query
      );

      const isSuperAdmin = req.currentUser!.roles.includes('super_admin');
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 25;

      const where = {
        ...(isSuperAdmin ? {} : { createdByUserId: req.currentUser!.id }),
        ...(query.status ? { status: query.status } : {}),
        ...(query.search ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { slug: { contains: query.search, mode: 'insensitive' as const } },
            { district: { contains: query.search, mode: 'insensitive' as const } }
          ]
        } : {})
      };

      const [communities, total] = await Promise.all([
        app.prisma.community.findMany({
          where,
          include: {
            _count: { select: { memberships: true, events: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        app.prisma.community.count({ where })
      ]);

      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      return { success: true as const, data: { communities, page, pageSize, total, totalPages }, meta: { serverTime: new Date().toISOString(), requestId: req.requestId, pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } } };
    }
  );

  // Get my communities (communities where user is a member)
  app.get(
    '/communities/mine',
    { preHandler: async (req) => app.requireAuth(req) },
    async (req) => {
      const memberships = await app.prisma.communityMembership.findMany({
        where: { userId: req.currentUser!.id, status: 'ACTIVE' },
        include: {
          community: {
            include: { _count: { select: { memberships: true, events: true } } }
          }
        }
      });

      const communities = memberships.map((m) => ({
        ...m.community,
        memberRole: m.role,
        joinedAt: m.joinedAt
      }));

      return ok({ communities }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  // Get creation limit stats
  app.get(
    '/communities/creation-stats',
    { preHandler: [requireRoles(app, ['super_admin', 'admin'])] },
    async (req) => {
      const isSuperAdmin = req.currentUser!.roles.includes('super_admin');
      const stats = await getCommunityCreationStats(app, req.currentUser!.id, isSuperAdmin);
      return ok({ stats }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  // Get single community
  app.get(
    '/communities/:id',
    { preHandler: async (req) => app.requireAuth(req) },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
      const community = await app.prisma.community.findUnique({
        where: { id: params.id },
        include: {
          _count: { select: { memberships: true, events: true, donors: true, donations: true, expenses: true } }
        }
      });
      if (!community) throw Errors.notFound('Community not found');
      return ok({ community }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  // Get community stats
  app.get(
    '/communities/:id/stats',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
      const communityId = params.id;

      const [
        totalMembers, totalEvents, totalDonors, donationsAgg, expensesAgg, activeEvent
      ] = await Promise.all([
        app.prisma.communityMembership.count({ where: { communityId, status: 'ACTIVE' } }),
        app.prisma.event.count({ where: { communityId, status: 'ACTIVE' } }),
        app.prisma.donor.count({ where: { communityId, status: 'ACTIVE' } }),
        app.prisma.donation.aggregate({ where: { communityId, status: 'ACTIVE' }, _sum: { amount: true }, _count: { id: true } }),
        app.prisma.expense.aggregate({ where: { communityId, status: 'ACTIVE' }, _sum: { amount: true }, _count: { id: true } }),
        app.prisma.event.findFirst({ where: { communityId, isActive: true, status: 'ACTIVE' } })
      ]);

      const totalCollections = donationsAgg._sum.amount ?? 0;
      const totalExpenses = expensesAgg._sum.amount ?? 0;

      return ok(
        { totalMembers, totalEvents, totalDonors, totalCollections, totalExpenses, balance: totalCollections - totalExpenses, totalDonations: donationsAgg._count.id, activeEvent },
        { serverTime: new Date().toISOString(), requestId: req.requestId }
      );
    }
  );

  // Create community
  app.post(
    '/communities',
    { preHandler: [requireRoles(app, ['super_admin', 'admin'])] },
    async (req) => {
      const body = parseWith(CommunityCreateSchema, req.body);

      // Check admin limit
      await checkAdminCommunityLimit(app, req, req.currentUser!.id);

      const existing = await app.prisma.community.findUnique({ where: { slug: body.slug } });
      if (existing) throw Errors.conflict('A community with this slug already exists');

      const community = await app.prisma.$transaction(async (tx) => {
        const created = await tx.community.create({
          data: {
            ...body,
            createdByUserId: req.currentUser!.id
          }
        });

        // Auto-create membership for the creator as admin
        await tx.communityMembership.create({
          data: {
            userId: req.currentUser!.id,
            communityId: created.id,
            role: req.currentUser!.roles.includes('super_admin') ? 'super_admin' : 'admin',
            status: 'ACTIVE'
          }
        });

        return created;
      });

      await writeAuditLog(app, req, {
        entityType: 'community',
        entityId: community.id,
        communityId: community.id,
        action: 'CREATE',
        after: community
      });

      return ok({ community }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  // Update community
  app.patch(
    '/communities/:id',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);

      // Only admin+ can update community
      if (req.memberRole !== 'super_admin' && req.memberRole !== 'admin') {
        throw Errors.forbidden('Only admins can update community details');
      }

      const body = parseWith(CommunityUpdateSchema, req.body);
      const before = await app.prisma.community.findUniqueOrThrow({ where: { id: params.id } });

      const updated = await app.prisma.community.update({
        where: { id: params.id },
        data: body
      });

      await writeAuditLog(app, req, {
        entityType: 'community',
        entityId: updated.id,
        communityId: updated.id,
        action: 'UPDATE',
        before,
        after: updated
      });

      return ok({ community: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  // Archive community
  app.delete(
    '/communities/:id',
    { preHandler: [requireRoles(app, ['super_admin', 'admin'])] },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
      const community = await app.prisma.community.findUnique({ where: { id: params.id } });
      if (!community) throw Errors.notFound('Community not found');

      // Only creator or super_admin can archive
      if (!req.currentUser!.roles.includes('super_admin') && community.createdByUserId !== req.currentUser!.id) {
        throw Errors.forbidden('Only the community creator or super admin can archive this community');
      }

      const updated = await app.prisma.community.update({
        where: { id: params.id },
        data: { status: 'ARCHIVED' }
      });

      await writeAuditLog(app, req, {
        entityType: 'community',
        entityId: updated.id,
        communityId: updated.id,
        action: 'DELETE',
        before: community,
        after: updated
      });

      return ok({ community: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );
}
