import { Prisma } from '@prisma/client';
import type { DonationCreateInput } from '../../shared/schemas.js';
import { Errors } from '../../shared/errors.js';
import { writeAuditLog } from '../../shared/audit.js';
import { type EntityRef, type MutationContext, type TransactionMutationContext, requireDonor, requireEvent, withMutation } from '../shared/mutationContext.js';

export type DonationUpdateInput = Partial<DonationCreateInput> & EntityRef;

async function findDonation(ctx: TransactionMutationContext, ref: EntityRef) {
  if (ref.id) return ctx.store.donation.findFirst({ where: { id: ref.id, communityId: ctx.communityId } });
  if (!ref.clientGeneratedId) return null;
  return ctx.store.donation.findUnique({
    where: { communityId_clientGeneratedId: { communityId: ctx.communityId, clientGeneratedId: ref.clientGeneratedId } },
  });
}

export async function createDonation(ctx: MutationContext, input: DonationCreateInput) {
  return withMutation(ctx, async (tx) => {
    const existing = input.clientGeneratedId ? await findDonation(tx, input) : null;
    if (existing) return { entity: existing, created: false };
    const [donor] = await Promise.all([requireDonor(tx, input.donorId), requireEvent(tx, input.eventId)]);
    try {
      const entity = await tx.store.donation.create({ data: {
        ...input, communityId: tx.communityId,
        donorSnapshotName: donor.fullName, donorSnapshotPhone: donor.phone,
        createdByUserId: tx.actorUserId, updatedByUserId: tx.actorUserId, createdMetaId: tx.metaId,
      } });
      await writeAuditLog(tx.app, tx.req, {
        entityType: 'donation', entityId: entity.id, communityId: tx.communityId, action: 'CREATE', after: entity,
      }, { store: tx.store, metaId: tx.metaId, required: true });
      await tx.store.outboxJob.create({ data: {
        type: 'CREATE_DONATION_INVOICE', communityId: tx.communityId,
        entityId: entity.id, createdByUserId: tx.actorUserId,
      } });
      return { entity, created: true };
    } catch (error) {
      if (input.clientGeneratedId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const replay = await findDonation(tx, input);
        if (replay) return { entity: replay, created: false };
      }
      throw error;
    }
  });
}

export async function updateDonation(ctx: MutationContext, input: DonationUpdateInput) {
  return withMutation(ctx, async (tx) => {
    const before = await findDonation(tx, input);
    if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Donation not found');
    const donor = input.donorId ? await requireDonor(tx, input.donorId) : null;
    if (input.eventId) await requireEvent(tx, input.eventId);
    const { id: _id, clientGeneratedId: _clientGeneratedId, ...data } = input;
    const entity = await tx.store.donation.update({ where: { id: before.id }, data: {
      ...data,
      ...(donor ? { donorSnapshotName: donor.fullName, donorSnapshotPhone: donor.phone } : {}),
      updatedByUserId: tx.actorUserId,
    } });
    await writeAuditLog(tx.app, tx.req, {
      entityType: 'donation', entityId: entity.id, communityId: tx.communityId, action: 'UPDATE', before, after: entity,
    }, { store: tx.store, metaId: tx.metaId, required: true });
    return entity;
  });
}

export async function deleteDonation(ctx: MutationContext, ref: EntityRef) {
  return withMutation(ctx, async (tx) => {
    const before = await findDonation(tx, ref);
    if (!before || before.status !== 'ACTIVE') throw Errors.notFound('Donation not found');
    const entity = await tx.store.donation.update({ where: { id: before.id }, data: {
      status: 'DELETED', deletedAt: new Date(), updatedByUserId: tx.actorUserId,
    } });
    await writeAuditLog(tx.app, tx.req, {
      entityType: 'donation', entityId: entity.id, communityId: tx.communityId, action: 'DELETE', before, after: entity,
    }, { store: tx.store, metaId: tx.metaId, required: true });
    return entity;
  });
}
