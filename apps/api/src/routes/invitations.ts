import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { Errors } from '../shared/errors.js';
import { writeAuditLog } from '../shared/audit.js';
import { generateInviteCode, normalizeInviteCode } from '../services/inviteCode.js';
import { logError } from '../services/errorLogger.js';
import { signAccessToken, createRefreshToken } from '../services/token.js';

const INVITE_EXPIRY_DAYS = 7;
const MAX_VERIFICATION_ATTEMPTS = 5;
const SALT_ROUNDS = 12;

const CreateInvitationSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  phoneNumber: z.string().max(20).optional(),
  role: z.enum(['admin', 'collector', 'viewer']),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(INVITE_EXPIRY_DAYS),
  note: z.string().max(300).optional()
});

const VerifyInvitationSchema = z.object({
  email: z.string().email(),
  inviteCode: z.string().min(16).max(19), // with or without spaces
  fullName: z.string().min(2).max(120).optional(),
  password: z.string().min(8).max(72).optional()
});

export async function registerInvitationRoutes(app: FastifyInstance) {
  // Create invitation for a community
  app.post(
    '/communities/:communityId/invitations',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      const params = parseWith(z.object({ communityId: z.string().uuid() }), req.params);

      if (req.memberRole !== 'super_admin' && req.memberRole !== 'admin') {
        throw Errors.forbidden('Only admins can create invitations');
      }

      const body = parseWith(CreateInvitationSchema, req.body);
      const { display, normalized } = generateInviteCode();

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (body.expiresInDays ?? INVITE_EXPIRY_DAYS));

      // Check for duplicate pending invite for same email+community
      const existingPending = await app.prisma.communityInvitation.findFirst({
        where: {
          communityId: params.communityId,
          email: body.email.toLowerCase(),
          status: 'PENDING',
          expiresAt: { gt: new Date() }
        }
      });

      if (existingPending) {
        throw Errors.conflict('A pending invitation already exists for this email. Cancel it first or wait for it to expire.');
      }

      const invitation = await app.prisma.communityInvitation.create({
        data: {
          communityId: params.communityId,
          email: body.email.toLowerCase(),
          fullName: body.fullName,
          phoneNumber: body.phoneNumber ?? null,
          role: body.role,
          inviteCode: display,
          inviteCodeNormalized: normalized,
          createdByUserId: req.currentUser!.id,
          sentByUserId: req.currentUser!.id,
          status: 'PENDING',
          expiresAt,
          note: body.note ?? null
        }
      });

      await writeAuditLog(app, req, {
        entityType: 'community_invitation',
        entityId: invitation.id,
        communityId: params.communityId,
        action: 'CREATE',
        after: { ...invitation, inviteCodeNormalized: '[REDACTED]', inviteCode: '[REDACTED]' }
      });

      return ok(
        {
          invitation: {
            id: invitation.id,
            email: invitation.email,
            fullName: invitation.fullName,
            role: invitation.role,
            status: invitation.status,
            expiresAt: invitation.expiresAt,
            inviteCode: display, // Show display format to admin
            createdAt: invitation.createdAt
          }
        },
        { serverTime: new Date().toISOString(), requestId: req.requestId }
      );
    }
  );

  // List invitations for a community
  app.get(
    '/communities/:communityId/invitations',
    { preHandler: async (req) => app.requireCommunity(req) },
    async (req) => {
      const params = parseWith(z.object({ communityId: z.string().uuid() }), req.params);

      if (req.memberRole !== 'super_admin' && req.memberRole !== 'admin') {
        throw Errors.forbidden('Only admins can view invitations');
      }

      const query = parseWith(
        z.object({
          status: z.enum(['PENDING', 'USED', 'EXPIRED', 'CANCELLED']).optional(),
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(25)
        }),
        req.query
      );

      const now = new Date();
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 25;

      // Auto-expire invitations in the response (soft check)
      await app.prisma.communityInvitation.updateMany({
        where: { communityId: params.communityId, status: 'PENDING', expiresAt: { lt: now } },
        data: { status: 'EXPIRED' }
      });

      const where = {
        communityId: params.communityId,
        ...(query.status ? { status: query.status as never } : {})
      };

      const [invitations, total] = await Promise.all([
        app.prisma.communityInvitation.findMany({
          where,
          select: {
            id: true,
            email: true,
            fullName: true,
            phoneNumber: true,
            role: true,
            status: true,
            expiresAt: true,
            usedAt: true,
            note: true,
            createdAt: true,
            createdBy: { select: { fullName: true, email: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        app.prisma.communityInvitation.count({ where })
      ]);

      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      return ok(
        { invitations, page, pageSize, total, totalPages },
        { serverTime: new Date().toISOString(), requestId: req.requestId, pagination: { page: page as number, pageSize: pageSize as number, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } }
      );
    }
  );

  // Resend invitation (re-generate code)
  app.post(
    '/invitations/:id/resend',
    { preHandler: [async (req) => app.requireAuth(req)] },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);

      const invitation = await app.prisma.communityInvitation.findUnique({
        where: { id: params.id },
        include: { community: true }
      });

      if (!invitation) throw Errors.notFound('Invitation not found');
      if (invitation.status !== 'PENDING') throw Errors.badRequest('Only pending invitations can be resent');

      // Verify caller is admin of that community
      const membership = await app.prisma.communityMembership.findUnique({
        where: { userId_communityId: { userId: req.currentUser!.id, communityId: invitation.communityId } }
      });

      if (!membership || (membership.role !== 'admin' && !req.currentUser!.roles.includes('super_admin'))) {
        throw Errors.forbidden('Only admins can resend invitations');
      }

      const { display, normalized } = generateInviteCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

      const updated = await app.prisma.communityInvitation.update({
        where: { id: params.id },
        data: {
          inviteCode: display,
          inviteCodeNormalized: normalized,
          expiresAt,
          sentByUserId: req.currentUser!.id,
          verificationAttempts: 0
        }
      });

      await writeAuditLog(app, req, {
        entityType: 'community_invitation',
        entityId: updated.id,
        communityId: invitation.communityId,
        action: 'UPDATE',
        after: { action: 'RESENT', email: updated.email }
      });

      return ok(
        { invitation: { id: updated.id, inviteCode: display, expiresAt: updated.expiresAt } },
        { serverTime: new Date().toISOString(), requestId: req.requestId }
      );
    }
  );

  // Cancel invitation
  app.post(
    '/invitations/:id/cancel',
    { preHandler: [async (req) => app.requireAuth(req)] },
    async (req) => {
      const params = parseWith(z.object({ id: z.string().uuid() }), req.params);

      const invitation = await app.prisma.communityInvitation.findUnique({ where: { id: params.id } });
      if (!invitation) throw Errors.notFound('Invitation not found');
      if (invitation.status !== 'PENDING') throw Errors.badRequest('Only pending invitations can be cancelled');

      const membership = await app.prisma.communityMembership.findUnique({
        where: { userId_communityId: { userId: req.currentUser!.id, communityId: invitation.communityId } }
      });

      if (!membership || (membership.role !== 'admin' && !req.currentUser!.roles.includes('super_admin'))) {
        throw Errors.forbidden('Only admins can cancel invitations');
      }

      const updated = await app.prisma.communityInvitation.update({
        where: { id: params.id },
        data: { status: 'CANCELLED' }
      });

      await writeAuditLog(app, req, {
        entityType: 'community_invitation',
        entityId: updated.id,
        communityId: invitation.communityId,
        action: 'UPDATE',
        after: { action: 'CANCELLED', email: updated.email }
      });

      return ok({ message: 'Invitation cancelled' }, { serverTime: new Date().toISOString(), requestId: req.requestId });
    }
  );

  // Verify invitation and join community (public endpoint)
  app.post('/invitations/verify', async (req) => {
    const body = parseWith(VerifyInvitationSchema, req.body);
    const normalizedCode = normalizeInviteCode(body.inviteCode);
    const email = body.email.toLowerCase();

    // Find invitation by normalized code
    const invitation = await app.prisma.communityInvitation.findUnique({
      where: { inviteCodeNormalized: normalizedCode },
      include: { community: { select: { id: true, name: true, slug: true, status: true } } }
    });

    // Rate limiting: check attempts (generic error for security)
    if (!invitation) {
      await logError(app, {
        level: 'WARNING',
        source: 'API',
        message: 'Invalid invite code attempt',
        errorCode: 'INVALID_INVITE_CODE',
        metadata: { email, normalizedCode: normalizedCode.slice(0, 4) + '****' }
      });
      throw Errors.badRequest('Invalid invitation code or email');
    }

    // Increment attempt counter
    await app.prisma.communityInvitation.update({
      where: { id: invitation.id },
      data: { verificationAttempts: { increment: 1 } }
    });

    if (invitation.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      throw Errors.badRequest('Too many attempts. This invitation has been locked.');
    }

    if (invitation.email !== email) {
      throw Errors.badRequest('Invalid invitation code or email');
    }

    if (invitation.status !== 'PENDING') {
      throw Errors.badRequest(`This invitation is ${invitation.status.toLowerCase()}.`);
    }

    if (new Date() > invitation.expiresAt) {
      await app.prisma.communityInvitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED' } });
      throw Errors.badRequest('This invitation has expired.');
    }

    if (invitation.community.status !== 'ACTIVE') {
      throw Errors.badRequest('This community is not active.');
    }

    // Find or create user
    let user = await app.prisma.user.findUnique({ where: { email } });

    if (!user) {
      if (!body.password) {
        return ok(
          { requiresRegistration: true, message: 'Please provide a password to create your account.' },
          { serverTime: new Date().toISOString(), requestId: req.requestId }
        );
      }

      const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
      user = await app.prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName: body.fullName ?? invitation.fullName,
          emailVerified: true,
          isActive: true
        }
      });

      // Assign the platform role matching the invitation role
      const role = await app.prisma.role.findUnique({ where: { name: invitation.role } });
      if (role) {
        await app.prisma.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: role.id } },
          update: {},
          create: { userId: user.id, roleId: role.id }
        });
      }
    }

    // Create or update membership
    await app.prisma.communityMembership.upsert({
      where: { userId_communityId: { userId: user.id, communityId: invitation.communityId } },
      update: { role: invitation.role, status: 'ACTIVE', invitedByUserId: invitation.createdByUserId },
      create: {
        userId: user.id,
        communityId: invitation.communityId,
        role: invitation.role,
        status: 'ACTIVE',
        invitedByUserId: invitation.createdByUserId
      }
    });

    // Mark invitation as used
    await app.prisma.communityInvitation.update({
      where: { id: invitation.id },
      data: { status: 'USED', usedAt: new Date(), usedByUserId: user.id }
    });

    await writeAuditLog(app, req, {
      entityType: 'community_invitation',
      entityId: invitation.id,
      communityId: invitation.communityId,
      action: 'UPDATE',
      after: { action: 'USED', userId: user.id, email }
    });

    // Issue tokens
    const accessToken = await signAccessToken(user.id, app.env.JWT_SECRET, app.env.JWT_EXPIRES_IN);
    const refreshToken = await createRefreshToken(app, user.id, app.env.JWT_REFRESH_EXPIRES_IN);

    return ok(
      {
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, fullName: user.fullName },
        community: invitation.community,
        role: invitation.role
      },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });
}
