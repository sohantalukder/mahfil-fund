import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Errors } from '../shared/errors.js';

export function requireSuperAdmin(app: FastifyInstance) {
  return async function (req: FastifyRequest) {
    const user = await app.requireAuth(req);
    if (!user.isSuperAdmin) throw Errors.forbidden('Super administrator access required');
  };
}
