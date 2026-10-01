import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuditAction, Prisma } from '@prisma/client';

const sensitiveAuditKey = /password|secret|token|otp|hash|authorization|cookie|email|phone|address|note|amount|reference|transaction|receipt|objectPath/i;

function sanitizeAuditValue(value: unknown, depth = 0): unknown {
  if (depth > 3) return '[filtered]';
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return value.slice(0, 200);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeAuditValue(item, depth + 1));
  if (typeof value !== 'object') return '[filtered]';
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !sensitiveAuditKey.test(key))
    .slice(0, 30)
    .map(([key, item]) => [key, sanitizeAuditValue(item, depth + 1)]));
}

export async function writeAuditLog(app: FastifyInstance, req: FastifyRequest, input: {
  entityType: string;
  entityId: string;
  action: AuditAction;
  communityId?: string;
  before?: unknown;
  after?: unknown;
}, options: {
  store?: Prisma.TransactionClient;
  metaId?: string;
  required?: boolean;
} = {}) {
  try {
    const metaId = options.metaId ?? await req.getOrCreateRequestMetaId();
    const actorUserId = req.currentUser?.id;
    const actorRole = req.currentUser?.isSuperAdmin
      ? 'SUPER_ADMIN'
      : req.memberRole;
    const communityId = input.communityId ?? req.communityId ?? null;

    await (options.store ?? app.prisma).auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        communityId,
        actorUserId,
        actorRole,
        before: sanitizeAuditValue(input.before) as never,
        after: sanitizeAuditValue(input.after) as never,
        metaId
      }
    });
  } catch (error) {
    if (options.required) throw error;
    app.log.warn('Failed to write audit log');
  }
}
