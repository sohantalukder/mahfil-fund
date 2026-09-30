import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { UserRoleName } from '@prisma/client';
import { Errors } from '../shared/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    communityId?: string;
    memberRole?: UserRoleName;
  }

  interface FastifyInstance {
    requireCommunity: (req: FastifyRequest) => Promise<{ communityId: string; memberRole: UserRoleName }>;
  }
}

export const tenantGuardPlugin: FastifyPluginAsync = fp(async (app) => {
  app.decorate('requireCommunity', async (req: FastifyRequest) => {
    // Auth must run first
    const user = await app.requireAuth(req);

    const q = req.query as Record<string, string | string[] | undefined> | undefined;
    const queryCommunity =
      typeof q?.communityId === 'string'
        ? q.communityId
        : Array.isArray(q?.communityId)
          ? q.communityId[0]
          : undefined;

    const communityId =
      (req.headers['x-community-id'] as string | undefined)?.trim() ||
      (req.params as Record<string, string>)?.communityId ||
      queryCommunity?.trim();

    if (!communityId) {
      throw Errors.badRequest(
        'Missing community context. Send header X-Community-Id or query ?communityId=…',
      );
    }

    // super_admin can access any community without a membership check
    if (user.roles.includes('super_admin')) {
      const community = await app.prisma.community.findUnique({
        where: { id: communityId }
      });
      if (!community || community.status === 'ARCHIVED') {
        throw Errors.notFound('Community not found');
      }
      req.communityId = communityId;
      req.memberRole = 'super_admin';
      return { communityId, memberRole: 'super_admin' as UserRoleName };
    }

    // For other roles, check active membership
    const membership = await app.prisma.communityMembership.findUnique({
      where: { userId_communityId: { userId: user.id, communityId } },
      include: { community: { select: { status: true } } }
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw Errors.forbidden('You are not an active member of this community.');
    }

    if (membership.community.status === 'ARCHIVED') {
      throw Errors.forbidden('This community is archived.');
    }

    req.communityId = communityId;
    req.memberRole = membership.role;

    return { communityId, memberRole: membership.role };
  });
});
