import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import { Errors } from '../../shared/errors.js';

export type EntityRef = { id?: string; clientGeneratedId?: string };
export type MutationContext = {
  app: FastifyInstance;
  req: FastifyRequest;
  communityId: string;
  actorUserId: string;
  store?: Prisma.TransactionClient;
  metaId?: string;
};
export type TransactionMutationContext = MutationContext & {
  store: Prisma.TransactionClient;
  metaId: string;
};

export async function withMutation<T>(ctx: MutationContext, mutation: (context: TransactionMutationContext) => Promise<T>) {
  const metaId = ctx.metaId ?? await ctx.req.getOrCreateRequestMetaId();
  if (ctx.store) return mutation({ ...ctx, store: ctx.store, metaId });
  return ctx.app.prisma.$transaction(
    (store) => mutation({ ...ctx, store, metaId }),
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}

export async function requireEvent(ctx: TransactionMutationContext, eventId: string) {
  const event = await ctx.store.event.findFirst({
    where: { id: eventId, communityId: ctx.communityId, status: 'ACTIVE' }, select: { id: true },
  });
  if (!event) throw Errors.badRequest('Invalid event');
}

export async function requireDonor(ctx: TransactionMutationContext, donorId: string) {
  const donor = await ctx.store.donor.findFirst({
    where: { id: donorId, communityId: ctx.communityId, status: 'ACTIVE' },
    select: { id: true, fullName: true, phone: true },
  });
  if (!donor) throw Errors.badRequest('Invalid donor');
  return donor;
}
