import type { FastifyError, FastifyInstance } from 'fastify';
import { AppError } from '../shared/errors.js';
import { fail } from '../shared/http.js';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError | AppError, req, reply) => {
    const requestId = req.requestId ?? req.id;
    const meta = { requestId, serverTime: new Date().toISOString() };

    if (err instanceof AppError) {
      reply.status(err.statusCode).send(
        fail(meta, {
          code: err.code,
          message: err.message,
          details: err.details
        })
      );
      return;
    }

    // Zod errors can bubble through as "Error" with properties; we keep it simple here.
    app.log.error({ err, requestId }, 'Unhandled error');
    reply.status(500).send(
      fail(meta, {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
      })
    );
  });
}

