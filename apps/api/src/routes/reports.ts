import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';

export async function registerReportRoutes(app: FastifyInstance) {
  app.get('/reports/event-summary', { preHandler: async (req) => app.requireAuth(req) }, async (req) => {
    const query = parseWith(z.object({ eventId: z.string().uuid() }), req.query);

    const [donationsAgg, expensesAgg, donorsCount, donationsCount] = await Promise.all([
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
      app.prisma.donation.count({ where: { eventId: query.eventId, status: 'ACTIVE' } })
    ]);

    const totalCollection = donationsAgg._sum.amount ?? 0;
    const totalExpenses = expensesAgg._sum.amount ?? 0;

    return ok(
      {
        eventId: query.eventId,
        totalCollection,
        totalExpenses,
        balance: totalCollection - totalExpenses,
        totalDonors: donorsCount,
        totalDonationsCount: donationsCount,
        totalExpensesCount: expensesAgg._count.id
      },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });
}

