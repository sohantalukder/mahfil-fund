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
        message: input.message,
        stackTrace: input.stackTrace ?? null,
        metadata: (input.metadata ?? {}) as never,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null
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
    stackTrace: err.stack,
    metadata: { method: req.method, url: req.url },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
}
