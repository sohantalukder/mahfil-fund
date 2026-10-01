import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { CommunityRole } from '@prisma/client';
import { Errors } from '../shared/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    communityId?: string;
    memberRole?: CommunityRole;
  }
  interface FastifyInstance {
    requireCommunity: (req: FastifyRequest, roles?: CommunityRole[]) => Promise<{ communityId: string; memberRole?: CommunityRole }>;
  }
}

export const tenantGuardPlugin: FastifyPluginAsync = fp(async (app) => {
  app.decorate('requireCommunity', async (req: FastifyRequest, roles?: CommunityRole[]) => {
    const user = await app.requireAuth(req);
    const params = req.params as Record<string, string | undefined> | undefined;
    const communityId = params?.communityId?.trim();
    if (!communityId) throw Errors.badRequest('Missing communityId route parameter');

    const community = await app.prisma.community.findUnique({
      where: { id: communityId }, select: { status: true },
    });
    if (!community || community.status === 'ARCHIVED') throw Errors.notFound('Community not found');
    if (community.status === 'SUSPENDED') throw Errors.forbidden('Community is suspended');

    const membership = await app.prisma.communityMembership.findUnique({
      where: { userId_communityId: { userId: user.id, communityId } },
    });
    if (!membership || membership.status !== 'ACTIVE') {
      throw Errors.forbidden('You are not an active member of this community');
    }
    if (roles && !roles.includes(membership.role)) {
      throw Errors.forbidden('Your community role does not permit this action');
    }

    req.communityId = communityId;
    req.memberRole = membership.role;
    return { communityId, memberRole: membership.role };
  });
});
