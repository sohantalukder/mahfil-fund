import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { ok } from '../../shared/http.js';
import { parseWith } from '../../shared/validate.js';
import { Errors } from '../../shared/errors.js';
import { consumeRecoveryThrottle, createOtp, verifyOtp } from '../../services/otp.js';
import { sendOtpEmail } from '../../integrations/email.js';
import { hashPassword, verifyPassword, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '../../services/password.js';
import {
  signAccessToken, createRefreshToken, rotateRefreshToken, revokeRefreshToken,
  revokeAllUserTokens, signPasswordChangeChallenge, verifyPasswordChangeChallenge,
  securityEventContext,
} from '../../services/token.js';

const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(256) });
const EmailSchema = z.object({ email: z.string().email() });
const ResetPasswordSchema = z.object({
  email: z.string().email(), code: z.string().length(6), newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});
const RefreshSchema = z.object({ refreshToken: z.string().min(20).optional() });
const FirstLoginSchema = z.object({
  challengeToken: z.string().min(20), newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});
const UpdateProfileSchema = z.object({ fullName: z.string().min(2).max(120) });
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256), newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

const REFRESH_COOKIE = 'mf_refresh';
const CSRF_COOKIE = 'mf_csrf';

function isWeb(req: FastifyRequest) {
  return req.headers['x-client'] === 'web';
}

function setWebCookies(app: FastifyInstance, reply: FastifyReply, refreshToken: string) {
  const secure = app.env.NODE_ENV === 'production';
  const match = app.env.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)\s*(s|m|h|d)$/);
  const unitSeconds = { s: 1, m: 60, h: 3600, d: 86_400 } as const;
  const maxAge = match ? Number(match[1]) * unitSeconds[match[2] as keyof typeof unitSeconds] : 7 * 86_400;
  const common = { secure, sameSite: 'lax' as const, maxAge };
  reply.setCookie(REFRESH_COOKIE, refreshToken, { ...common, path: '/', httpOnly: true });
  reply.setCookie(CSRF_COOKIE, randomBytes(24).toString('base64url'), { ...common, path: '/', httpOnly: false });
}

function clearWebCookies(app: FastifyInstance, reply: FastifyReply) {
  const options = { secure: app.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
  reply.clearCookie(REFRESH_COOKIE, options);
  reply.clearCookie(CSRF_COOKIE, options);
}

function refreshFromRequest(req: FastifyRequest): string {
  const body = parseWith(RefreshSchema, req.body ?? {});
  if (body.refreshToken) return body.refreshToken;
  const token = req.cookies[REFRESH_COOKIE];
  const csrfCookie = req.cookies[CSRF_COOKIE];
  const csrfHeader = req.headers['x-csrf-token'];
  if (!token || !csrfCookie || csrfHeader !== csrfCookie) throw Errors.unauthorized('Invalid session request');
  return token;
}

async function issueTokenPair(app: FastifyInstance, userId: string, req: FastifyRequest) {
  const accessToken = await signAccessToken(
    userId, app.env.JWT_SECRET, app.env.JWT_EXPIRES_IN, app.env.JWT_ISSUER, app.env.JWT_AUDIENCE,
  );
  const refreshToken = await createRefreshToken(
    app, userId, app.env.JWT_REFRESH_EXPIRES_IN, undefined, tokenSecurityContext(req),
  );
  return { accessToken, refreshToken };
}

function tokenSecurityContext(req: FastifyRequest) {
  return {
    client: typeof req.headers['x-client'] === 'string' ? req.headers['x-client'] : undefined,
    deviceId: typeof req.headers['x-device-id'] === 'string' ? req.headers['x-device-id'] : undefined,
  };
}

function tokenResponse(req: FastifyRequest, reply: FastifyReply, app: FastifyInstance, tokens: { accessToken: string; refreshToken: string }) {
  if (isWeb(req)) {
    setWebCookies(app, reply, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }
  return tokens;
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/auth/login', { config: { rateLimit: { max: 8, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = parseWith(LoginSchema, req.body);
    const email = body.email.trim().toLowerCase();
    const user = await app.prisma.user.findFirst({ where: { email } });
    const passwordResult = user
      ? await verifyPassword(user.passwordHash, body.password)
      : { valid: false, needsRehash: false };
    if (!user || !passwordResult.valid) throw Errors.unauthorized('Invalid email or password');
    if (!user.isActive) throw Errors.forbidden('Account disabled');

    if (passwordResult.needsRehash) {
      await app.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.password) } });
    }
    if (user.mustChangePassword) {
      const challengeToken = await signPasswordChangeChallenge(
        user.id, app.env.JWT_SECRET, app.env.JWT_ISSUER, app.env.JWT_AUDIENCE,
      );
      return ok(
        { requiresPasswordChange: true, challengeToken },
        { serverTime: new Date().toISOString(), requestId: req.requestId },
      );
    }

    const tokens = await issueTokenPair(app, user.id, req);
    return ok({
      requiresPasswordChange: false,
      ...tokenResponse(req, reply, app, tokens),
      user: { id: user.id, email: user.email, fullName: user.fullName, isSuperAdmin: user.isSuperAdmin },
    }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.post('/auth/complete-first-login', { config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } }, async (req, reply) => {
    const body = parseWith(FirstLoginSchema, req.body);
    let userId: string;
    try {
      userId = await verifyPasswordChangeChallenge(
        body.challengeToken, app.env.JWT_SECRET, app.env.JWT_ISSUER, app.env.JWT_AUDIENCE,
      );
    } catch {
      throw Errors.unauthorized('Invalid or expired password-change challenge');
    }
    const passwordHash = await hashPassword(body.newPassword);
    const user = await app.prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } });
    if (!user?.isActive) throw Errors.unauthorized('Invalid password-change challenge');
    const claimed = await app.prisma.user.updateMany({
      where: { id: userId, isActive: true, mustChangePassword: true },
      data: { passwordHash, mustChangePassword: false },
    });
    if (claimed.count !== 1) throw Errors.unauthorized('Invalid password-change challenge');
    await revokeAllUserTokens(app, userId, tokenSecurityContext(req));
    const tokens = await issueTokenPair(app, userId, req);
    return ok(tokenResponse(req, reply, app, tokens), { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.post('/auth/forgot-password', { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (req) => {
    const { email: rawEmail } = parseWith(EmailSchema, req.body);
    const email = rawEmail.trim().toLowerCase();
    await Promise.all([
      consumeRecoveryThrottle(app, email, 'EMAIL', 5, 15 * 60_000),
      consumeRecoveryThrottle(app, req.ip, 'IP', 20, 15 * 60_000),
    ]);
    const user = await app.prisma.user.findFirst({ where: { email } });
    const code = await createOtp(app, email, 'PASSWORD_RESET', app.env.OTP_EXPIRY_MINUTES);
    if (user?.isActive) {
      void sendOtpEmail(email, code, 'PASSWORD_RESET', app.env.MAIL_FROM)
        .catch(() => app.log.error({ requestId: req.requestId }, 'Password recovery email failed'));
    }
    return ok({ message: 'If that email is registered, a reset code has been sent.' }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.post('/auth/reset-password', { config: { rateLimit: { max: 8, timeWindow: '15 minutes' } } }, async (req) => {
    const body = parseWith(ResetPasswordSchema, req.body);
    const email = body.email.toLowerCase();
    const passwordHash = await hashPassword(body.newPassword);
    await app.prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({ where: { email } });
      const result = await verifyOtp(app, email, body.code, 'PASSWORD_RESET', tx);
      if (!user?.isActive || !result.valid) throw Errors.badRequest('Invalid or expired reset code');
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false },
      });
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() },
      });
      await tx.securityEvent.create({ data: {
        type: 'ACCOUNT_TOKENS_REVOKED', userId: user.id,
        ...securityEventContext(app, tokenSecurityContext(req)),
      } });
    });
    return ok({ message: 'Password reset successfully' }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.post('/auth/refresh', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req, reply) => {
    const raw = refreshFromRequest(req);
    const result = await rotateRefreshToken(app, raw, app.env.JWT_REFRESH_EXPIRES_IN, tokenSecurityContext(req));
    if (!result) {
      clearWebCookies(app, reply);
      throw Errors.unauthorized('Invalid or expired refresh token');
    }
    const user = await app.prisma.user.findUnique({ where: { id: result.userId } });
    if (!user?.isActive || user.mustChangePassword) {
      await revokeAllUserTokens(app, result.userId, tokenSecurityContext(req));
      clearWebCookies(app, reply);
      throw Errors.unauthorized('Session is no longer valid');
    }
    const accessToken = await signAccessToken(
      user.id, app.env.JWT_SECRET, app.env.JWT_EXPIRES_IN, app.env.JWT_ISSUER, app.env.JWT_AUDIENCE,
    );
    return ok(tokenResponse(req, reply, app, { accessToken, refreshToken: result.newRawToken }), { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.post('/auth/logout', async (req, reply) => {
    const raw = refreshFromRequest(req);
    await revokeRefreshToken(app, raw, tokenSecurityContext(req));
    clearWebCookies(app, reply);
    return ok({ message: 'Logged out successfully' }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.patch('/me/profile', { preHandler: async (req) => app.requireAuth(req) }, async (req) => {
    const body = parseWith(UpdateProfileSchema, req.body);
    const updated = await app.prisma.user.update({ where: { id: req.currentUser!.id }, data: { fullName: body.fullName } });
    return ok({ user: { id: updated.id, email: updated.email, fullName: updated.fullName, createdAt: updated.createdAt } }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });

  app.patch('/me/password', { preHandler: async (req) => app.requireAuth(req) }, async (req, reply) => {
    const body = parseWith(ChangePasswordSchema, req.body);
    const user = await app.prisma.user.findUniqueOrThrow({ where: { id: req.currentUser!.id } });
    if (!(await verifyPassword(user.passwordHash, body.currentPassword)).valid) throw Errors.unauthorized('Current password is incorrect');
    await app.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.newPassword) } });
    await revokeAllUserTokens(app, user.id, tokenSecurityContext(req));
    const tokens = await issueTokenPair(app, user.id, req);
    return ok({ message: 'Password changed successfully', ...tokenResponse(req, reply, app, tokens) }, { serverTime: new Date().toISOString(), requestId: req.requestId });
  });
}
