import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { Errors } from '../shared/errors.js';
import { writeAuditLog } from '../shared/audit.js';
import { generateReport, type ReportFormat, type ReportType } from '../services/reportExport.js';

export async function registerReportRoutes(app: FastifyInstance) {
  // Event summary report (community-scoped)
  app.get(
    '/reports/event-summary',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      const query = parseWith(z.object({ eventId: z.string().uuid() }), req.query);
      const communityId = req.communityId!;

      const [event, donationsAgg, expensesAgg, donorsCount, donationsCount, donationsByMethodAgg, expensesByCategoryAgg] =
        await Promise.all([
          app.prisma.event.findFirst({
            where: { id: query.eventId, communityId, status: 'ACTIVE' },
            select: { id: true, name: true }
          }),
          app.prisma.donation.aggregate({
            where: { eventId: query.eventId, communityId, status: 'ACTIVE' },
            _sum: { amount: true }, _count: { id: true }
          }),
          app.prisma.expense.aggregate({
            where: { eventId: query.eventId, communityId, status: 'ACTIVE' },
            _sum: { amount: true }, _count: { id: true }
          }),
          app.prisma.donor.count({ where: { communityId, status: 'ACTIVE' } }),
          app.prisma.donation.count({ where: { eventId: query.eventId, communityId, status: 'ACTIVE' } }),
          app.prisma.donation.groupBy({
            by: ['paymentMethod'],
            where: { eventId: query.eventId, communityId, status: 'ACTIVE' },
            _sum: { amount: true }
          }),
          app.prisma.expense.groupBy({
            by: ['category'],
            where: { eventId: query.eventId, communityId, status: 'ACTIVE' },
            _sum: { amount: true }
          })
        ]);

      if (!event) throw Errors.notFound('Event not found in this community');

      const totalCollection = donationsAgg._sum.amount ?? 0;
      const totalExpenses = expensesAgg._sum.amount ?? 0;

      return ok(
        {
          eventId: query.eventId,
          eventName: event.name,
          totalCollection,
          totalExpenses,
          balance: totalCollection - totalExpenses,
          totalDonors: donorsCount,
          totalDonations: donationsCount,
          totalExpensesCount: expensesAgg._count.id,
          donationsByMethod: Object.fromEntries(donationsByMethodAgg.map((r) => [r.paymentMethod, r._sum.amount ?? 0])),
          expensesByCategory: Object.fromEntries(expensesByCategoryAgg.map((r) => [r.category, r._sum.amount ?? 0]))
        },
        { serverTime: new Date().toISOString(), requestId: req.requestId }
      );
    }
  );

  // Top donors report
  app.get(
    '/reports/top-donors',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      const query = parseWith(
        z.object({
          eventId: z.string().uuid().optional(),
          limit: z.coerce.number().int().min(1).max(100).default(10)
        }),
        req.query
      );

      const communityId = req.communityId!;

      const grouped = await app.prisma.donation.groupBy({
        by: ['donorId', 'donorSnapshotName', 'donorSnapshotPhone'],
        where: { communityId, status: 'ACTIVE', ...(query.eventId ? { eventId: query.eventId } : {}) },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: query.limit
      });

      return ok(
        { topDonors: grouped.map((g) => ({ donorId: g.donorId, name: g.donorSnapshotName, phone: g.donorSnapshotPhone, totalAmount: g._sum.amount ?? 0, donationCount: g._count.id })) },
        { serverTime: new Date().toISOString(), requestId: req.requestId }
      );
    }
  );

  // Export report (PDF / XLSX / CSV)
  app.post(
    '/reports/export',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req, reply) => {
      const body = parseWith(
        z.object({
          type: z.enum(['donation_summary', 'expense_summary', 'donor_totals', 'event_summary', 'balance_summary', 'payment_method_summary']),
          format: z.enum(['pdf', 'xlsx', 'csv']),
          filters: z.object({
            eventId: z.string().uuid().optional(),
            dateFrom: z.coerce.date().optional(),
            dateTo: z.coerce.date().optional(),
            donorId: z.string().uuid().optional(),
            paymentMethod: z.enum(['CASH', 'BKASH', 'NAGAD', 'BANK']).optional()
          }).optional()
        }),
        req.body
      );

      const communityId = req.communityId!;
      const community = await app.prisma.community.findUnique({
        where: { id: communityId },
        select: { name: true }
      });

      const { buffer, contentType, filename } = await generateReport(
        app.prisma,
        body.type as ReportType,
        body.format as ReportFormat,
        { communityId, ...(body.filters ?? {}) },
        community?.name ?? 'Community'
      );

      await writeAuditLog(app, req, {
        entityType: 'report',
        entityId: communityId,
        communityId,
        action: 'UPDATE',
        after: { action: 'EXPORTED', type: body.type, format: body.format, filters: body.filters }
      });

      reply
        .header('Content-Type', contentType)
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .header('Content-Length', buffer.length);

      return reply.send(buffer);
    }
  );

  // Platform-wide stats (super admin only)
  app.get(
    '/reports/platform-summary',
    { preHandler: async (req) => {
      const user = await app.requireAuth(req);
      if (!user.roles.includes('super_admin')) throw new Error('Forbidden');
    }},
    async (req) => {
      const [
        totalCommunities, activeCommunities, totalUsers, totalEvents,
        donationsAgg, totalDonors, invitationsStats
      ] = await Promise.all([
        app.prisma.community.count(),
        app.prisma.community.count({ where: { status: 'ACTIVE' } }),
        app.prisma.user.count({ where: { isActive: true } }),
        app.prisma.event.count({ where: { status: 'ACTIVE' } }),
        app.prisma.donation.aggregate({ where: { status: 'ACTIVE' }, _sum: { amount: true }, _count: { id: true } }),
        app.prisma.donor.count({ where: { status: 'ACTIVE' } }),
        app.prisma.communityInvitation.groupBy({
          by: ['status'],
          _count: { id: true }
        })
      ]);

      return ok(
        {
          totalCommunities,
          activeCommunities,
          totalUsers,
          totalEvents,
          totalDonors,
          totalCollections: donationsAgg._sum.amount ?? 0,
          totalDonations: donationsAgg._count.id,
          invitations: Object.fromEntries(invitationsStats.map((s) => [s.status, s._count.id]))
        },
        { serverTime: new Date().toISOString(), requestId: req.requestId }
      );
    }
  );
}
