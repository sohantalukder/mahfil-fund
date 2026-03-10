import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { nowIso } from '@mahfil/utils';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
  }
}

export const requestContextPlugin: FastifyPluginAsync = fp(async (app) => {
  app.addHook('onRequest', async (req, reply) => {
    req.requestId = req.id;
    reply.header('X-Request-Id', req.id);
    reply.header('X-Server-Time', nowIso());
  });
});

