import type { FastifyInstance } from 'fastify';
import { ok } from '../shared/http.js';
import { registerPlatformModules, registerTenantModules } from '../modules/index.js';
import { openApiDocument } from './openapi.js';

export function registerRoutes(app: FastifyInstance) {
  app.get('/health', async (req) => {
    return ok(
      { status: 'ok', requestId: req.requestId },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });
  app.get('/openapi.json', async () => openApiDocument);

  app.get('/me', { preHandler: async (req) => app.requireAuth(req) }, async (req) => {
    const user = req.currentUser!;

    const memberships = await app.prisma.communityMembership.findMany({
      where: { userId: user.id, status: 'ACTIVE', community: { status: 'ACTIVE' } },
      include: { community: { select: { id: true, name: true, slug: true, status: true } } }
    });

    return ok(
      {
        user: {
          ...user,
          isSuperAdmin: user.isSuperAdmin,
          memberships: memberships.map((m) => ({
            community: m.community,
            role: m.role.toLowerCase(),
            status: m.status,
            joinedAt: m.joinedAt,
          })),
        }
      },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });

  registerPlatformModules(app);
  registerTenantModules(app);
}
