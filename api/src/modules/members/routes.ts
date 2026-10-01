import type { FastifyInstance } from 'fastify';
import { Prisma, type CommunityRole } from '@prisma/client';
import { z } from 'zod';
import { ok } from '../../shared/http.js';
import { parseWith } from '../../shared/validate.js';
import { writeAuditLog } from '../../shared/audit.js';
import { Errors } from '../../shared/errors.js';
import { hashPassword, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '../../services/password.js';
import { buildPagination } from '../../core/pagination.js';

const roleSchema = z.enum(['admin', 'collector', 'viewer']);
const toRole = (role: z.infer<typeof roleSchema>): CommunityRole => role.toUpperCase() as CommunityRole;

const CreateMemberSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('new'), email: z.string().email(), fullName: z.string().min(2).max(120),
    temporaryPassword: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH), role: roleSchema,
  }),
  z.object({ kind: z.literal('existing'), email: z.string().email(), role: roleSchema }),
]);

type MembershipStore = Pick<Prisma.TransactionClient, 'communityMembership'>;

async function ensureAnotherAdmin(store: MembershipStore, communityId: string, userId: string) {
  const target = await store.communityMembership.findUnique({
    where: { userId_communityId: { userId, communityId } },
  });
  if (target?.role !== 'ADMIN' || target.status !== 'ACTIVE') return;
  const count = await store.communityMembership.count({
    where: { communityId, role: 'ADMIN', status: 'ACTIVE' },
  });
  if (count <= 1) throw Errors.conflict('At least one active community administrator is required');
}

async function serializable<T>(app: FastifyInstance, operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await app.prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034') throw error;
    }
  }
  throw Errors.conflict('Membership changed concurrently; please retry');
}

export async function registerMembershipRoutes(app: FastifyInstance) {
  const adminGuard = async (req: Parameters<typeof app.requireCommunity>[0]) => app.requireCommunity(req, ['ADMIN']);

  app.get('/communities/:communityId/members', { preHandler: adminGuard }, async (req) => {
    const { communityId } = parseWith(z.object({ communityId: z.string().uuid() }), req.params);
    const query = parseWith(z.object({
      search: z.string().min(1).max(80).optional(),
      role: roleSchema.optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(25),
    }), req.query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where = {
      communityId,
      ...(query.role ? { role: toRole(query.role) } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { user: { OR: [
        { fullName: { contains: query.search, mode: 'insensitive' as const } },
        { email: { contains: query.search, mode: 'insensitive' as const } },
      ] } } : {}),
    };
    const [members, total] = await Promise.all([
      app.prisma.communityMembership.findMany({
        where,
        include: { user: { select: { id: true, email: true, fullName: true, isActive: true, mustChangePassword: true, createdAt: true } } },
        orderBy: { joinedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
      }),
      app.prisma.communityMembership.count({ where }),
    ]);
    const normalized = members.map((member) => ({ ...member, role: member.role.toLowerCase() }));
    const { totalPages } = buildPagination(page, pageSize, total);
    return ok({ members: normalized, total, page, pageSize, totalPages }, {
      serverTime: new Date().toISOString(), requestId: req.requestId,
      pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    });
  });

  app.post('/communities/:communityId/members', { preHandler: adminGuard }, async (req) => {
    const { communityId } = parseWith(z.object({ communityId: z.string().uuid() }), req.params);
    const body = parseWith(CreateMemberSchema, req.body);
    const email = body.email.trim().toLowerCase();
    const temporaryPasswordHash = body.kind === 'new'
      ? await hashPassword(body.temporaryPassword)
      : undefined;
    const metaId = await req.getOrCreateRequestMetaId();
    let result;
    try {
      result = await app.prisma.$transaction(async (tx) => {
        let user = await tx.user.findFirst({ where: { email } });
        let createdAccount = false;
        if (body.kind === 'new') {
          if (user) throw Errors.conflict('An account already exists for this email');
          user = await tx.user.create({ data: {
            email, fullName: body.fullName.trim(), passwordHash: temporaryPasswordHash!,
            isActive: true, mustChangePassword: true,
          } });
          createdAccount = true;
        } else if (!user?.isActive) {
          throw Errors.notFound('Active account not found');
        }
        const existing = await tx.communityMembership.findUnique({
          where: { userId_communityId: { userId: user.id, communityId } },
        });
        if (existing) throw Errors.conflict('User is already a member of this community');
        const membership = await tx.communityMembership.create({ data: {
          userId: user.id, communityId, role: toRole(body.role), status: 'ACTIVE',
          addedByUserId: req.currentUser!.id,
        } });
        await writeAuditLog(app, req, {
          entityType: 'community_membership', entityId: membership.id, communityId, action: 'CREATE',
          after: { userId: user.id, role: membership.role, createdAccount },
        }, { store: tx, metaId, required: true });
        return { user, membership, createdAccount };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw Errors.conflict('Account or community membership already exists');
      }
      throw error;
    }
    return ok({
      member: { ...result.membership, role: result.membership.role.toLowerCase(), user: { id: result.user.id, email, fullName: result.user.fullName } },
      createdAccount: result.createdAccount,
    }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.patch('/communities/:communityId/members/:userId', { preHandler: adminGuard }, async (req) => {
    const params = parseWith(z.object({ communityId: z.string().uuid(), userId: z.string().uuid() }), req.params);
    const body = parseWith(z.object({ role: roleSchema.optional(), status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional() }).refine((v) => v.role || v.status, 'No changes supplied'), req.body);
    if (params.userId === req.currentUser!.id) throw Errors.badRequest('You cannot change your own membership');
    const metaId = await req.getOrCreateRequestMetaId();
    const { updated } = await serializable(app, async (tx) => {
      const before = await tx.communityMembership.findUnique({ where: { userId_communityId: params } });
      if (!before) throw Errors.notFound('Member not found');
      if ((body.role && toRole(body.role) !== 'ADMIN') || (body.status && body.status !== 'ACTIVE')) {
        await ensureAnotherAdmin(tx, params.communityId, params.userId);
      }
      const updated = await tx.communityMembership.update({
        where: { userId_communityId: params }, data: { ...(body.role ? { role: toRole(body.role) } : {}), ...(body.status ? { status: body.status } : {}) },
      });
      await writeAuditLog(app, req, {
        entityType: 'community_membership', entityId: updated.id, communityId: params.communityId,
        action: 'UPDATE', before, after: updated,
      }, { store: tx, metaId, required: true });
      return { before, updated };
    });
    return ok({ membership: { ...updated, role: updated.role.toLowerCase() } }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.delete('/communities/:communityId/members/:userId', { preHandler: adminGuard }, async (req) => {
    const params = parseWith(z.object({ communityId: z.string().uuid(), userId: z.string().uuid() }), req.params);
    if (params.userId === req.currentUser!.id) throw Errors.badRequest('You cannot remove yourself');
    const metaId = await req.getOrCreateRequestMetaId();
    await serializable(app, async (tx) => {
      const before = await tx.communityMembership.findUnique({ where: { userId_communityId: params } });
      if (!before) throw Errors.notFound('Member not found');
      await ensureAnotherAdmin(tx, params.communityId, params.userId);
      const updated = await tx.communityMembership.update({
        where: { userId_communityId: params }, data: { status: 'INACTIVE' },
      });
      await writeAuditLog(app, req, {
        entityType: 'community_membership', entityId: updated.id, communityId: params.communityId,
        action: 'DELETE', before, after: updated,
      }, { store: tx, metaId, required: true });
      return { before, updated };
    });
    return ok({ message: 'Member removed' }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });
}
