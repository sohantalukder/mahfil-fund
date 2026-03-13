import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { registerAuthRoutes } from './auth.js';
import { registerEventRoutes } from './events.js';
import { registerDonorRoutes } from './donors.js';
import { registerDonationRoutes } from './donations.js';
import { registerExpenseRoutes } from './expenses.js';
import { registerSyncRoutes } from './sync.js';
import { registerAuditLogRoutes } from './auditLogs.js';
import { registerReportRoutes } from './reports.js';
import { registerUserRoutes } from './users.js';
import { registerCommunityRoutes } from './communities.js';
import { registerMembershipRoutes } from './memberships.js';
import { registerInvitationRoutes } from './invitations.js';
import { registerInvoiceRoutes } from './invoices.js';
import { registerUploadRoutes } from './uploads.js';
import { registerErrorLogRoutes } from './errorLogs.js';

export function registerRoutes(app: FastifyInstance) {
  app.get('/health', async (req) => {
    return ok(
      { status: 'ok', requestId: req.requestId },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });

  app.get('/me', { preHandler: async (req) => app.requireAuth(req) }, async (req) => {
    const user = req.currentUser!;

    // Also return communities the user belongs to
    const memberships = await app.prisma.communityMembership.findMany({
      where: { userId: user.id, status: 'ACTIVE' },
      include: { community: { select: { id: true, name: true, slug: true, status: true } } }
    });

    return ok(
      {
        user: {
          ...user,
          communities: memberships.map((m) => ({
            ...m.community,
            role: m.role,
            joinedAt: m.joinedAt
          }))
        }
      },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });

  registerAuthRoutes(app);
  registerCommunityRoutes(app);
  registerMembershipRoutes(app);
  registerInvitationRoutes(app);
  registerEventRoutes(app);
  registerDonorRoutes(app);
  registerDonationRoutes(app);
  registerExpenseRoutes(app);
  registerInvoiceRoutes(app);
  registerUploadRoutes(app);
  registerSyncRoutes(app);
  registerAuditLogRoutes(app);
  registerReportRoutes(app);
  registerErrorLogRoutes(app);
  registerUserRoutes(app);
}
