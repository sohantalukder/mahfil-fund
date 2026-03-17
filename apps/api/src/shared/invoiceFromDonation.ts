import type { FastifyInstance } from 'fastify';
import { amountToWordsBangla } from './banglaUtils.js';
import { generateInvoicePdfAsync } from '../services/pdfGenerator.js';
import { buildStoragePath, uploadFile } from '../services/storage.js';

export async function ensureInvoiceForDonation(
  app: FastifyInstance,
  communityId: string,
  donationId: string,
  actorUserId: string
): Promise<{ invoiceId: string; invoiceNumber: string }> {
  const donation = await app.prisma.donation.findFirst({
    where: { id: donationId, communityId, status: 'ACTIVE' },
    include: {
      donor: true,
      event: { select: { name: true } },
      invoices: { where: { status: { not: 'CANCELLED' } } },
    },
  });

  if (!donation) throw new Error('Donation not found');

  if (donation.invoices.length > 0) {
    return { invoiceId: donation.invoices[0]!.id, invoiceNumber: donation.invoices[0]!.invoiceNumber };
  }

  const community = await app.prisma.community.findUnique({
    where: { id: communityId },
    select: { name: true, location: true, slug: true },
  });

  const year = new Date().getFullYear();
  const communityCode = (community?.slug ?? 'MHF').toUpperCase().slice(0, 4).replace(/[^A-Z0-9]/g, '');
  const count = await app.prisma.invoice.count({
    where: { communityId, issueDate: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
  });
  const invoiceNumber = `MF-${year}-${communityCode}-${String(count + 1).padStart(5, '0')}`;

  const invoice = await app.prisma.invoice.create({
    data: {
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
    },
  });

  generateInvoicePdfAsync({
    invoiceNumber,
    issueDate: donation.donationDate,
    communityName: community?.name ?? 'Community',
    communityLocation: community?.location ?? undefined,
    payerName: donation.donorSnapshotName,
    payerPhone: donation.donorSnapshotPhone,
    payerAddress: donation.donor.address ?? undefined,
    amount: donation.amount,
    paymentMethod: donation.paymentMethod,
    referenceNumber: donation.receiptNo ?? donation.transactionId ?? undefined,
    invoiceType: 'DONATION_RECEIPT',
    eventName: donation.event.name,
  })
    .then(async (pdfBuffer) => {
      const fileName = `${invoiceNumber}.pdf`;
      const objectPath = buildStoragePath('invoice_pdf', communityId, { fileName });
      const { bucket, objectPath: storedPath } = await uploadFile(app.env, objectPath, pdfBuffer, 'application/pdf');

      const attachment = await app.prisma.attachment.create({
        data: {
          communityId,
          entityType: 'invoice',
          entityId: invoice.id,
          bucket,
          objectPath: storedPath,
          originalName: fileName,
          mimeType: 'application/pdf',
          sizeBytes: pdfBuffer.length,
          uploadedByUserId: actorUserId,
        },
      });

      await app.prisma.invoice.update({
        where: { id: invoice.id },
        data: { pdfAttachmentId: attachment.id },
      });
    })
    .catch((err) => {
      app.log.error({ err }, 'Failed to generate invoice PDF');
    });

  return { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber };
}

