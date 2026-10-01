import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { Errors } from '../shared/errors.js';

declare module 'fastify' {
  interface FastifyInstance {
    runIdempotentMutation: <T>(
      req: FastifyRequest,
      mutation: (store?: Prisma.TransactionClient) => Promise<T>,
    ) => Promise<T>;
  }
}

export function canonicalJson(value: unknown): string {
  if (value === undefined) return '';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, item]) => `${JSON.stringify(name)}:${canonicalJson(item)}`)
    .join(',')}}`;
}

function hashBody(body: unknown) {
  return crypto.createHash('sha256').update(canonicalJson(body)).digest('hex');
}

function canonicalPath(req: FastifyRequest) {
  return req.routeOptions.url || req.url.split('?')[0] || '/';
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export const idempotencyPlugin: FastifyPluginAsync = fp(async (app) => {
  app.decorate('runIdempotentMutation', async <T>(
    req: FastifyRequest,
    mutation: (store?: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> => {
    const key = req.headers['idempotency-key'];
    if (key === undefined) return mutation();
    if (typeof key !== 'string' || key.length < 16 || key.length > 128) {
      throw Errors.badRequest('Idempotency-Key must contain 16 to 128 characters');
    }
    if (!req.currentUser || !req.communityId) {
      throw Errors.internal('Idempotency wrapper ordering is invalid');
    }

    const scope = {
      userId: req.currentUser.id,
      communityId: req.communityId,
      method: req.method,
      path: canonicalPath(req),
      key,
    };
    const uniqueScope = { userId_communityId_method_path_key: scope };
    const requestHash = hashBody(req.body);

    const replay = async (): Promise<T | null> => {
      const existing = await app.prisma.idempotencyKey.findUnique({ where: uniqueScope });
      if (!existing) return null;
      if (existing.requestHash !== requestHash) {
        throw Errors.conflict('Idempotency-Key was already used with a different payload');
      }
      if (existing.status === 'COMPLETED' && existing.responseBody !== null) {
        return existing.responseBody as T;
      }
      throw Errors.conflict('An identical request is already in progress');
    };

    try {
      return await app.prisma.$transaction(async (store) => {
        const existing = await store.idempotencyKey.findUnique({ where: uniqueScope });
        if (existing) {
          if (existing.expiresAt && existing.expiresAt <= new Date()) {
            await store.idempotencyKey.delete({ where: { id: existing.id } });
          } else if (existing.requestHash !== requestHash) {
            throw Errors.conflict('Idempotency-Key was already used with a different payload');
          } else if (existing.status === 'COMPLETED' && existing.responseBody !== null) {
            return existing.responseBody as T;
          } else {
            throw Errors.conflict('An identical request is already in progress');
          }
        }

        const reservation = await store.idempotencyKey.create({ data: {
          ...scope,
          requestHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        } });
        const result = await mutation(store);
        await store.idempotencyKey.update({
          where: { id: reservation.id },
          data: { status: 'COMPLETED', statusCode: 200, responseBody: jsonValue(result) },
        });
        return result;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const stored = await replay();
        if (stored !== null) return stored;
      }
      throw error;
    }
  });
});
