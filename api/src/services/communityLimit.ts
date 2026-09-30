import type { FastifyInstance } from 'fastify';
import { Errors } from '../shared/errors.js';
import { writeAuditLog } from '../shared/audit.js';
import type { FastifyRequest } from 'fastify';

export async function checkAdminCommunityLimit(
  app: FastifyInstance,
  req: FastifyRequest,
  userId: string
): Promise<void> {
  const isSuperAdmin = req.currentUser?.roles.includes('super_admin');
  if (isSuperAdmin) return; // super_admin has no limit

  const limit = app.env.ADMIN_COMMUNITY_LIMIT;
  const count = await app.prisma.community.count({
    where: { createdByUserId: userId, status: { not: 'ARCHIVED' } }
  });

  if (count >= limit) {
    // Log the limit-exceeded event
    await writeAuditLog(app, req, {
      entityType: 'community',
      entityId: userId,
      action: 'CREATE',
      after: {
        reason: 'LIMIT_EXCEEDED',
        currentCount: count,
        limit,
        userId
      }
    }).catch(() => {});

    throw Errors.forbidden(
      `Community creation limit reached. You can create a maximum of ${limit} communities.`
    );
  }
}

export async function getCommunityCreationStats(
  app: FastifyInstance,
  userId: string,
  isSuperAdmin: boolean
): Promise<{ created: number; limit: number | null; remaining: number | null }> {
  if (isSuperAdmin) {
    const created = await app.prisma.community.count({
      where: { createdByUserId: userId, status: { not: 'ARCHIVED' } }
    });
    return { created, limit: null, remaining: null };
  }

  const limit = app.env.ADMIN_COMMUNITY_LIMIT;
  const created = await app.prisma.community.count({
    where: { createdByUserId: userId, status: { not: 'ARCHIVED' } }
  });

  return { created, limit, remaining: Math.max(0, limit - created) };
}
