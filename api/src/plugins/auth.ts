import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { verifyAccessToken } from '../services/token.js';
import { Errors } from '../shared/errors.js';

export type CurrentUser = {
  id: string;
  email: string;
  fullName?: string | null;
  createdAt?: Date;
  isSuperAdmin: boolean;
  isActive: boolean;
  mustChangePassword: boolean;
};

declare module 'fastify' {
  interface FastifyRequest { currentUser?: CurrentUser }
  interface FastifyInstance { requireAuth: (req: import('fastify').FastifyRequest) => Promise<CurrentUser> }
}

export const authPlugin: FastifyPluginAsync = fp(async (app) => {
  app.decorate('requireAuth', async (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw Errors.unauthorized();

    let userId: string;
    try {
      const payload = await verifyAccessToken(
        authHeader.slice('Bearer '.length), app.env.JWT_SECRET,
        app.env.JWT_ISSUER, app.env.JWT_AUDIENCE,
      );
      userId = payload.sub;
    } catch {
      throw Errors.unauthorized('Invalid or expired token');
    }

    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw Errors.unauthorized('User not found');
    if (!user.isActive) throw Errors.forbidden('Account disabled');
    if (user.mustChangePassword) throw Errors.forbidden('Password change required');

    const current: CurrentUser = {
      id: user.id, email: user.email, fullName: user.fullName, createdAt: user.createdAt,
      isSuperAdmin: user.isSuperAdmin,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    };
    req.currentUser = current;
    return current;
  });
});
