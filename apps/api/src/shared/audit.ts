import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuditAction, UserRoleName } from '@prisma/client';

export async function writeAuditLog(app: FastifyInstance, req: FastifyRequest, input: {
  entityType: string;
  entityId: string;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
}) {
  const metaId = await req.getOrCreateRequestMetaId();
  const actorUserId = req.currentUser?.id;
  const actorRole = (req.currentUser?.roles?.[0] ?? undefined) as UserRoleName | undefined;

  await app.prisma.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorUserId,
      actorRole,
      before: input.before as any,
      after: input.after as any,
      metaId
    }
  });
}

