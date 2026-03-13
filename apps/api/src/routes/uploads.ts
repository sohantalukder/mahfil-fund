import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { Errors } from '../shared/errors.js';
import { uploadFile, buildStoragePath, getSignedUrl } from '../services/storage.js';
import { logErrorFromRequest } from '../services/errorLogger.js';

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
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req, reply) => {
      if (req.memberRole === 'viewer') throw Errors.forbidden('Viewers cannot upload files');

      // Parse multipart form
      const data = await req.file();
      if (!data) throw Errors.badRequest('No file provided');

      const entityType = (data.fields['entityType'] as { value?: string } | undefined)?.value as EntityType | undefined;
      const entityId = (data.fields['entityId'] as { value?: string } | undefined)?.value;
      const eventId = (data.fields['eventId'] as { value?: string } | undefined)?.value;
      const isPublic = (data.fields['isPublic'] as { value?: string } | undefined)?.value === 'true';

      if (!entityType || !ENTITY_TYPE_VALUES.includes(entityType)) {
        throw Errors.badRequest(`Invalid entityType. Must be one of: ${ENTITY_TYPE_VALUES.join(', ')}`);
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
      const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin';
      const timestamp = Date.now();
      const fileName = `${timestamp}-${data.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}.${ext}`;

      const communityId = req.communityId!;
      const objectPath = buildStoragePath(entityType, communityId, { eventId, fileName });

      try {
        const { bucket, objectPath: storedPath, publicUrl } = await uploadFile(
          app.env, objectPath, fileBuffer, mimeType, isPublic
        );

        const attachment = await app.prisma.attachment.create({
          data: {
            communityId,
            entityType,
            entityId: entityId ?? null,
            bucket,
            objectPath: storedPath,
            originalName: data.filename,
            mimeType,
            sizeBytes: fileBuffer.length,
            isPublic,
            uploadedByUserId: req.currentUser!.id
          }
        });

        return ok(
          { attachment: { ...attachment, publicUrl } },
          { serverTime: new Date().toISOString(), requestId: req.requestId }
        );
      } catch (err) {
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
        where: { id: params.id, communityId: req.communityId! }
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

      if (req.memberRole === 'viewer') throw Errors.forbidden('Viewers cannot delete files');

      const attachment = await app.prisma.attachment.findFirst({
        where: { id: params.id, communityId: req.communityId! }
      });

      if (!attachment) throw Errors.notFound('Attachment not found');

      await app.prisma.attachment.delete({ where: { id: params.id } });

      return ok({ message: 'Attachment deleted' }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );
}
