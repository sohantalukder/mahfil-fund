import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { Errors } from '../shared/errors.js';
import { writeAuditLog } from '../shared/audit.js';
import { amountToWordsBangla } from '../shared/banglaUtils.js';
import {
  generateInvoicePdfAsync,
  generateInvoicesReportPdf,
  type InvoicePdfData,
  type InvoicesReportPdfData,
} from '../services/pdfGenerator.js';
import { ensureInvoiceForDonation } from '../shared/invoiceFromDonation.js';

const CreateInvoiceSchema = z.object({
  eventId: z.string().uuid().optional(),
  donorId: z.string().uuid().optional(),
  invoiceType: z.enum(['DONATION_RECEIPT', 'SPONSOR_RECEIPT', 'MANUAL']),
  issueDate: z.coerce.date(),
  payerName: z.string().min(1).max(120),
  payerPhone: z.string().max(20).optional(),
  payerAddress: z.string().max(200).optional(),
  amount: z.coerce.number().int().min(1),
  paymentMethod: z.enum(['CASH', 'BKASH', 'NAGAD', 'BANK']).optional(),
  referenceNumber: z.string().max(80).optional(),
  note: z.string().max(300).optional()
});

async function generateInvoiceNumber(app: FastifyInstance, communityId: string): Promise<string> {
  const year = new Date().getFullYear();

  const community = await app.prisma.community.findUnique({
    where: { id: communityId },
    select: { slug: true }
  });

  const communityCode = (community?.slug ?? 'MHF').toUpperCase().slice(0, 4).replace(/[^A-Z0-9]/g, '');

  const count = await app.prisma.invoice.count({
    where: { communityId, issueDate: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } }
  });

  const sequence = String(count + 1).padStart(5, '0');
  return `MF-${year}-${communityCode}-${sequence}`;
}

export async function registerInvoiceRoutes(app: FastifyInstance) {
  // List invoices for community
  app.get(
    '/invoices',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      const query = parseWith(
        z.object({
          eventId: z.string().uuid().optional(),
          donorId: z.string().uuid().optional(),
          status: z.enum(['DRAFT', 'ISSUED', 'CANCELLED']).optional(),
          invoiceType: z.enum(['DONATION_RECEIPT', 'SPONSOR_RECEIPT', 'MANUAL']).optional(),
          search: z.string().min(1).max(80).optional(),
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(25)
        }),
        req.query
      );

      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 25;
      const where = {
        communityId: req.communityId!,
        ...(query.eventId ? { eventId: query.eventId } : {}),
        ...(query.donorId ? { donorId: query.donorId } : {}),
        ...(query.status ? { status: query.status as never } : {}),
        ...(query.invoiceType ? { invoiceType: query.invoiceType as never } : {}),
        OR: query.search
          ? [
              { payerName: { contains: query.search, mode: 'insensitive' as const } },
            ]
          : undefined
      };

      const [invoices, total] = await Promise.all([
        app.prisma.invoice.findMany({
          where,
          include: { donor: { select: { fullName: true } }, event: { select: { name: true } } },
          orderBy: { issueDate: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        app.prisma.invoice.count({ where })
      ]);

      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      return ok(
        { invoices, page, pageSize, total, totalPages },
        { serverTime: new Date().toISOString(), requestId: req.requestId, pagination: { page: page as number, pageSize: pageSize as number, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } }
      );
    }
  );

  // Download invoices report PDF (full list for current filters; ignores pagination)
  app.get(
    '/invoices/report/download',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req, reply) => {
      const query = parseWith(
        z.object({
          status: z.enum(['DRAFT', 'ISSUED', 'CANCELLED']).optional(),
          invoiceType: z.enum(['DONATION_RECEIPT', 'SPONSOR_RECEIPT', 'MANUAL']).optional(),
        }),
        req.query
      );

      const communityId = req.communityId!;

      const where = {
        communityId,
        ...(query.status ? { status: query.status as never } : {}),
        ...(query.invoiceType ? { invoiceType: query.invoiceType as never } : {}),
      };

      const [community, invoices] = await Promise.all([
        app.prisma.community.findUnique({
          where: { id: communityId },
          select: { name: true, location: true },
        }),
        app.prisma.invoice.findMany({
          where,
          include: { event: { select: { name: true } } },
          orderBy: [{ issueDate: 'desc' }, { invoiceNumber: 'desc' }],
        }),
      ]);

      if (!community) throw Errors.notFound('Community not found');

      const logoPath = fileURLToPath(new URL('../assets/images/logo_black.png', import.meta.url));
      const pdfData: InvoicesReportPdfData = {
        title: 'Invoices report',
        communityName: community.name,
        communityLocation: community.location ?? undefined,
        logoPath,
        generatedAt: new Date(),
        filters: {
          status: query.status,
          invoiceType: query.invoiceType,
        },
        rows: invoices.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          issueDate: inv.issueDate,
          payerName: inv.payerName,
          payerPhone: inv.payerPhone ?? undefined,
          invoiceType: inv.invoiceType,
          status: inv.status,
          eventName: inv.event?.name ?? undefined,
          amount: inv.amount,
        })),
      };

      const pdfBuffer = await generateInvoicesReportPdf(pdfData);
      const fileName = `invoices-report-${new Date().toISOString().slice(0, 10)}.pdf`;

      await writeAuditLog(app, req, {
        entityType: 'invoice',
        entityId: req.currentUser!.id,
        communityId,
        action: 'UPDATE',
        after: { action: 'REPORT_DOWNLOADED', filters: pdfData.filters, count: pdfData.rows.length },
      });

      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${fileName}"`)
        .header('Content-Length', pdfBuffer.length);

      return reply.send(pdfBuffer);
    }
  );

  // Download excess invoices list PDF (amount >= minAmount; ignores pagination)
  app.get(
    '/invoices/excess/download',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req, reply) => {
      const query = parseWith(
        z.object({
          status: z.enum(['DRAFT', 'ISSUED', 'CANCELLED']).optional(),
          invoiceType: z.enum(['DONATION_RECEIPT', 'SPONSOR_RECEIPT', 'MANUAL']).optional(),
          minAmount: z.coerce.number().int().min(1).default(10_000),
        }),
        req.query
      );

      const communityId = req.communityId!;

      const where = {
        communityId,
        amount: { gte: query.minAmount },
        ...(query.status ? { status: query.status as never } : {}),
        ...(query.invoiceType ? { invoiceType: query.invoiceType as never } : {}),
      };

      const [community, invoices] = await Promise.all([
        app.prisma.community.findUnique({
          where: { id: communityId },
          select: { name: true, location: true },
        }),
        app.prisma.invoice.findMany({
          where,
          include: { event: { select: { name: true } } },
          orderBy: [{ issueDate: 'desc' }, { invoiceNumber: 'desc' }],
        }),
      ]);

      if (!community) throw Errors.notFound('Community not found');

      const logoPath = fileURLToPath(new URL('../assets/images/logo_black.png', import.meta.url));
      const pdfData: InvoicesReportPdfData = {
        title: 'Excess invoices',
        communityName: community.name,
        communityLocation: community.location ?? undefined,
        logoPath,
        generatedAt: new Date(),
        filters: {
          status: query.status,
          invoiceType: query.invoiceType,
          minAmount: query.minAmount,
        },
        rows: invoices.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          issueDate: inv.issueDate,
          payerName: inv.payerName,
          payerPhone: inv.payerPhone ?? undefined,
          invoiceType: inv.invoiceType,
          status: inv.status,
          eventName: inv.event?.name ?? undefined,
          amount: inv.amount,
        })),
      };

      const pdfBuffer = await generateInvoicesReportPdf(pdfData);
      const fileName = `excess-invoices-${query.minAmount}-${new Date().toISOString().slice(0, 10)}.pdf`;

      await writeAuditLog(app, req, {
        entityType: 'invoice',
        entityId: req.currentUser!.id,
        communityId,
        action: 'UPDATE',
        after: {
          action: 'EXCESS_REPORT_DOWNLOADED',
          filters: pdfData.filters,
          count: pdfData.rows.length,
        },
      });

      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${fileName}"`)
        .header('Content-Length', pdfBuffer.length);

      return reply.send(pdfBuffer);
    }
  );

  // Get single invoice
  app.get(
    '/invoices/:id',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
      const invoice = await app.prisma.invoice.findFirst({
        where: { id: params.id, communityId: req.communityId! },
        include: {
          donor: true,
          event: { select: { name: true, year: true } },
          donation: { select: { amount: true, donationDate: true, paymentMethod: true } },
          community: { select: { name: true, location: true } }
        }
      });
      if (!invoice) throw Errors.notFound('Invoice not found');
      return ok({ invoice }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  // Create invoice manually
  app.post(
    '/invoices',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      if (req.memberRole === 'viewer') throw Errors.forbidden('Viewers cannot create invoices');

      const body = parseWith(CreateInvoiceSchema, req.body);
      const communityId = req.communityId!;

      const invoiceNumber = await generateInvoiceNumber(app, communityId);
      const amountInWordsBangla = amountToWordsBangla(body.amount);

      const invoice = await app.prisma.invoice.create({
        data: {
          communityId,
          eventId: body.eventId ?? null,
          donorId: body.donorId ?? null,
          invoiceNumber,
          invoiceType: body.invoiceType,
          issueDate: body.issueDate,
          payerName: body.payerName,
          payerPhone: body.payerPhone ?? null,
          payerAddress: body.payerAddress ?? null,
          amount: body.amount,
          amountInWordsBangla,
          paymentMethod: body.paymentMethod ?? null,
          referenceNumber: body.referenceNumber ?? null,
          note: body.note ?? null,
          status: 'ISSUED',
          createdByUserId: req.currentUser!.id,
          updatedByUserId: req.currentUser!.id
        }
      });

      await writeAuditLog(app, req, {
        entityType: 'invoice',
        entityId: invoice.id,
        communityId,
        action: 'CREATE',
        after: invoice
      });

      return ok({ invoice }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  // Generate invoice from donation
  app.post(
    '/invoices/from-donation/:donationId',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      if (req.memberRole === 'viewer') throw Errors.forbidden('Viewers cannot create invoices');

      const params = parseWith(z.object({ donationId: z.string().uuid() }), req.params);
      const communityId = req.communityId!;
      let invoiceId: string;
      let invoiceNumber: string;
      try {
        ({ invoiceId, invoiceNumber } = await ensureInvoiceForDonation(
          app,
          communityId,
          params.donationId,
          req.currentUser!.id
        ));
      } catch {
        throw Errors.notFound('Donation not found');
      }

      const invoice = await app.prisma.invoice.findFirst({ where: { id: invoiceId, communityId } });
      if (!invoice) throw Errors.notFound('Invoice not found');

      await writeAuditLog(app, req, {
        entityType: 'invoice',
        entityId: invoice.id,
        communityId,
        action: 'CREATE',
        after: { action: 'CREATED_FROM_DONATION', invoiceNumber }
      });

      return ok({ invoice }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  // Download invoice PDF
  app.get(
    '/invoices/:id/download',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req, reply) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
      const communityId = req.communityId!;

      const invoice = await app.prisma.invoice.findFirst({
        where: { id: params.id, communityId },
        include: {
          community: { select: { name: true, location: true } },
          event: { select: { name: true } }
        }
      });

      if (!invoice) throw Errors.notFound('Invoice not found');

      // Generate fresh PDF
      const logoPath = fileURLToPath(new URL('../assets/images/logo_black.png', import.meta.url));
      const pdfData: InvoicePdfData = {
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        communityName: invoice.community.name,
        communityLocation: invoice.community.location ?? undefined,
        logoPath,
        payerName: invoice.payerName,
        payerPhone: invoice.payerPhone ?? undefined,
        payerAddress: invoice.payerAddress ?? undefined,
        amount: invoice.amount,
        paymentMethod: invoice.paymentMethod ?? undefined,
        referenceNumber: invoice.referenceNumber ?? undefined,
        note: invoice.note ?? undefined,
        invoiceType: invoice.invoiceType,
        eventName: invoice.event?.name
      };

      const pdfBuffer = await generateInvoicePdfAsync(pdfData);

      await writeAuditLog(app, req, {
        entityType: 'invoice',
        entityId: invoice.id,
        communityId,
        action: 'UPDATE',
        after: { action: 'DOWNLOADED', invoiceNumber: invoice.invoiceNumber }
      });

      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`)
        .header('Content-Length', pdfBuffer.length);

      return reply.send(pdfBuffer);
    }
  );
}
