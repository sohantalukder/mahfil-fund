import type { FastifyError, FastifyInstance } from 'fastify';
import { AppError } from '../shared/errors.js';
import { fail } from '../shared/http.js';
import { logError } from '../services/errorLogger.js';

/** Registers the single envelope-aware HTTP error boundary. */
export function registerErrorHandler(app: FastifyInstance) {
  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send(fail(
      { requestId: req.requestId ?? req.id, serverTime: new Date().toISOString() },
      { code: 'NOT_FOUND', message: 'Route not found' },
    ));
  });

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
          metadata: { method: req.method, path: req.url.split('?')[0], statusCode: err.statusCode },
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

    const isFastifyValidation = Array.isArray(err.validation);
    const statusCode = isFastifyValidation
      ? 422
      : typeof err.statusCode === 'number'
        ? err.statusCode
        : 500;
    if (statusCode >= 400 && statusCode < 500) {
      const isRateLimit = statusCode === 429;
      const isTooLarge = statusCode === 413;
      reply.status(statusCode).send(fail(meta, {
        code: isRateLimit
          ? 'RATE_LIMITED'
          : isTooLarge
            ? 'PAYLOAD_TOO_LARGE'
            : isFastifyValidation
              ? 'VALIDATION_FAILED'
              : 'BAD_REQUEST',
        message: isRateLimit
          ? 'Too many requests'
          : isTooLarge
            ? 'Request payload is too large'
            : isFastifyValidation
              ? 'Validation failed'
            : 'Invalid request',
      }));
      return;
    }

    // Unhandled errors - log as CRITICAL
    app.log.error({ requestId, errorName: err.name }, 'Unhandled error');

    logError(app, {
      level: 'CRITICAL',
      source: 'API',
      communityId: req.communityId,
      userId: req.currentUser?.id,
      requestId,
      routeName: req.routeOptions?.url,
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Unknown error',
      metadata: { method: req.method, path: req.url.split('?')[0] },
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
