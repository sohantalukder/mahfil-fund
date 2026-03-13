import { randomInt } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { OtpPurpose } from './mail.js';

const MAX_ATTEMPTS = 5;

export function generateOtp(): string {
  return String(randomInt(100_000, 999_999));
}

export async function createOtp(
  app: FastifyInstance,
  email: string,
  type: OtpPurpose,
  expiryMinutes: number
): Promise<string> {
  await app.prisma.otp.updateMany({
    where: { email, type, used: false },
    data: { used: true },
  });

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  await app.prisma.otp.create({
    data: { email, code, type, expiresAt },
  });

  return code;
}

export async function verifyOtp(
  app: FastifyInstance,
  email: string,
  code: string,
  type: OtpPurpose
): Promise<{ valid: boolean; reason?: string }> {
  const otp = await app.prisma.otp.findFirst({
    where: { email, type, used: false },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) return { valid: false, reason: 'No active OTP found' };

  if (otp.attempts >= MAX_ATTEMPTS) {
    await app.prisma.otp.update({ where: { id: otp.id }, data: { used: true } });
    return { valid: false, reason: 'Too many attempts. Request a new code.' };
  }

  if (new Date() > otp.expiresAt) {
    await app.prisma.otp.update({ where: { id: otp.id }, data: { used: true } });
    return { valid: false, reason: 'OTP has expired' };
  }

  if (otp.code !== code) {
    await app.prisma.otp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { valid: false, reason: 'Invalid OTP code' };
  }

  await app.prisma.otp.update({ where: { id: otp.id }, data: { used: true } });
  return { valid: true };
}
