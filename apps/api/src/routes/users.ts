import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { requireRoles } from '../plugins/rbac.js';
import { Errors } from '../shared/errors.js';
import type { UserRoleName } from '@prisma/client';

const VALID_ROLES: UserRoleName[] = ['super_admin', 'admin', 'collector', 'viewer'];

export async function registerUserRoutes(app: FastifyInstance) {
  // List all users with their roles (admin+)
  app.get('/users', { preHandler: [requireRoles(app, ['super_admin', 'admin'])] }, async (req) => {
    const users = await app.prisma.user.findMany({
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const result = users.map((u) => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      fullName: u.fullName,
      isActive: u.isActive,
      emailVerified: u.emailVerified,
      roles: u.roles.map((ur) => ur.role.name),
      createdAt: u.createdAt,
    }));

    return ok({ users: result }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  // Update a user's roles (super_admin only)
  app.patch(
    '/users/:id/roles',
    { preHandler: [requireRoles(app, ['super_admin'])] },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
      const body = parseWith(
        z.object({ roles: z.array(z.enum(['super_admin', 'admin', 'collector', 'viewer'])).min(0) }),
        req.body
      );

      const user = await app.prisma.user.findUnique({ where: { id: params.id } });
      if (!user) throw Errors.notFound('User not found');

      // Resolve role IDs
      const roles = await app.prisma.role.findMany({
        where: { name: { in: body.roles as UserRoleName[] } },
      });

      if (roles.length !== body.roles.length) {
        throw Errors.badRequest('One or more invalid role names');
      }

      // Replace all roles: delete existing, create new
      await app.prisma.$transaction([
        app.prisma.userRole.deleteMany({ where: { userId: params.id } }),
        ...roles.map((role) =>
          app.prisma.userRole.create({ data: { userId: params.id, roleId: role.id } })
        ),
      ]);

      const updated = await app.prisma.user.findUnique({
        where: { id: params.id },
        include: { roles: { include: { role: true } } },
      });

      return ok(
        {
          user: {
            id: updated!.id,
            email: updated!.email,
            isActive: updated!.isActive,
            roles: updated!.roles.map((ur) => ur.role.name),
          },
        },
        { serverTime: new Date().toISOString(), requestId: req.requestId }
      );
    }
  );

  // Toggle user active status (super_admin only)
  app.patch(
    '/users/:id/status',
    { preHandler: [requireRoles(app, ['super_admin'])] },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);
      const body = parseWith(z.object({ isActive: z.boolean() }), req.body);

      const user = await app.prisma.user.findUnique({ where: { id: params.id } });
      if (!user) throw Errors.notFound('User not found');

      // Prevent self-deactivation
      if (user.id === req.currentUser?.id && !body.isActive) {
        throw Errors.badRequest('You cannot deactivate your own account');
      }

      const updated = await app.prisma.user.update({
        where: { id: params.id },
        data: { isActive: body.isActive },
      });

      return ok(
        { user: { id: updated.id, isActive: updated.isActive } },
        { serverTime: new Date().toISOString(), requestId: req.requestId }
      );
    }
  );
}

// Keep VALID_ROLES exported for potential use
export { VALID_ROLES };
