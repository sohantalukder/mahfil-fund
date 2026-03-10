import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { decodeJwt } from 'jose';
import { Errors } from '../shared/errors.js';
import type { UserRoleName } from '@prisma/client';

type AuthContext = {
  authUserId: string;
  email?: string;
  phone?: string;
};

type CurrentUser = {
  id: string;
  authUserId: string;
  roles: UserRoleName[];
  isActive: boolean;
};

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
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
    let payload: Record<string, unknown>;
    try {
      // DEV MODE: decode Supabase JWT without signature verification to avoid local crypto/JWK issues.
      payload = decodeJwt(token) as Record<string, unknown>;
    } catch {
      throw Errors.unauthorized('Invalid token');
    }

    const authUserId = String(payload.sub ?? '');
    if (!authUserId) throw Errors.unauthorized('Invalid token subject');

    const email = typeof payload.email === 'string' ? payload.email : undefined;
    const phone = typeof payload.phone === 'string' ? payload.phone : undefined;

    req.auth = { authUserId, email, phone };

    // Ensure app-level user exists (profile + roles)
    const user = await app.prisma.user.upsert({
      where: { authUserId },
      create: { authUserId, email, phone },
      update: { email, phone }
    });

    const userRoles = await app.prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true }
    });

    const roles: UserRoleName[] = userRoles.map((ur) => ur.role.name);

    const current: CurrentUser = {
      id: user.id,
      authUserId: user.authUserId,
      roles,
      isActive: user.isActive
    };

    if (!current.isActive) throw Errors.forbidden('Account disabled');

    req.currentUser = current;
    return current;
  });
});

