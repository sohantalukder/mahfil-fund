import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import crypto from 'node:crypto';
import { Errors } from '../shared/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    idempotencyKey?: string;
  }
}

function hashBody(body: unknown): string {
  const raw = body === undefined ? '' : JSON.stringify(body);
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export const idempotencyPlugin: FastifyPluginAsync = fp(async (app) => {
  app.addHook('onRequest', async (req, reply) => {
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || key.length < 8) return;
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return;

    req.idempotencyKey = key;
    const requestHash = hashBody(req.body);

    const existing = await app.prisma.idempotencyKey.findUnique({ where: { key } });
    if (!existing) return;

    if (existing.requestHash && existing.requestHash !== requestHash) {
      throw Errors.conflict('Idempotency-Key reuse with different payload');
    }

    if (existing.statusCode && existing.responseBody) {
      reply.status(existing.statusCode).send(existing.responseBody);
      return reply;
    }
  });

  app.addHook('onSend', async (req, reply, payload) => {
    const key = req.idempotencyKey;
    if (!key) return payload;
    if (reply.sent) return payload;

    // Store only JSON responses
    const ct = reply.getHeader('content-type');
    if (typeof ct === 'string' && !ct.includes('application/json')) return payload;

    const requestHash = hashBody(req.body);
    const statusCode = reply.statusCode;

    let responseBody: unknown = undefined;
    try {
      responseBody = typeof payload === 'string' ? JSON.parse(payload) : payload;
    } catch {
      responseBody = undefined;
    }

    await app.prisma.idempotencyKey.upsert({
      where: { key },
      create: {
        key,
        userId: req.currentUser?.id,
        method: req.method,
        path: req.url,
        requestHash,
        statusCode,
        responseBody: responseBody as any,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
      },
      update: {
        userId: req.currentUser?.id,
        method: req.method,
        path: req.url,
        requestHash,
        statusCode,
        responseBody: responseBody as any
      }
    });

    return payload;
  });
});

