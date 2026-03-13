import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { ok } from '../shared/http.js';
import { parseWith } from '../shared/validate.js';
import { Errors } from '../shared/errors.js';
import { createOtp, verifyOtp } from '../services/otp.js';
import { sendOtpEmail } from '../services/mail.js';
import {
  signAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} from '../services/token.js';

const SALT_ROUNDS = 12;
const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$.{53}$/;

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  fullName: z.string().min(2).max(120).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const VerifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const ResendOtpSchema = z.object({
  email: z.string().email(),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

const ResetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8).max(72),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});
const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(120)
});
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72)
});

async function issueTokenPair(app: FastifyInstance, userId: string) {
  const accessToken = await signAccessToken(userId, app.env.JWT_SECRET, app.env.JWT_EXPIRES_IN);
  const refreshToken = await createRefreshToken(app, userId, app.env.JWT_REFRESH_EXPIRES_IN);
  return { accessToken, refreshToken };
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (req) => {
    const body = parseWith(RegisterSchema, req.body);

    const existing = await app.prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (existing) throw Errors.conflict('Email already registered');

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);

    await app.prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash,
        fullName: body.fullName,
      },
    });

    const code = await createOtp(
      app,
      body.email.toLowerCase(),
      'EMAIL_VERIFICATION',
      app.env.OTP_EXPIRY_MINUTES
    );

    await sendOtpEmail(body.email.toLowerCase(), code, 'EMAIL_VERIFICATION', app.env.MAIL_FROM);

    return ok(
      { message: 'Registration successful. Check your email for the verification code.' },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });

  app.post('/auth/verify-email', async (req) => {
    const body = parseWith(VerifyEmailSchema, req.body);
    const email = body.email.toLowerCase();

    const user = await app.prisma.user.findUnique({ where: { email } });
    if (!user) throw Errors.notFound('User not found');
    if (user.emailVerified) throw Errors.badRequest('Email already verified');

    const result = await verifyOtp(app, email, body.code, 'EMAIL_VERIFICATION');
    if (!result.valid) throw Errors.badRequest(result.reason ?? 'Invalid OTP');

    await app.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    const tokens = await issueTokenPair(app, user.id);

    return ok(
      { message: 'Email verified successfully', ...tokens },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });

  app.post('/auth/resend-otp', async (req) => {
    const body = parseWith(ResendOtpSchema, req.body);
    const email = body.email.toLowerCase();

    const user = await app.prisma.user.findUnique({ where: { email } });
    if (!user) throw Errors.notFound('User not found');
    if (user.emailVerified) throw Errors.badRequest('Email already verified');

    const code = await createOtp(app, email, 'EMAIL_VERIFICATION', app.env.OTP_EXPIRY_MINUTES);
    await sendOtpEmail(email, code, 'EMAIL_VERIFICATION', app.env.MAIL_FROM);

    return ok(
      { message: 'Verification code sent' },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });

  app.post('/auth/login', async (req) => {
    const body = parseWith(LoginSchema, req.body);
    const email = body.email.toLowerCase();

    const user = await app.prisma.user.findUnique({ where: { email } });
    if (!user) throw Errors.unauthorized('Invalid email or password');

    const passwordHash = user.passwordHash;
    let valid = false;
    const isBcryptHash = BCRYPT_HASH_REGEX.test(passwordHash);

    if (isBcryptHash) {
      valid = await bcrypt.compare(body.password, passwordHash);
    } else {
      const seedEmail = app.env.SEED_ADMIN_EMAIL?.toLowerCase();
      const seedPassword = app.env.SEED_ADMIN_PASSWORD;
      const isSeedAdmin =
        seedEmail &&
        seedPassword &&
        user.email.toLowerCase() === seedEmail &&
        body.password === seedPassword;

      // Legacy fallback: accept plaintext once, then migrate immediately to bcrypt.
      valid = body.password === passwordHash || !!isSeedAdmin;
      if (valid) {
        const migratedHash = await bcrypt.hash(body.password, SALT_ROUNDS);
        await app.prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: migratedHash }
        });
      }
    }
    if (!valid) throw Errors.unauthorized('Invalid email or password');

    if (!user.emailVerified) {
      throw Errors.forbidden('Email not verified. Please verify your email first.');
    }

    if (!user.isActive) {
      throw Errors.forbidden('Account disabled');
    }

    const tokens = await issueTokenPair(app, user.id);

    const userRoles = await app.prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });

    return ok(
      {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          roles: userRoles.map((ur: { role: { name: string } }) => ur.role.name),
        },
      },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });

  app.post('/auth/forgot-password', async (req) => {
    const body = parseWith(ForgotPasswordSchema, req.body);
    const email = body.email.toLowerCase();

    const user = await app.prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (user) {
      const code = await createOtp(app, email, 'PASSWORD_RESET', app.env.OTP_EXPIRY_MINUTES);
      await sendOtpEmail(email, code, 'PASSWORD_RESET', app.env.MAIL_FROM);
    }

    return ok(
      { message: 'If that email is registered, a reset code has been sent.' },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });

  app.post('/auth/reset-password', async (req) => {
    const body = parseWith(ResetPasswordSchema, req.body);
    const email = body.email.toLowerCase();

    const user = await app.prisma.user.findUnique({ where: { email } });
    if (!user) throw Errors.notFound('User not found');

    const result = await verifyOtp(app, email, body.code, 'PASSWORD_RESET');
    if (!result.valid) throw Errors.badRequest(result.reason ?? 'Invalid OTP');

    const passwordHash = await bcrypt.hash(body.newPassword, SALT_ROUNDS);

    await app.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await revokeAllUserTokens(app, user.id);

    return ok(
      { message: 'Password reset successfully. Please log in with your new password.' },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });

  app.post('/auth/refresh', async (req) => {
    const body = parseWith(RefreshSchema, req.body);

    const result = await rotateRefreshToken(
      app,
      body.refreshToken,
      app.env.JWT_REFRESH_EXPIRES_IN
    );

    if (!result) throw Errors.unauthorized('Invalid or expired refresh token');

    const user = await app.prisma.user.findUnique({ where: { id: result.userId } });
    if (!user) throw Errors.unauthorized('Invalid refresh token user');
    if (!user.isActive) {
      await revokeAllUserTokens(app, user.id);
      throw Errors.forbidden('Account disabled');
    }
    if (!user.emailVerified) {
      await revokeAllUserTokens(app, user.id);
      throw Errors.forbidden('Email not verified. Please verify your email first.');
    }

    const accessToken = await signAccessToken(
      result.userId,
      app.env.JWT_SECRET,
      app.env.JWT_EXPIRES_IN
    );

    return ok(
      { accessToken, refreshToken: result.newRawToken },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });

  app.post(
    '/auth/logout',
    { preHandler: async (req) => app.requireAuth(req) },
    async (req) => {
      const body = parseWith(RefreshSchema, req.body);
      await revokeRefreshToken(app, body.refreshToken);

      return ok(
        { message: 'Logged out successfully' },
        { serverTime: new Date().toISOString(), requestId: req.requestId }
      );
    }
  );

  app.patch('/me/profile', { preHandler: async (req) => app.requireAuth(req) }, async (req) => {
    const body = parseWith(UpdateProfileSchema, req.body);

    const updated = await app.prisma.user.update({
      where: { id: req.currentUser!.id },
      data: { fullName: body.fullName }
    });

    return ok(
      {
        user: {
          id: updated.id,
          email: updated.email,
          fullName: updated.fullName,
          createdAt: updated.createdAt
        }
      },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });

  app.patch('/me/password', { preHandler: async (req) => app.requireAuth(req) }, async (req) => {
    const body = parseWith(ChangePasswordSchema, req.body);
    const user = await app.prisma.user.findUnique({ where: { id: req.currentUser!.id } });
    if (!user) throw Errors.notFound('User not found');

    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) throw Errors.unauthorized('Current password is incorrect');

    const passwordHash = await bcrypt.hash(body.newPassword, SALT_ROUNDS);
    await app.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    await revokeAllUserTokens(app, user.id);
    const tokens = await issueTokenPair(app, user.id);

    return ok(
      { message: 'Password changed successfully', ...tokens },
      { serverTime: new Date().toISOString(), requestId: req.requestId }
    );
  });
}
