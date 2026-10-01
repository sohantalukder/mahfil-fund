import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ExpenseCreateSchema } from '../../shared/schemas.js';
import { ok } from '../../shared/http.js';
import { parseWith } from '../../shared/validate.js';
import { writeAuditLog } from '../../shared/audit.js';
import { Errors } from '../../shared/errors.js';
import { fileURLToPath } from 'node:url';
import { generateExpensesReportPdf, type ExpensesReportPdfData } from '../../integrations/pdf.js';
import { createExpense, deleteExpense, updateExpense } from './service.js';
import { buildPagination } from '../../core/pagination.js';

const ExpenseUpdateSchema = ExpenseCreateSchema.partial().extend({
  clientGeneratedId: z.string().uuid().optional()
});

export async function registerExpenseRoutes(app: FastifyInstance) {
  app.get('/expenses', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    const query = parseWith(
      z.object({
        eventId: z.string().uuid().optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        search: z.string().min(1).max(80).optional(),
        category: z.string().min(1).max(80).optional(),
        paymentMethod: z.enum(['CASH', 'BKASH', 'NAGAD', 'BANK']).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(25)
      }),
      req.query
    );

    const communityId = req.communityId!;
    const where = {
      communityId,
      status: 'ACTIVE' as const,
      eventId: query.eventId,
      category: query.category,
      paymentMethod: query.paymentMethod,
      expenseDate: query.from || query.to ? { gte: query.from, lte: query.to } : undefined,
      OR: query.search ? [
        { title: { contains: query.search, mode: 'insensitive' as const } },
        { category: { contains: query.search, mode: 'insensitive' as const } },
        { vendor: { contains: query.search, mode: 'insensitive' as const } }
      ] : undefined
    };

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const [expenses, total] = await Promise.all([
      app.prisma.expense.findMany({
        where,
        orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      app.prisma.expense.count({ where })
    ]);

    const { totalPages } = buildPagination(page, pageSize, total);
    return ok(
      { expenses, page, pageSize, total, totalPages },
      { serverTime: new Date().toISOString(), requestId: req.requestId, pagination: { page: page as number, pageSize: pageSize as number, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } }
    );
  });

  // Download expenses report PDF (full list for current filters; ignores pagination)
  app.get(
    '/expenses/report/download',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req, reply) => {
      const query = parseWith(
        z.object({
          eventId: z.string().uuid(),
          search: z.string().min(1).max(80).optional(),
        }),
        req.query
      );

      const communityId = req.communityId!;
      const event = await app.prisma.event.findFirst({ where: { id: query.eventId, communityId }, select: { id: true } });
      if (!event) throw Errors.unprocessable('eventId does not belong to this community');
      const [community, expenses] = await Promise.all([
        app.prisma.community.findUnique({
          where: { id: communityId },
          select: { name: true, location: true },
        }),
        app.prisma.expense.findMany({
          where: {
            communityId,
            status: 'ACTIVE' as const,
            eventId: query.eventId,
            OR: query.search
              ? [
                  { title: { contains: query.search, mode: 'insensitive' as const } },
                  { category: { contains: query.search, mode: 'insensitive' as const } },
                  { vendor: { contains: query.search, mode: 'insensitive' as const } },
                ]
              : undefined,
          },
          orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
          take: 10_001,
        }),
      ]);

      if (!community) throw Errors.notFound('Community not found');
      if (expenses.length > 10_000) throw Errors.unprocessable('Report exceeds the 10,000 row limit');

      const logoPath = fileURLToPath(new URL('../../assets/images/logo_black.png', import.meta.url));
      const pdfData: ExpensesReportPdfData = {
        title: 'Expenses report',
        communityName: community.name,
        communityLocation: community.location ?? undefined,
        logoPath,
        generatedAt: new Date(),
        filters: { eventId: query.eventId, search: query.search },
        rows: expenses.map((e) => ({
          title: e.title,
          category: e.category,
          vendor: e.vendor ?? undefined,
          amount: e.amount,
          paymentMethod: e.paymentMethod,
          expenseDate: e.expenseDate,
        })),
      };

      const pdfBuffer = await generateExpensesReportPdf(pdfData);
      if (pdfBuffer.length > 20 * 1024 * 1024) throw Errors.unprocessable('Report exceeds the 20 MB limit');
      const fileName = `expenses-report-${new Date().toISOString().slice(0, 10)}.pdf`;

      await writeAuditLog(app, req, {
        entityType: 'report',
        entityId: communityId,
        communityId,
        action: 'UPDATE',
        after: { action: 'EXPENSES_REPORT_DOWNLOADED', filters: pdfData.filters, count: pdfData.rows.length },
      });

      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${fileName}"`)
        .header('Content-Length', pdfBuffer.length);

      return reply.send(pdfBuffer);
    }
  );

  app.post('/expenses', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    if (req.memberRole === 'VIEWER') throw Errors.forbidden('Viewers cannot add expenses');
    const body = parseWith(ExpenseCreateSchema, req.body);
    const communityId = req.communityId!;
    return app.runIdempotentMutation(req, async (store) => {
      const { entity: expense } = await createExpense(
        { app, req, communityId, actorUserId: req.currentUser!.id, store },
        body,
      );
      return ok({ expense }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    });
  });

  app.patch('/expenses/:id', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    if (req.memberRole === 'VIEWER') throw Errors.forbidden('Viewers cannot update expenses');
    const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
    const body = parseWith(ExpenseUpdateSchema, req.body);
    const communityId = req.communityId!;

    const updated = await updateExpense(
      { app, req, communityId, actorUserId: req.currentUser!.id },
      { id: params.id, ...body },
    );
    return ok({ expense: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.delete('/expenses/:id', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    if (req.memberRole !== 'ADMIN') {
      throw Errors.forbidden('Only admins can delete expenses');
    }
    const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
    const communityId = req.communityId!;

    const updated = await deleteExpense(
      { app, req, communityId, actorUserId: req.currentUser!.id },
      { id: params.id },
    );
    return ok({ expense: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });
}
