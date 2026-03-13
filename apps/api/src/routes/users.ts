import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { requireRoles } from '../plugins/rbac.js';
import { Errors } from '../shared/errors.js';
import { writeAuditLog } from '../shared/audit.js';
import type { UserRoleName } from '@prisma/client';
import { revokeAllUserTokens } from '../services/token.js';
import bcrypt from 'bcrypt';

const VALID_ROLES: UserRoleName[] = ['super_admin', 'admin', 'collector', 'viewer'];
const SALT_ROUNDS = 12;

function deriveNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  return local
    .replace(/[._-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'User';
}

export async function registerUserRoutes(app: FastifyInstance) {
  app.post('/users', { preHandler: [requireRoles(app, ['super_admin', 'admin'])] }, async (req) => {
    const body = parseWith(
      z.object({
        email: z.string().email(),
        password: z.string().min(8).max(72),
        fullName: z.string().min(2).max(120).optional(),
        roles: z.array(z.enum(['super_admin', 'admin', 'collector', 'viewer'])).min(1).optional()
      }),
      req.body
    );

    const email = body.email.toLowerCase();
    const fullName = body.fullName?.trim() || deriveNameFromEmail(email);
    const requestedRoles = Array.from(new Set((body.roles ?? ['viewer']) as UserRoleName[]));
    if (requestedRoles.includes('super_admin') && !req.currentUser?.roles.includes('super_admin')) {
      throw Errors.forbidden('Only super_admin can assign super_admin role');
    }

    const existing = await app.prisma.user.findUnique({ where: { email } });
    if (existing) throw Errors.conflict('Email already registered');

    const roles = await app.prisma.role.findMany({ where: { name: { in: requestedRoles } } });
    if (roles.length !== requestedRoles.length) {
      throw Errors.badRequest('One or more invalid role names');
    }

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);

    const created = await app.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          emailVerified: true
        }
      });

      for (const role of roles) {
        await tx.userRole.create({ data: { userId: user.id, roleId: role.id } });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { roles: { include: { role: true } } }
      });
    });

    await writeAuditLog(app, req, {
      entityType: 'user',
      entityId: created.id,
      action: 'CREATE',
      after: {
        id: created.id,
        email: created.email,
        fullName: created.fullName,
        isActive: created.isActive,
        roles: created.roles.map((ur) => ur.role.name),
      },
    });

    return ok(
      {
        user: {
          id: created.id,
          email: created.email,
          fullName: created.fullName,
          isActive: created.isActive,
          emailVerified: created.emailVerified,
          roles: created.roles.map((ur) => ur.role.name),
          createdAt: created.createdAt
        }
      },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });

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
      const existingRoles = await app.prisma.userRole.findMany({
        where: { userId: params.id },
        include: { role: true },
      });

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

      await writeAuditLog(app, req, {
        entityType: 'user',
        entityId: params.id,
        action: 'UPDATE',
        before: {
          roles: existingRoles.map((ur) => ur.role.name),
        },
        after: {
          roles: updated!.roles.map((ur) => ur.role.name),
          email: updated!.email,
          fullName: updated!.fullName,
          isActive: updated!.isActive,
        },
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

      await writeAuditLog(app, req, {
        entityType: 'user',
        entityId: params.id,
        action: 'UPDATE',
        before: { isActive: user.isActive, email: user.email, fullName: user.fullName },
        after: { isActive: updated.isActive, email: updated.email, fullName: updated.fullName },
      });

      if (!body.isActive) {
        await revokeAllUserTokens(app, updated.id);
      }

      return ok(
        { user: { id: updated.id, isActive: updated.isActive } },
        { serverTime: new Date().toISOString(), requestId: req.requestId }
      );
    }
  );
}

// Keep VALID_ROLES exported for potential use
export { VALID_ROLES };
