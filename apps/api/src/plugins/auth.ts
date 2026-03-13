import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { verifyAccessToken, verifySupabaseToken } from '../services/token.js';
import { Errors } from '../shared/errors.js';
import type { UserRoleName } from '@prisma/client';

type CurrentUser = {
  id: string;
  email: string;
  fullName?: string | null;
  createdAt?: Date;
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

    // Track which lookup key to use and whether we need to auto-provision.
    let userId: string | null = null;
    let supabaseClaims: { email?: string; fullName?: string } | null = null;

    // 1. Try the custom HS256 token first (fast path, no network call).
    try {
      const payload = await verifyAccessToken(token, app.env.JWT_SECRET);
      userId = payload.sub;
    } catch {
      // 2. Fall back to Supabase ES256/RS256 via JWKS if SUPABASE_URL is set.
      if (!app.env.SUPABASE_URL) throw Errors.unauthorized('Invalid or expired token');

      try {
        const sbPayload = await verifySupabaseToken(token, app.env.SUPABASE_URL);
        userId = sbPayload.sub;
        supabaseClaims = { email: sbPayload.email, fullName: sbPayload.fullName };
      } catch {
        throw Errors.unauthorized('Invalid or expired token');
      }
    }

    // 3. Load user from DB.
    let user = await app.prisma.user.findUnique({ where: { id: userId } });

    // 4. Auto-provision Supabase user on their first API call.
    if (!user && supabaseClaims?.email) {
      const email = supabaseClaims.email;

      // Check if a user already exists with this email (e.g. custom-auth registration).
      const byEmail = await app.prisma.user.findUnique({ where: { email } });

      if (byEmail) {
        // Reuse the existing account — Supabase sub becomes their effective identity.
        user = byEmail;
      } else {
        // Create a new user record using the Supabase UUID as the primary key.
        user = await app.prisma.user.create({
          data: {
            id: userId,
            email,
            passwordHash: '',
            fullName: supabaseClaims.fullName ?? null,
            emailVerified: true,
            isActive: true
          }
        });

        // Assign default viewer role.
        const viewerRole = await app.prisma.role.findFirst({
          where: { name: 'viewer' }
        });
        if (viewerRole) {
          await app.prisma.userRole.create({
            data: { userId: user.id, roleId: viewerRole.id }
          }).catch(() => undefined); // ignore duplicate if race condition
        }
      }
    }

    if (!user) throw Errors.unauthorized('User not found');
    if (!user.isActive) throw Errors.forbidden('Account disabled');

    const userRoles = await app.prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true }
    });

    const roles: UserRoleName[] = userRoles.map((ur) => ur.role.name);

    const current: CurrentUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      createdAt: user.createdAt,
      roles,
      isActive: user.isActive,
      emailVerified: user.emailVerified
    };

    req.currentUser = current;
    return current;
  });
});
