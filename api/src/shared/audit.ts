import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuditAction, UserRoleName } from '@prisma/client';

export async function writeAuditLog(app: FastifyInstance, req: FastifyRequest, input: {
  entityType: string;
  entityId: string;
  action: AuditAction;
  communityId?: string;
  before?: unknown;
  after?: unknown;
}) {
  try {
    const metaId = await req.getOrCreateRequestMetaId();
    const actorUserId = req.currentUser?.id;
    const actorRole = (req.currentUser?.roles?.[0] ?? undefined) as UserRoleName | undefined;
    const communityId = input.communityId ?? req.communityId ?? null;

    await app.prisma.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        communityId,
        actorUserId,
        actorRole,
        before: input.before as never,
        after: input.after as never,
        metaId
      }
    });
  } catch {
    // Audit log failure should not break the main operation
    app.log.warn('Failed to write audit log');
  }
}
