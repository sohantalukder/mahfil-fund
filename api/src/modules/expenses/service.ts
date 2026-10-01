import { Prisma } from '@prisma/client';
import type { ExpenseCreateInput } from '../../shared/schemas.js';
import { Errors } from '../../shared/errors.js';
import { writeAuditLog } from '../../shared/audit.js';
import { type EntityRef, type MutationContext, type TransactionMutationContext, requireEvent, withMutation } from '../shared/mutationContext.js';

export type ExpenseUpdateInput = Partial<ExpenseCreateInput> & EntityRef;

async function findExpense(ctx: TransactionMutationContext, ref: EntityRef) {
  if (ref.id) return ctx.store.expense.findFirst({ where: { id: ref.id, communityId: ctx.communityId } });
  if (!ref.clientGeneratedId) return null;
  return ctx.store.expense.findUnique({
    where: { communityId_clientGeneratedId: { communityId: ctx.communityId, clientGeneratedId: ref.clientGeneratedId } },
  });
}

export async function createExpense(ctx: MutationContext, input: ExpenseCreateInput) {
  return withMutation(ctx, async (tx) => {
    const existing = input.clientGeneratedId ? await findExpense(tx, input) : null;
    if (existing) return { entity: existing, created: false };
    await requireEvent(tx, input.eventId);
    try {
      const entity = await tx.store.expense.create({ data: {
        ...input, communityId: tx.communityId,
        createdByUserId: tx.actorUserId, updatedByUserId: tx.actorUserId, createdMetaId: tx.metaId,
      } });
      await writeAuditLog(tx.app, tx.req, {
        entityType: 'expense', entityId: entity.id, communityId: tx.communityId, action: 'CREATE', after: entity,
      }, { store: tx.store, metaId: tx.metaId, required: true });
      return { entity, created: true };
    } catch (error) {
      if (input.clientGeneratedId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const replay = await findExpense(tx, input);
        if (replay) return { entity: replay, created: false };
      }
      throw error;
    }
  });
}

export async function updateExpense(ctx: MutationContext, input: ExpenseUpdateInput) {
  return withMutation(ctx, async (tx) => {
    const before = await findExpense(tx, input);
    if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Expense not found');
    if (input.eventId) await requireEvent(tx, input.eventId);
    const { id: _id, clientGeneratedId: _clientGeneratedId, ...data } = input;
    const entity = await tx.store.expense.update({ where: { id: before.id }, data: { ...data, updatedByUserId: tx.actorUserId } });
    await writeAuditLog(tx.app, tx.req, {
      entityType: 'expense', entityId: entity.id, communityId: tx.communityId, action: 'UPDATE', before, after: entity,
    }, { store: tx.store, metaId: tx.metaId, required: true });
    return entity;
  });
}

export async function deleteExpense(ctx: MutationContext, ref: EntityRef) {
  return withMutation(ctx, async (tx) => {
    const before = await findExpense(tx, ref);
    if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Expense not found');
    const entity = await tx.store.expense.update({ where: { id: before.id }, data: {
      status: 'DELETED', deletedAt: new Date(), updatedByUserId: tx.actorUserId,
    } });
    await writeAuditLog(tx.app, tx.req, {
      entityType: 'expense', entityId: entity.id, communityId: tx.communityId, action: 'DELETE', before, after: entity,
    }, { store: tx.store, metaId: tx.metaId, required: true });
    return entity;
  });
}
