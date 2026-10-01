import { Prisma } from '@prisma/client';
import type { DonorCreateInput } from '../../shared/schemas.js';
import { Errors } from '../../shared/errors.js';
import { writeAuditLog } from '../../shared/audit.js';
import { type EntityRef, type MutationContext, type TransactionMutationContext, withMutation } from '../shared/mutationContext.js';

export type DonorUpdateInput = Partial<DonorCreateInput> & EntityRef;

async function findDonor(ctx: TransactionMutationContext, ref: EntityRef) {
  if (ref.id) return ctx.store.donor.findFirst({ where: { id: ref.id, communityId: ctx.communityId } });
  if (!ref.clientGeneratedId) return null;
  return ctx.store.donor.findUnique({
    where: { communityId_clientGeneratedId: { communityId: ctx.communityId, clientGeneratedId: ref.clientGeneratedId } },
  });
}

export async function createDonor(ctx: MutationContext, input: DonorCreateInput) {
  return withMutation(ctx, async (tx) => {
    const existing = input.clientGeneratedId ? await findDonor(tx, input) : null;
    if (existing) return { entity: existing, created: false };
    try {
      const entity = await tx.store.donor.create({ data: {
        ...input, tags: input.tags ?? [], communityId: tx.communityId,
        createdByUserId: tx.actorUserId, updatedByUserId: tx.actorUserId, createdMetaId: tx.metaId,
      } });
      await writeAuditLog(tx.app, tx.req, {
        entityType: 'donor', entityId: entity.id, communityId: tx.communityId, action: 'CREATE', after: entity,
      }, { store: tx.store, metaId: tx.metaId, required: true });
      return { entity, created: true };
    } catch (error) {
      if (input.clientGeneratedId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const replay = await findDonor(tx, input);
        if (replay) return { entity: replay, created: false };
      }
      throw error;
    }
  });
}

export async function updateDonor(ctx: MutationContext, input: DonorUpdateInput) {
  return withMutation(ctx, async (tx) => {
    const before = await findDonor(tx, input);
    if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Donor not found');
    const { id: _id, clientGeneratedId: _clientGeneratedId, ...data } = input;
    const entity = await tx.store.donor.update({ where: { id: before.id }, data: { ...data, updatedByUserId: tx.actorUserId } });
    await writeAuditLog(tx.app, tx.req, {
      entityType: 'donor', entityId: entity.id, communityId: tx.communityId, action: 'UPDATE', before, after: entity,
    }, { store: tx.store, metaId: tx.metaId, required: true });
    return entity;
  });
}

export async function deleteDonor(ctx: MutationContext, ref: EntityRef) {
  return withMutation(ctx, async (tx) => {
    const before = await findDonor(tx, ref);
    if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Donor not found');
    const entity = await tx.store.donor.update({ where: { id: before.id }, data: {
      status: 'DELETED', deletedAt: new Date(), updatedByUserId: tx.actorUserId,
    } });
    await writeAuditLog(tx.app, tx.req, {
      entityType: 'donor', entityId: entity.id, communityId: tx.communityId, action: 'DELETE', before, after: entity,
    }, { store: tx.store, metaId: tx.metaId, required: true });
    return entity;
  });
}
