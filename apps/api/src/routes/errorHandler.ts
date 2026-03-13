import type { FastifyError, FastifyInstance } from 'fastify';
import { AppError } from '../shared/errors.js';
import { fail } from '../shared/http.js';
import { logError } from '../services/errorLogger.js';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError | AppError, req, reply) => {
    const requestId = req.requestId ?? req.id;
    const meta = { requestId, serverTime: new Date().toISOString() };

    if (err instanceof AppError) {
      // Log 5xx-level app errors; skip 4xx client errors
      if (err.statusCode >= 500) {
        logError(app, {
          level: 'ERROR',
          source: 'API',
          communityId: req.communityId,
          userId: req.currentUser?.id,
          requestId,
          routeName: req.routeOptions?.url,
          errorCode: err.code,
          message: err.message,
          stackTrace: err.stack,
          metadata: { method: req.method, url: req.url, statusCode: err.statusCode },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
      }

      reply.status(err.statusCode).send(
        fail(meta, {
          code: err.code,
          message: err.message,
          details: err.details
        })
      );
      return;
    }

    // Unhandled errors - log as CRITICAL
    app.log.error({ err, requestId }, 'Unhandled error');

    logError(app, {
      level: 'CRITICAL',
      source: 'API',
      communityId: req.communityId,
      userId: req.currentUser?.id,
      requestId,
      routeName: req.routeOptions?.url,
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Unknown error',
      stackTrace: err.stack,
      metadata: { method: req.method, url: req.url },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    reply.status(500).send(
      fail(meta, {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
      })
    );
  });
}
