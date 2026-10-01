import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';

export async function nextInvoiceNumber(
  app: FastifyInstance,
  communityId: string,
  issueDate = new Date(),
  store: Prisma.TransactionClient = app.prisma,
): Promise<string> {
  const year = issueDate.getUTCFullYear();
  const [community, sequence] = await Promise.all([
    store.community.findUniqueOrThrow({ where: { id: communityId }, select: { slug: true } }),
    store.invoiceSequence.upsert({
      where: { communityId_year: { communityId, year } },
      create: { communityId, year, current: 1 },
      update: { current: { increment: 1 } },
      select: { current: true },
    }),
  ]);
  const code = community.slug.toUpperCase().slice(0, 4).replace(/[^A-Z0-9]/g, '') || 'MHF';
  return `MF-${year}-${code}-${String(sequence.current).padStart(5, '0')}`;
}
