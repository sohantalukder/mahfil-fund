import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DonationCreateSchema } from '../../shared/schemas.js';
import { ok } from '../../shared/http.js';
import { parseWith } from '../../shared/validate.js';
import { writeAuditLog } from '../../shared/audit.js';
import { Errors } from '../../shared/errors.js';
import { fileURLToPath } from 'node:url';
import { generateDonationsReportPdf, type DonationsReportPdfData } from '../../integrations/pdf.js';
import { createDonation, deleteDonation, updateDonation } from './service.js';
import { buildPagination } from '../../core/pagination.js';

const DonationUpdateSchema = DonationCreateSchema.partial().extend({
  clientGeneratedId: z.string().uuid().optional()
});

export async function registerDonationRoutes(app: FastifyInstance) {
  app.get('/donations', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    const query = parseWith(
      z.object({
        eventId: z.string().uuid().optional(),
        donorId: z.string().uuid().optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        search: z.string().min(1).max(80).optional(),
        paymentMethod: z.enum(['CASH', 'BKASH', 'NAGAD', 'BANK']).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(25)
      }),
      req.query
    );

    const communityId = req.communityId!;
    const donationDate = query.from || query.to ? { gte: query.from, lte: query.to } : undefined;

    const where = {
      communityId,
      status: 'ACTIVE' as const,
      eventId: query.eventId,
      donorId: query.donorId,
      paymentMethod: query.paymentMethod,
      donationDate,
      OR: query.search ? [
        { donorSnapshotName: { contains: query.search, mode: 'insensitive' as const } },
        { donorSnapshotPhone: { contains: query.search } }
      ] : undefined
    };

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const [donations, total] = await Promise.all([
      app.prisma.donation.findMany({
        where,
        orderBy: [{ donationDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      app.prisma.donation.count({ where })
    ]);

    const { totalPages } = buildPagination(page, pageSize, total);
    return ok(
      { donations, page, pageSize, total, totalPages },
      { serverTime: new Date().toISOString(), requestId: req.requestId, pagination: { page: page as number, pageSize: pageSize as number, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } }
    );
  });

  // Download donations report PDF (full list for current filters; ignores pagination)
  app.get(
    '/donations/report/download',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req, reply) => {
      const query = parseWith(
        z.object({
          eventId: z.string().uuid(),
          search: z.string().min(1).max(80).optional(),
        }),
        req.query
      );

      const communityId = req.communityId!;
      const event = await app.prisma.event.findFirst({ where: { id: query.eventId, communityId }, select: { id: true } });
      if (!event) throw Errors.unprocessable('eventId does not belong to this community');
      const [community, donations] = await Promise.all([
        app.prisma.community.findUnique({
          where: { id: communityId },
          select: { name: true, location: true },
        }),
        app.prisma.donation.findMany({
          where: {
            communityId,
            status: 'ACTIVE' as const,
            eventId: query.eventId,
            OR: query.search
              ? [
                  { donorSnapshotName: { contains: query.search, mode: 'insensitive' as const } },
                  { donorSnapshotPhone: { contains: query.search } },
                ]
              : undefined,
          },
          orderBy: [{ donationDate: 'desc' }, { createdAt: 'desc' }],
          take: 10_001,
        }),
      ]);

      if (!community) throw Errors.notFound('Community not found');
      if (donations.length > 10_000) throw Errors.unprocessable('Report exceeds the 10,000 row limit');

      const logoPath = fileURLToPath(new URL('../../assets/images/logo_black.png', import.meta.url));
      const pdfData: DonationsReportPdfData = {
        title: 'Donations report',
        communityName: community.name,
        communityLocation: community.location ?? undefined,
        logoPath,
        generatedAt: new Date(),
        filters: { eventId: query.eventId, search: query.search },
        rows: donations.map((d) => ({
          donorSnapshotName: d.donorSnapshotName,
          donorSnapshotPhone: d.donorSnapshotPhone,
          amount: d.amount,
          paymentMethod: d.paymentMethod,
          donationDate: d.donationDate,
          receiptNo: d.receiptNo ?? undefined,
          transactionId: d.transactionId ?? undefined,
        })),
      };

      const pdfBuffer = await generateDonationsReportPdf(pdfData);
      if (pdfBuffer.length > 20 * 1024 * 1024) throw Errors.unprocessable('Report exceeds the 20 MB limit');
      const fileName = `donations-report-${new Date().toISOString().slice(0, 10)}.pdf`;

      await writeAuditLog(app, req, {
        entityType: 'report',
        entityId: communityId,
        communityId,
        action: 'UPDATE',
        after: { action: 'DONATIONS_REPORT_DOWNLOADED', filters: pdfData.filters, count: pdfData.rows.length },
      });

      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${fileName}"`)
        .header('Content-Length', pdfBuffer.length);

      return reply.send(pdfBuffer);
    }
  );

  app.post('/donations', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    if (req.memberRole === 'VIEWER') throw Errors.forbidden('Viewers cannot add donations');
    const body = parseWith(DonationCreateSchema, req.body);
    const communityId = req.communityId!;
    return app.runIdempotentMutation(req, async (store) => {
      const { entity: donation } = await createDonation(
        { app, req, communityId, actorUserId: req.currentUser!.id, store },
        body,
      );
      return ok({ donation }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    });
  });

  app.patch('/donations/:id', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    if (req.memberRole === 'VIEWER') throw Errors.forbidden('Viewers cannot update donations');
    const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
    const body = parseWith(DonationUpdateSchema, req.body);
    const communityId = req.communityId!;

    const updated = await updateDonation(
      { app, req, communityId, actorUserId: req.currentUser!.id },
      { id: params.id, ...body },
    );
    return ok({ donation: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.delete('/donations/:id', { preHandler: async (req) => app.requireCommunity(req) }, async (req) => {
    if (req.memberRole !== 'ADMIN') {
      throw Errors.forbidden('Only admins can delete donations');
    }
    const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
    const communityId = req.communityId!;

    const updated = await deleteDonation(
      { app, req, communityId, actorUserId: req.currentUser!.id },
      { id: params.id },
    );
    return ok({ donation: updated }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });
}
