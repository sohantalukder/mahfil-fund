import type { FastifyInstance } from 'fastify';
import { registerAuthRoutes } from './auth/routes.js';
import { registerCommunityRoutes } from './communities/routes.js';
import { registerMembershipRoutes } from './members/routes.js';
import { registerUserRoutes } from './users/routes.js';
import { registerEventRoutes } from './events/routes.js';
import { registerDonorRoutes } from './donors/routes.js';
import { registerDonationRoutes } from './donations/routes.js';
import { registerExpenseRoutes } from './expenses/routes.js';
import { registerInvoiceRoutes } from './invoices/routes.js';
import { registerUploadRoutes } from './uploads/routes.js';
import { registerSyncRoutes } from './sync/routes.js';
import { registerAuditLogRoutes } from './audit/routes.js';
import { registerReportRoutes } from './reports/routes.js';
import { registerErrorLogRoutes } from './error-logs/routes.js';

export function registerPlatformModules(app: FastifyInstance) {
  registerAuthRoutes(app);
  registerCommunityRoutes(app);
  registerMembershipRoutes(app);
  registerUserRoutes(app);
}

export function registerTenantModules(app: FastifyInstance) {
  app.register(async (tenantApp) => {
    registerEventRoutes(tenantApp);
    registerDonorRoutes(tenantApp);
    registerDonationRoutes(tenantApp);
    registerExpenseRoutes(tenantApp);
    registerInvoiceRoutes(tenantApp);
    registerUploadRoutes(tenantApp);
    registerSyncRoutes(tenantApp);
    registerAuditLogRoutes(tenantApp);
    registerReportRoutes(tenantApp);
    registerErrorLogRoutes(tenantApp);
  }, { prefix: '/communities/:communityId' });
}
