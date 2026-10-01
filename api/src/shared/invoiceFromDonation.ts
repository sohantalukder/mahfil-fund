import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { amountToWordsBangla } from './banglaUtils.js';
import { nextInvoiceNumber } from '../services/invoiceNumber.js';
import { Errors } from './errors.js';

export async function ensureInvoiceForDonation(
  app: FastifyInstance,
  communityId: string,
  donationId: string,
  actorUserId: string | null,
  transactionStore?: Prisma.TransactionClient,
): Promise<{ invoiceId: string; invoiceNumber: string; created: boolean }> {
  const ensure = async (store: Prisma.TransactionClient) => {
    await store.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${donationId}, 0))`;
    const donation = await store.donation.findFirst({
      where: { id: donationId, communityId, status: 'ACTIVE' },
      include: {
        donor: { select: { address: true } },
        invoices: { where: { status: { not: 'CANCELLED' } }, take: 1 },
      },
    });
    if (!donation) throw Errors.notFound('Donation not found');
    const existing = donation.invoices[0];
    if (existing) return { invoiceId: existing.id, invoiceNumber: existing.invoiceNumber, created: false };

    const invoiceNumber = await nextInvoiceNumber(app, communityId, donation.donationDate, store);
    const invoice = await store.invoice.create({ data: {
      communityId,
      eventId: donation.eventId,
      donorId: donation.donorId,
      donationId: donation.id,
      invoiceNumber,
      invoiceType: 'DONATION_RECEIPT',
      issueDate: donation.donationDate,
      payerName: donation.donorSnapshotName,
      payerPhone: donation.donorSnapshotPhone,
      payerAddress: donation.donor.address ?? null,
      amount: donation.amount,
      amountInWordsBangla: amountToWordsBangla(donation.amount),
      paymentMethod: donation.paymentMethod,
      referenceNumber: donation.receiptNo ?? donation.transactionId ?? null,
      status: 'ISSUED',
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    } });
    await store.outboxJob.create({ data: {
      type: 'GENERATE_INVOICE_PDF',
      communityId,
      entityId: invoice.id,
      createdByUserId: actorUserId,
    } });
    return { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, created: true };
  };

  if (transactionStore) return ensure(transactionStore);
  try {
    return await app.prisma.$transaction(ensure, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const replay = await app.prisma.invoice.findFirst({
        where: { communityId, donationId, status: { not: 'CANCELLED' } },
        select: { id: true, invoiceNumber: true },
      });
      if (replay) return { invoiceId: replay.id, invoiceNumber: replay.invoiceNumber, created: false };
    }
    throw error;
  }
}
