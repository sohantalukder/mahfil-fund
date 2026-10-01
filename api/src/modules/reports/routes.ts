import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok } from '../../shared/http.js';
import { parseWith } from '../../shared/validate.js';
import { Errors } from '../../shared/errors.js';
import { writeAuditLog } from '../../shared/audit.js';
import { generateReport, type ReportFormat, type ReportType } from '../../integrations/reportExport.js';

export async function registerReportRoutes(app: FastifyInstance) {
  // Event summary report (community-scoped)
  app.get(
    '/reports/event-summary',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      const query = parseWith(z.object({ eventId: z.string().uuid() }), req.query);
      const communityId = req.communityId!;
      if (query.eventId) {
        const event = await app.prisma.event.findFirst({ where: { id: query.eventId, communityId }, select: { id: true } });
        if (!event) throw Errors.unprocessable('eventId does not belong to this community');
      }

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
    {
      preHandler: async (req) => app.requireCommunity(req),
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    },
    async (req) => {
      const query = parseWith(
        z.object({
          eventId: z.string().uuid().optional(),
          limit: z.coerce.number().int().min(1).max(100).default(10)
        }),
        req.query
      );

      const communityId = req.communityId!;
      if (query.eventId) {
        const event = await app.prisma.event.findFirst({ where: { id: query.eventId, communityId }, select: { id: true } });
        if (!event) throw Errors.unprocessable('eventId does not belong to this community');
      }

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
    {
      preHandler: async (req) => app.requireCommunity(req),
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    },
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
          }).refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
            message: 'dateFrom must be before or equal to dateTo',
          }).refine((value) => !value.dateFrom || !value.dateTo || value.dateTo.getTime() - value.dateFrom.getTime() <= 366 * 24 * 60 * 60_000, {
            message: 'date range cannot exceed 366 days',
          }).optional()
        }),
        req.body
      );

      const communityId = req.communityId!;
      if (body.filters?.eventId) {
        const event = await app.prisma.event.findFirst({
          where: { id: body.filters.eventId, communityId, status: 'ACTIVE' }, select: { id: true },
        });
        if (!event) throw Errors.notFound('Event not found');
      }
      if (body.filters?.donorId) {
        const donor = await app.prisma.donor.findFirst({
          where: { id: body.filters.donorId, communityId, status: 'ACTIVE' }, select: { id: true },
        });
        if (!donor) throw Errors.notFound('Donor not found');
      }
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

}
