import { randomInt, createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { OtpPurpose } from '../integrations/email.js';
import { Errors } from '../shared/errors.js';

const MAX_ATTEMPTS = 5;
type OtpStore = Pick<PrismaClient, 'otp'> | Pick<Prisma.TransactionClient, 'otp'>;

export function generateOtp(): string {
  return String(randomInt(100_000, 999_999));
}

export async function consumeRecoveryThrottle(
  app: FastifyInstance,
  identifier: string,
  kind: 'EMAIL' | 'IP',
  maxHits: number,
  windowMs: number,
) {
  const identifierHash = createHmac('sha256', app.env.JWT_SECRET)
    .update(`${kind}:${identifier.trim().toLowerCase()}`)
    .digest('hex');
  await app.prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${identifierHash}, 0))`);
    const current = await tx.recoveryThrottle.findUnique({
      where: { identifierHash_kind: { identifierHash, kind } },
    });
    const now = new Date();
    if (!current || now.getTime() - current.windowStartedAt.getTime() >= windowMs) {
      await tx.recoveryThrottle.upsert({
        where: { identifierHash_kind: { identifierHash, kind } },
        create: { identifierHash, kind, hits: 1, windowStartedAt: now },
        update: { hits: 1, windowStartedAt: now },
      });
      return;
    }
    if (current.hits >= maxHits) throw Errors.rateLimited('Too many recovery requests');
    await tx.recoveryThrottle.update({
      where: { identifierHash_kind: { identifierHash, kind } },
      data: { hits: { increment: 1 } },
    });
  });
}

function hashOtp(app: FastifyInstance, email: string, type: OtpPurpose, code: string): string {
  return createHmac('sha256', app.env.JWT_SECRET)
    .update(`${email}:${type}:${code}`)
    .digest('hex');
}

export async function createOtp(
  app: FastifyInstance,
  email: string,
  type: OtpPurpose,
  expiryMinutes: number
): Promise<string> {
  const normalizedEmail = email.toLowerCase();
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  await app.prisma.$transaction(async (tx) => {
    // Serialize issuance per normalized email and purpose across API instances.
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${normalizedEmail}:${type}`}, 0))`);
    const latest = await tx.otp.findFirst({
      where: { email: normalizedEmail, type },
      orderBy: { createdAt: 'desc' },
    });
    if (latest && Date.now() - latest.createdAt.getTime() < 60_000) {
      throw Errors.rateLimited('Please wait before requesting another code');
    }
    await tx.otp.updateMany({
      where: { email: normalizedEmail, type, used: false },
      data: { used: true },
    });
    await tx.otp.create({
      data: { email: normalizedEmail, codeHash: hashOtp(app, normalizedEmail, type, code), type, expiresAt },
    });
  });

  return code;
}

export async function verifyOtp(
  app: FastifyInstance,
  email: string,
  code: string,
  type: OtpPurpose,
  store: OtpStore = app.prisma,
): Promise<{ valid: boolean; reason?: string }> {
  const normalizedEmail = email.toLowerCase();
  const otp = await store.otp.findFirst({
    where: { email: normalizedEmail, type, used: false },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) return { valid: false, reason: 'No active OTP found' };

  if (otp.attempts >= MAX_ATTEMPTS) {
    await store.otp.update({ where: { id: otp.id }, data: { used: true } });
    return { valid: false, reason: 'Too many attempts. Request a new code.' };
  }

  if (new Date() > otp.expiresAt) {
    await store.otp.update({ where: { id: otp.id }, data: { used: true } });
    return { valid: false, reason: 'OTP has expired' };
  }

  const candidate = Buffer.from(hashOtp(app, normalizedEmail, type, code));
  const expected = Buffer.from(otp.codeHash);
  if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) {
    await store.otp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { valid: false, reason: 'Invalid OTP code' };
  }

  const consumed = await store.otp.updateMany({
    where: { id: otp.id, used: false, attempts: { lt: MAX_ATTEMPTS }, expiresAt: { gt: new Date() } },
    data: { used: true },
  });
  return consumed.count === 1 ? { valid: true } : { valid: false, reason: 'OTP was already used' };
}
