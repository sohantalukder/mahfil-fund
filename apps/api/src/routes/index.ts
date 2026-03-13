import type { FastifyInstance } from 'fastify';
import { ok } from '../shared/http.js';
import { registerAuthRoutes } from './auth.js';
import { registerEventRoutes } from './events.js';
import { registerDonorRoutes } from './donors.js';
import { registerDonationRoutes } from './donations.js';
import { registerExpenseRoutes } from './expenses.js';
import { registerSyncRoutes } from './sync.js';
import { registerAuditLogRoutes } from './auditLogs.js';
import { registerReportRoutes } from './reports.js';
import { registerUserRoutes } from './users.js';

export function registerRoutes(app: FastifyInstance) {
  app.get('/health', async (req) => {
    return ok(
      {
        status: 'ok',
        requestId: req.requestId
      },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });

  app.get('/me', { preHandler: async (req) => app.requireAuth(req) }, async (req) => {
    return ok(
      {
        user: req.currentUser
      },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });

  registerAuthRoutes(app);
  registerEventRoutes(app);
  registerDonorRoutes(app);
  registerDonationRoutes(app);
  registerExpenseRoutes(app);
  registerSyncRoutes(app);
  registerAuditLogRoutes(app);
  registerReportRoutes(app);
  registerUserRoutes(app);
}

