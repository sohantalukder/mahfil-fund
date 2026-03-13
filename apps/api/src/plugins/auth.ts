import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { verifyAccessToken } from '../services/token.js';
import { Errors } from '../shared/errors.js';
import type { UserRoleName } from '@prisma/client';

type CurrentUser = {
  id: string;
  email: string;
  roles: UserRoleName[];
  isActive: boolean;
  emailVerified: boolean;
};

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: CurrentUser;
  }

  interface FastifyInstance {
    requireAuth: (req: FastifyRequest) => Promise<CurrentUser>;
  }
}

export const authPlugin: FastifyPluginAsync = fp(async (app) => {
  app.decorate('requireAuth', async (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw Errors.unauthorized();

    const token = authHeader.slice('Bearer '.length);

    let sub: string;
    try {
      const payload = await verifyAccessToken(token, app.env.JWT_SECRET);
      sub = payload.sub;
    } catch {
      throw Errors.unauthorized('Invalid or expired token');
    }

    const user = await app.prisma.user.findUnique({
      where: { id: sub },
    });

    if (!user) throw Errors.unauthorized('User not found');
    if (!user.isActive) throw Errors.forbidden('Account disabled');

    const userRoles = await app.prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });

    const roles: UserRoleName[] = userRoles.map((ur) => ur.role.name);

    const current: CurrentUser = {
      id: user.id,
      email: user.email,
      roles,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
    };

    req.currentUser = current;
    return current;
  });
});
