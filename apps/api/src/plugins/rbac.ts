import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { UserRoleName } from '@prisma/client';
import { Errors } from '../shared/errors.js';

export function requireRoles(app: FastifyInstance, roles: UserRoleName[]) {
  return async function (req: FastifyRequest) {
    const user = await app.requireAuth(req);
    const has = user.roles.some((r) => roles.includes(r));
    if (!has) throw Errors.forbidden();
  };
}

