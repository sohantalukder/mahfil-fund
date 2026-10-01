import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ErrorLevel, ErrorSource } from '@prisma/client';

export interface LogErrorInput {
  level: ErrorLevel;
  source: ErrorSource;
  communityId?: string;
  userId?: string;
  requestId?: string;
  routeName?: string;
  actionName?: string;
  errorCode?: string;
  message: string;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export function sanitizeLogMessage(message: string): string {
  return message
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]{20,}(?:\.[A-Za-z0-9_-]{10,}){1,2}\b/g, '[redacted-token]')
    .replace(/\b(password|otp|secret|token|authorization|cookie)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .slice(0, 1000);
}

const blockedMetadataKey = /authorization|cookie|token|secret|password|otp|hash|body|stack/i;

export function sanitizeLogMetadata(input: Record<string, unknown>): Record<string, string | number | boolean | null> {
  return Object.fromEntries(Object.entries(input)
    .filter(([key]) => !blockedMetadataKey.test(key))
    .slice(0, 20)
    .map(([key, value]) => [key, value === null || ['string', 'number', 'boolean'].includes(typeof value)
      ? (typeof value === 'string' ? value.slice(0, 300) : value) as string | number | boolean | null
      : '[filtered]']));
}

export async function logError(app: FastifyInstance, input: LogErrorInput): Promise<void> {
  try {
    await app.prisma.errorLog.create({
      data: {
        level: input.level,
        source: input.source,
        communityId: input.communityId ?? null,
        userId: input.userId ?? null,
        requestId: input.requestId ?? null,
        routeName: input.routeName ?? null,
        actionName: input.actionName ?? null,
        errorCode: input.errorCode ?? null,
        message: sanitizeLogMessage(input.message),
        stackTrace: null,
        metadata: sanitizeLogMetadata(input.metadata ?? {}) as never,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent?.slice(0, 500) ?? null
      }
    });
  } catch {
    // Never throw from error logger - just log to console
    app.log.error('Failed to write error log to DB');
  }
}

export function logErrorFromRequest(
  app: FastifyInstance,
  req: FastifyRequest,
  err: Error,
  options: {
    source: ErrorSource;
    level?: ErrorLevel;
    actionName?: string;
    errorCode?: string;
    communityId?: string;
  }
): void {
  logError(app, {
    level: options.level ?? 'ERROR',
    source: options.source,
    communityId: options.communityId ?? req.communityId,
    userId: req.currentUser?.id,
    requestId: req.requestId,
    routeName: req.routeOptions?.url,
    actionName: options.actionName,
    errorCode: options.errorCode,
    message: err.message,
    metadata: { method: req.method, path: req.url.split('?')[0] },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
}
