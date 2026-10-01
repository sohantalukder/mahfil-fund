import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ensureInvoiceForDonation } from '../shared/invoiceFromDonation.js';
import { generateInvoicePdfAsync, type InvoicePdfData } from './pdf.js';
import { buildStoragePath, deleteFile, uploadFile } from './storage.js';

const LEASE_MS = 60_000;

async function claimJob(app: FastifyInstance) {
  return app.prisma.$transaction(async (store) => {
    const now = new Date();
    const job = await store.outboxJob.findFirst({
      where: {
        attempts: { lt: 5 },
        availableAt: { lte: now },
        OR: [
          { status: { in: ['PENDING', 'FAILED'] } },
          { status: 'PROCESSING', leaseUntil: { lt: now } },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!job) return null;
    const claimed = await store.outboxJob.updateMany({
      where: { id: job.id, updatedAt: job.updatedAt },
      data: {
        status: 'PROCESSING', attempts: { increment: 1 },
        leaseUntil: new Date(now.getTime() + LEASE_MS), lastErrorCode: null,
      },
    });
    return claimed.count === 1 ? { ...job, attempts: job.attempts + 1 } : null;
  });
}

async function generateInvoicePdf(app: FastifyInstance, invoiceId: string, communityId: string, actorUserId?: string | null) {
  const invoice = await app.prisma.invoice.findFirst({
    where: { id: invoiceId, communityId },
    include: {
      community: { select: { name: true, location: true } },
      event: { select: { name: true } },
    },
  });
  if (!invoice) throw new Error('OUTBOX_ENTITY_NOT_FOUND');
  const data: InvoicePdfData = {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    communityName: invoice.community.name,
    communityLocation: invoice.community.location ?? undefined,
    logoPath: fileURLToPath(new URL('../assets/images/logo_black.png', import.meta.url)),
    payerName: invoice.payerName,
    payerPhone: invoice.payerPhone ?? undefined,
    payerAddress: invoice.payerAddress ?? undefined,
    amount: invoice.amount,
    paymentMethod: invoice.paymentMethod ?? undefined,
    referenceNumber: invoice.referenceNumber ?? undefined,
    note: invoice.note ?? undefined,
    invoiceType: invoice.invoiceType,
    eventName: invoice.event?.name,
  };
  const pdf = await generateInvoicePdfAsync(data);
  const fileName = `${randomUUID()}.pdf`;
  const objectPath = buildStoragePath('invoice_pdf', communityId, { fileName });
  const uploaded = await uploadFile(app.env, objectPath, pdf, 'application/pdf');
  try {
    await app.prisma.$transaction(async (store) => {
      const attachment = await store.attachment.create({ data: {
        communityId,
        entityType: 'invoice_pdf',
        entityId: invoice.id,
        bucket: uploaded.bucket,
        objectPath: uploaded.objectPath,
        originalName: `${invoice.invoiceNumber}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: pdf.length,
        status: 'READY',
        uploadedByUserId: actorUserId ?? null,
      } });
      await store.invoice.update({ where: { id: invoice.id }, data: { pdfAttachmentId: attachment.id } });
      if (invoice.pdfAttachmentId) {
        const previous = await store.attachment.findUnique({ where: { id: invoice.pdfAttachmentId } });
        if (previous) {
          await store.attachment.update({ where: { id: previous.id }, data: { status: 'DELETING' } });
          await store.outboxJob.create({ data: {
            type: 'DELETE_STORAGE_OBJECT', communityId, entityId: previous.id,
            objectBucket: previous.bucket, objectPath: previous.objectPath, createdByUserId: actorUserId ?? null,
          } });
        }
      }
    });
  } catch (error) {
    await deleteFile(app.env, uploaded.objectPath).catch(() => undefined);
    throw error;
  }
}

async function processJob(app: FastifyInstance, job: NonNullable<Awaited<ReturnType<typeof claimJob>>>) {
  if (job.type === 'CREATE_DONATION_INVOICE') {
    await ensureInvoiceForDonation(app, job.communityId, job.entityId, job.createdByUserId);
    return;
  }
  if (job.type === 'GENERATE_INVOICE_PDF') {
    await generateInvoicePdf(app, job.entityId, job.communityId, job.createdByUserId);
    return;
  }
  if (!job.objectPath) throw new Error('OUTBOX_OBJECT_PATH_MISSING');
  await deleteFile(app.env, job.objectPath);
  await app.prisma.attachment.deleteMany({ where: { id: job.entityId, communityId: job.communityId, status: 'DELETING' } });
}

export async function runOneOutboxJob(app: FastifyInstance): Promise<boolean> {
  const job = await claimJob(app);
  if (!job) return false;
  try {
    await processJob(app, job);
    await app.prisma.outboxJob.update({
      where: { id: job.id }, data: { status: 'COMPLETED', completedAt: new Date(), leaseUntil: null },
    });
  } catch (error) {
    const exhausted = job.attempts >= job.maxAttempts;
    await app.prisma.outboxJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED', leaseUntil: null,
        availableAt: new Date(Date.now() + (exhausted ? 24 * 60 * 60_000 : Math.min(60_000, 2 ** job.attempts * 1000))),
        lastErrorCode: error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : 'OUTBOX_JOB_FAILED',
      },
    });
    app.log.error({ jobId: job.id, jobType: job.type }, 'Outbox job failed');
  }
  return true;
}

export function registerOutboxWorker(app: FastifyInstance) {
  if (app.env.NODE_ENV === 'test') return;
  let running = false;
  const drain = async () => {
    if (running) return;
    running = true;
    try {
      for (let processed = 0; processed < 10 && await runOneOutboxJob(app); processed += 1) {
        // Bounded drain keeps the API event loop responsive.
      }
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void drain(), 5_000);
  timer.unref();
  app.addHook('onReady', async () => { await drain(); });
  app.addHook('onClose', async () => { clearInterval(timer); });
}
