import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';

export async function registerReportRoutes(app: FastifyInstance) {
  app.get('/reports/event-summary', { preHandler: async (req) => app.requireAuth(req) }, async (req) => {
    const query = parseWith(z.object({ eventId: z.string().uuid() }), req.query);

    const [event, donationsAgg, expensesAgg, donorsCount, donationsCount, donationsByMethodAgg, expensesByCategoryAgg] =
      await Promise.all([
        app.prisma.event.findFirst({
          where: { id: query.eventId, status: 'ACTIVE' },
          select: { id: true, name: true }
        }),
      app.prisma.donation.aggregate({
        where: { eventId: query.eventId, status: 'ACTIVE' },
        _sum: { amount: true },
        _count: { id: true }
      }),
      app.prisma.expense.aggregate({
        where: { eventId: query.eventId, status: 'ACTIVE' },
        _sum: { amount: true },
        _count: { id: true }
      }),
      app.prisma.donor.count({ where: { status: 'ACTIVE' } }),
      app.prisma.donation.count({ where: { eventId: query.eventId, status: 'ACTIVE' } }),
      app.prisma.donation.groupBy({
        by: ['paymentMethod'],
        where: { eventId: query.eventId, status: 'ACTIVE' },
        _sum: { amount: true }
      }),
      app.prisma.expense.groupBy({
        by: ['category'],
        where: { eventId: query.eventId, status: 'ACTIVE' },
        _sum: { amount: true }
      })
      ]);

    const totalCollection = donationsAgg._sum.amount ?? 0;
    const totalExpenses = expensesAgg._sum.amount ?? 0;
    const donationsByMethod = Object.fromEntries(
      donationsByMethodAgg.map((row) => [row.paymentMethod, row._sum.amount ?? 0])
    );
    const expensesByCategory = Object.fromEntries(
      expensesByCategoryAgg.map((row) => [row.category, row._sum.amount ?? 0])
    );

    return ok(
      {
        eventId: query.eventId,
        eventName: event?.name ?? 'Unknown Event',
        totalCollection,
        totalExpenses,
        balance: totalCollection - totalExpenses,
        totalDonors: donorsCount,
        totalDonations: donationsCount,
        totalDonationsCount: donationsCount,
        totalExpensesCount: expensesAgg._count.id,
        donationsByMethod,
        expensesByCategory
      },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });
}

