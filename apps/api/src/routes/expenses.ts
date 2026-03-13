import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ExpenseCreateSchema } from '@mahfil/schemas';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { writeAuditLog } from '../shared/audit.js';
import { Errors } from '../shared/errors.js';

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
      paymentMethod: query.paymentMethod as never,
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

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return ok(
      { expenses, page, pageSize, total, totalPages },
      { serverTime: new Date().toISOString(), requestId: req.requestId, pagination: { page: page as number, pageSize: pageSize as number, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } }
    );
  });

  app.post('/expenses', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    if (req.memberRole === 'viewer') throw Errors.forbidden('Viewers cannot add expenses');
    const body = parseWith(ExpenseCreateSchema, req.body);
    const metaId = await req.getOrCreateRequestMetaId();
    const communityId = req.communityId!;

    if (body.clientGeneratedId) {
      const existing = await app.prisma.expense.findFirst({ where: { clientGeneratedId: body.clientGeneratedId, communityId } });
      if (existing) return ok({ expense: existing }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }

    const event = await app.prisma.event.findFirst({ where: { id: body.eventId, communityId, status: 'ACTIVE' } });
    if (!event) throw Errors.badRequest('Invalid event');

    const expense = await app.prisma.expense.create({
      data: {
        clientGeneratedId: body.clientGeneratedId ?? undefined,
        communityId,
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

    await writeAuditLog(app, req, { entityType: 'expense', entityId: expense.id, communityId, action: 'CREATE', after: expense });
    return ok({ expense }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.patch('/expenses/:id', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    if (req.memberRole === 'viewer') throw Errors.forbidden('Viewers cannot update expenses');
    const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
    const body = parseWith(ExpenseUpdateSchema, req.body);
    const communityId = req.communityId!;

    const before = await app.prisma.expense.findFirst({ where: { id: params.id, communityId } });
    if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Expense not found');

    const updated = await app.prisma.expense.update({
      where: { id: params.id },
      data: { ...body, updatedByUserId: req.currentUser!.id }
    });

    await writeAuditLog(app, req, { entityType: 'expense', entityId: updated.id, communityId, action: 'UPDATE', before, after: updated });
    return ok({ expense: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.delete('/expenses/:id', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    if (req.memberRole !== 'super_admin' && req.memberRole !== 'admin') {
      throw Errors.forbidden('Only admins can delete expenses');
    }
    const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
    const communityId = req.communityId!;

    const before = await app.prisma.expense.findFirst({ where: { id: params.id, communityId } });
    if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Expense not found');

    const updated = await app.prisma.expense.update({
      where: { id: params.id },
      data: { status: 'DELETED', deletedAt: new Date(), updatedByUserId: req.currentUser!.id }
    });

    await writeAuditLog(app, req, { entityType: 'expense', entityId: updated.id, communityId, action: 'DELETE', before, after: updated });
    return ok({ expense: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });
}
