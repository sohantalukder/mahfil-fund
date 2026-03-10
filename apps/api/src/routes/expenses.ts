import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ExpenseCreateSchema } from '@mahfil/schemas';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { requireRoles } from '../plugins/rbac.js';
import { writeAuditLog } from '../shared/audit.js';
import { Errors } from '../shared/errors.js';

const ExpenseUpdateSchema = ExpenseCreateSchema.partial().extend({
  clientGeneratedId: z.string().uuid().optional()
});

export async function registerExpenseRoutes(app: FastifyInstance) {
  app.get('/expenses', { preHandler: async (req) => app.requireAuth(req) }, async (req) => {
    const query = parseWith(
      z.object({
        eventId: z.string().uuid(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        category: z.string().min(1).max(80).optional(),
        paymentMethod: z.enum(['CASH', 'BKASH', 'NAGAD', 'BANK']).optional()
      }),
      req.query
    );

    const expenses = await app.prisma.expense.findMany({
      where: {
        status: 'ACTIVE',
        eventId: query.eventId,
        category: query.category,
        paymentMethod: query.paymentMethod,
        expenseDate: {
          gte: query.from,
          lte: query.to
        }
      },
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
      take: 200
    });

    return ok({ expenses }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.post(
    '/expenses',
    { preHandler: [requireRoles(app, ['super_admin', 'admin', 'collector'])] },
    async (req) => {
      const body = parseWith(ExpenseCreateSchema, req.body);
      const metaId = await req.getOrCreateRequestMetaId();

      if (body.clientGeneratedId) {
        const existing = await app.prisma.expense.findUnique({ where: { clientGeneratedId: body.clientGeneratedId } });
        if (existing) {
          return ok({ expense: existing }, { serverTime: new Date().toISOString(), requestId: req.requestId });
        }
      }

      // Ensure event exists
      const event = await app.prisma.event.findFirst({ where: { id: body.eventId, status: 'ACTIVE' } });
      if (!event) throw Errors.badRequest('Invalid event');

      const expense = await app.prisma.expense.create({
        data: {
          clientGeneratedId: body.clientGeneratedId ?? undefined,
          eventId: body.eventId,
          title: body.title,
          category: body.category,
          amount: body.amount,
          expenseDate: body.expenseDate,
          vendor: body.vendor ?? undefined,
          paymentMethod: body.paymentMethod,
          note: body.note ?? undefined,
          createdByUserId: req.currentUser!.id,
          updatedByUserId: req.currentUser!.id,
          createdMetaId: metaId
        }
      });

      await writeAuditLog(app, req, { entityType: 'expense', entityId: expense.id, action: 'CREATE', after: expense });
      return ok({ expense }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  app.patch(
    '/expenses/:id',
    { preHandler: [requireRoles(app, ['super_admin', 'admin', 'collector'])] },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
      const body = parseWith(ExpenseUpdateSchema, req.body);

      const before = await app.prisma.expense.findUnique({ where: { id: params.id } });
      if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Expense not found');

      const updated = await app.prisma.expense.update({
        where: { id: params.id },
        data: {
          ...body,
          updatedByUserId: req.currentUser!.id
        }
      });

      await writeAuditLog(app, req, {
        entityType: 'expense',
        entityId: updated.id,
        action: 'UPDATE',
        before,
        after: updated
      });

      return ok({ expense: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  app.delete(
    '/expenses/:id',
    { preHandler: [requireRoles(app, ['super_admin', 'admin'])] },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
      const before = await app.prisma.expense.findUnique({ where: { id: params.id } });
      if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Expense not found');

      const updated = await app.prisma.expense.update({
        where: { id: params.id },
        data: { status: 'DELETED', deletedAt: new Date(), updatedByUserId: req.currentUser!.id }
      });

      await writeAuditLog(app, req, {
        entityType: 'expense',
        entityId: updated.id,
        action: 'DELETE',
        before,
        after: updated
      });

      return ok({ expense: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );
}

