import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok } from '../../shared/http.js';
import { parseWith } from '../../shared/validate.js';
import { requireSuperAdmin } from '../../plugins/rbac.js';
import { writeAuditLog } from '../../shared/audit.js';
import { Errors } from '../../shared/errors.js';
import { getCommunityCreationStats } from '../../services/communityLimit.js';
import { buildPagination } from '../../core/pagination.js';

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

const CommunityUpdateSchema = CommunityCreateSchema.partial().omit({ slug: true });

export async function registerCommunityRoutes(app: FastifyInstance) {
  // List communities
  app.get(
    '/communities',
    { preHandler: async (req) => app.requireAuth(req) },
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

      const isSuperAdmin = req.currentUser!.isSuperAdmin;
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 25;

      const where = {
        ...(isSuperAdmin ? {} : { memberships: { some: { userId: req.currentUser!.id, status: 'ACTIVE' as const } } }),
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

      const { totalPages } = buildPagination(page, pageSize, total);
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
    { preHandler: async (req) => app.requireAuth(req) },
    async (req) => {
      const isSuperAdmin = req.currentUser!.isSuperAdmin;
      const stats = await getCommunityCreationStats(app, req.currentUser!.id, isSuperAdmin);
      return ok({ stats }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  // Get single community
  app.get(
    '/communities/:communityId',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      const params = parseWith(z.object({ communityId: z.string().uuid() }), req.params);
      const community = await app.prisma.community.findUnique({
        where: { id: params.communityId },
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
    '/communities/:communityId/stats',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      const params = parseWith(z.object({ communityId: z.string().uuid() }), req.params);
      const communityId = params.communityId;

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
    { preHandler: [requireSuperAdmin(app)] },
    async (req) => {
      const body = parseWith(CommunityCreateSchema, req.body);

      const existing = await app.prisma.community.findUnique({ where: { slug: body.slug } });
      if (existing) throw Errors.conflict('A community with this slug already exists');

      const metaId = await req.getOrCreateRequestMetaId();
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
            role: 'ADMIN',
            status: 'ACTIVE'
          }
        });

        await writeAuditLog(app, req, {
          entityType: 'community', entityId: created.id, communityId: created.id,
          action: 'CREATE', after: created,
        }, { store: tx, metaId, required: true });
        return created;
      });

      return ok({ community }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  // Update community
  app.patch(
    '/communities/:communityId',
    { preHandler: async (req) => app.requireCommunity(req, ['ADMIN']) },
    async (req) => {
      const params = parseWith(z.object({ communityId: z.string().uuid() }), req.params);

      const body = parseWith(CommunityUpdateSchema, req.body);
      const metaId = await req.getOrCreateRequestMetaId();
      const updated = await app.prisma.$transaction(async (tx) => {
        const before = await tx.community.findUniqueOrThrow({ where: { id: params.communityId } });
        const community = await tx.community.update({ where: { id: params.communityId }, data: body });
        await writeAuditLog(app, req, {
          entityType: 'community', entityId: community.id, communityId: community.id,
          action: 'UPDATE', before, after: community,
        }, { store: tx, metaId, required: true });
        return community;
      });

      return ok({ community: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  app.patch(
    '/platform/communities/:communityId/status',
    { preHandler: [requireSuperAdmin(app)] },
    async (req) => {
      const params = parseWith(z.object({ communityId: z.string().uuid() }), req.params);
      const { status } = parseWith(z.object({ status: z.enum(['ACTIVE', 'ARCHIVED', 'SUSPENDED']) }), req.body);
      const metaId = await req.getOrCreateRequestMetaId();
      const updated = await app.prisma.$transaction(async (tx) => {
        const before = await tx.community.findUnique({ where: { id: params.communityId } });
        if (!before) throw Errors.notFound('Community not found');
        const community = await tx.community.update({ where: { id: params.communityId }, data: { status } });
        await writeAuditLog(app, req, {
          entityType: 'community', entityId: community.id, communityId: community.id,
          action: 'UPDATE', before: { status: before.status }, after: { status },
        }, { store: tx, metaId, required: true });
        return community;
      });

      return ok({ community: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );
}
