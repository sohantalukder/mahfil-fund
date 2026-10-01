import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import { z } from 'zod';
import { ok } from '../../shared/http.js';
import { parseWith } from '../../shared/validate.js';
import { Errors } from '../../shared/errors.js';
import { uploadFile, deleteFile, buildStoragePath, getSignedUrl } from '../../integrations/storage.js';
import { logErrorFromRequest } from '../../services/errorLogger.js';

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf'
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

type EntityType = 'community_logo' | 'donor_profile' | 'donation_proof' | 'expense_receipt' | 'invoice_pdf';

const ENTITY_TYPE_VALUES: [EntityType, ...EntityType[]] = [
  'community_logo', 'donor_profile', 'donation_proof', 'expense_receipt', 'invoice_pdf'
];

export async function registerUploadRoutes(app: FastifyInstance) {
  // Upload a file
  app.post(
    '/uploads',
    { preHandler: async (req) => app.requireCommunity(req), config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (req) => {
      if (req.memberRole === 'VIEWER') throw Errors.forbidden('Viewers cannot upload files');

      // Parse multipart form
      const data = await req.file();
      if (!data) throw Errors.badRequest('No file provided');

      const entityType = (data.fields['entityType'] as { value?: string } | undefined)?.value as EntityType | undefined;
      const rawEntityId = (data.fields['entityId'] as { value?: string } | undefined)?.value;

      if (!entityType || !ENTITY_TYPE_VALUES.includes(entityType)) {
        throw Errors.badRequest(`Invalid entityType. Must be one of: ${ENTITY_TYPE_VALUES.join(', ')}`);
      }
      if (data.filename.length > 200) throw Errors.unprocessable('File name is too long');
      const entityId = rawEntityId
        ? parseWith(z.string().uuid(), rawEntityId)
        : undefined;
      if ((entityType === 'community_logo' || entityType === 'invoice_pdf') && req.memberRole !== 'ADMIN') {
        throw Errors.forbidden('Administrator access is required for this upload type');
      }

      // Validate mime type
      const mimeType = data.mimetype;
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        throw Errors.badRequest(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
      }

      // Read file buffer with size check
      const chunks: Buffer[] = [];
      let totalSize = 0;

      for await (const chunk of data.file) {
        totalSize += chunk.length;
        if (totalSize > MAX_FILE_SIZE) {
          throw Errors.badRequest(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        }
        chunks.push(chunk);
      }

      const fileBuffer = Buffer.concat(chunks);
      const detected = await fileTypeFromBuffer(fileBuffer);
      if (!detected || !ALLOWED_MIME_TYPES.includes(detected.mime) || detected.mime !== mimeType) {
        throw Errors.badRequest('File content does not match an allowed file type');
      }

      const communityId = req.communityId!;
      let eventId: string | undefined;
      if (entityType === 'community_logo') {
        if (entityId && entityId !== communityId) throw Errors.badRequest('Invalid community logo target');
      } else {
        if (!entityId) throw Errors.badRequest('entityId is required');
        if (entityType === 'donor_profile') {
          const entity = await app.prisma.donor.findFirst({ where: { id: entityId, communityId, status: 'ACTIVE' }, select: { id: true } });
          if (!entity) throw Errors.badRequest('Invalid donor target');
        } else if (entityType === 'donation_proof') {
          const entity = await app.prisma.donation.findFirst({ where: { id: entityId, communityId, status: 'ACTIVE' }, select: { id: true, eventId: true } });
          if (!entity) throw Errors.badRequest('Invalid donation target');
          eventId = entity.eventId;
        } else if (entityType === 'expense_receipt') {
          const entity = await app.prisma.expense.findFirst({ where: { id: entityId, communityId, status: 'ACTIVE' }, select: { id: true, eventId: true } });
          if (!entity) throw Errors.badRequest('Invalid expense target');
          eventId = entity.eventId;
        } else {
          const entity = await app.prisma.invoice.findFirst({ where: { id: entityId, communityId }, select: { id: true, eventId: true } });
          if (!entity) throw Errors.badRequest('Invalid invoice target');
          eventId = entity.eventId ?? undefined;
        }
      }
      const fileName = `${randomUUID()}.${detected.ext}`;
      const objectPath = buildStoragePath(entityType, communityId, { eventId, fileName });
      let storedPath: string | undefined;

      try {
        const uploaded = await uploadFile(
          app.env, objectPath, fileBuffer, detected.mime, false
        );
        storedPath = uploaded.objectPath;

        const { attachment } = await app.prisma.$transaction(async (tx) => {
          const attachment = await tx.attachment.create({ data: {
            communityId,
            entityType,
            entityId: entityId ?? null,
            bucket: uploaded.bucket,
            objectPath: uploaded.objectPath,
            originalName: data.filename,
            mimeType: detected.mime,
            sizeBytes: fileBuffer.length,
            isPublic: false,
            status: 'READY',
            uploadedByUserId: req.currentUser!.id
          } });
          let previousAttachmentId: string | null = null;
          if (entityType === 'community_logo') {
            const target = await tx.community.findUnique({ where: { id: communityId }, select: { logoAttachmentId: true } });
            if (!target) throw Errors.notFound('Community not found');
            previousAttachmentId = target.logoAttachmentId;
            await tx.community.update({ where: { id: communityId }, data: { logoAttachmentId: attachment.id } });
          } else if (entityType === 'donor_profile') {
            const target = await tx.donor.findFirst({ where: { id: entityId!, communityId, status: 'ACTIVE' }, select: { profileAttachmentId: true } });
            if (!target) throw Errors.notFound('Donor not found');
            previousAttachmentId = target.profileAttachmentId;
            await tx.donor.update({ where: { id: entityId! }, data: { profileAttachmentId: attachment.id } });
          } else if (entityType === 'donation_proof') {
            const target = await tx.donation.findFirst({ where: { id: entityId!, communityId, status: 'ACTIVE' }, select: { proofAttachmentId: true } });
            if (!target) throw Errors.notFound('Donation not found');
            previousAttachmentId = target.proofAttachmentId;
            await tx.donation.update({ where: { id: entityId! }, data: { proofAttachmentId: attachment.id } });
          } else if (entityType === 'expense_receipt') {
            const target = await tx.expense.findFirst({ where: { id: entityId!, communityId, status: 'ACTIVE' }, select: { receiptAttachmentId: true } });
            if (!target) throw Errors.notFound('Expense not found');
            previousAttachmentId = target.receiptAttachmentId;
            await tx.expense.update({ where: { id: entityId! }, data: { receiptAttachmentId: attachment.id } });
          } else {
            const target = await tx.invoice.findFirst({ where: { id: entityId!, communityId }, select: { pdfAttachmentId: true } });
            if (!target) throw Errors.notFound('Invoice not found');
            previousAttachmentId = target.pdfAttachmentId;
            await tx.invoice.update({ where: { id: entityId! }, data: { pdfAttachmentId: attachment.id } });
          }
          if (previousAttachmentId && previousAttachmentId !== attachment.id) {
            const previous = await tx.attachment.findFirst({ where: { id: previousAttachmentId, communityId } });
            if (previous) {
              await tx.attachment.update({ where: { id: previous.id }, data: { status: 'DELETING' } });
              await tx.outboxJob.create({ data: {
                type: 'DELETE_STORAGE_OBJECT', communityId, entityId: previous.id,
                objectBucket: previous.bucket, objectPath: previous.objectPath,
                createdByUserId: req.currentUser!.id,
              } });
            }
          }
          return { attachment, previousAttachmentId };
        });

        return ok(
          { attachment },
          { serverTime: new Date().toISOString(), requestId: req.requestId }
        );
      } catch (err) {
        if (storedPath) await deleteFile(app.env, storedPath).catch(() => undefined);
        logErrorFromRequest(app, req, err as Error, {
          source: 'UPLOAD',
          actionName: 'upload_file',
          errorCode: 'UPLOAD_FAILED',
          communityId
        });
        throw Errors.badRequest('File upload failed. Please try again.');
      }
    }
  );

  // Get attachment with signed URL
  app.get(
    '/uploads/:id',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);

      const attachment = await app.prisma.attachment.findFirst({
        where: { id: params.id, communityId: req.communityId!, status: 'READY' }
      });

      if (!attachment) throw Errors.notFound('Attachment not found');

      let signedUrl: string | undefined;
      if (!attachment.isPublic) {
        try {
          signedUrl = await getSignedUrl(app.env, attachment.objectPath);
        } catch {
          // Non-critical: return attachment without URL
        }
      }

      return ok(
        { attachment: { ...attachment, signedUrl } },
        { serverTime: new Date().toISOString(), requestId: req.requestId }
      );
    }
  );

  // Delete attachment
  app.delete(
    '/uploads/:id',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);

      if (req.memberRole === 'VIEWER') throw Errors.forbidden('Viewers cannot delete files');

      const attachment = await app.prisma.attachment.findFirst({
        where: { id: params.id, communityId: req.communityId! }
      });

      if (!attachment) throw Errors.notFound('Attachment not found');

      await app.prisma.$transaction(async (tx) => {
        await Promise.all([
          tx.community.updateMany({ where: { id: req.communityId!, logoAttachmentId: attachment.id }, data: { logoAttachmentId: null } }),
          tx.donor.updateMany({ where: { communityId: req.communityId!, profileAttachmentId: attachment.id }, data: { profileAttachmentId: null } }),
          tx.donation.updateMany({ where: { communityId: req.communityId!, proofAttachmentId: attachment.id }, data: { proofAttachmentId: null } }),
          tx.expense.updateMany({ where: { communityId: req.communityId!, receiptAttachmentId: attachment.id }, data: { receiptAttachmentId: null } }),
          tx.invoice.updateMany({ where: { communityId: req.communityId!, pdfAttachmentId: attachment.id }, data: { pdfAttachmentId: null } }),
        ]);
        await tx.attachment.update({ where: { id: params.id }, data: { status: 'DELETING' } });
        await tx.outboxJob.create({ data: {
          type: 'DELETE_STORAGE_OBJECT', communityId: req.communityId!, entityId: attachment.id,
          objectBucket: attachment.bucket, objectPath: attachment.objectPath,
          createdByUserId: req.currentUser!.id,
        } });
      });

      return ok({ message: 'Attachment deletion queued' }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );
}
