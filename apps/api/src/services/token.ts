import { SignJWT, jwtVerify } from 'jose';
import { randomBytes, createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

function parseExpiry(expr: string): number {
  const match = expr.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) throw new Error(`Invalid expiry format: ${expr}`);
  const val = parseInt(match[1]!, 10);
  const unit = match[2]! as keyof typeof multipliers;
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 } as const;
  return val * multipliers[unit] * 1000;
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export async function signAccessToken(
  userId: string,
  secret: string,
  expiresIn: string
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

export async function verifyAccessToken(
  token: string,
  secret: string
): Promise<{ sub: string }> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
  if (typeof payload.sub !== 'string') throw new Error('Invalid token subject');
  return { sub: payload.sub };
}

export async function createRefreshToken(
  app: FastifyInstance,
  userId: string,
  expiresIn: string
): Promise<string> {
  const raw = randomBytes(48).toString('hex');
  const hashed = hashToken(raw);
  const expiresAt = new Date(Date.now() + parseExpiry(expiresIn));

  await app.prisma.refreshToken.create({
    data: { token: hashed, userId, expiresAt },
  });

  return raw;
}

export async function rotateRefreshToken(
  app: FastifyInstance,
  rawToken: string,
  expiresIn: string
): Promise<{ userId: string; newRawToken: string } | null> {
  const hashed = hashToken(rawToken);

  const existing = await app.prisma.refreshToken.findUnique({
    where: { token: hashed },
  });

  if (!existing || existing.revokedAt || new Date() > existing.expiresAt) {
    return null;
  }

  const newRaw = randomBytes(48).toString('hex');
  const newHashed = hashToken(newRaw);
  const expiresAt = new Date(Date.now() + parseExpiry(expiresIn));

  await app.prisma.$transaction([
    app.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    }),
    app.prisma.refreshToken.create({
      data: { token: newHashed, userId: existing.userId, expiresAt },
    }),
  ]);

  return { userId: existing.userId, newRawToken: newRaw };
}

export async function revokeRefreshToken(
  app: FastifyInstance,
  rawToken: string
): Promise<void> {
  const hashed = hashToken(rawToken);
  await app.prisma.refreshToken.updateMany({
    where: { token: hashed, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserTokens(
  app: FastifyInstance,
  userId: string
): Promise<void> {
  await app.prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
