import { SignJWT, jwtVerify } from 'jose';
import { randomBytes, randomUUID, createHash, createHmac } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

const ACCESS_TYPE = 'access';
const PASSWORD_CHANGE_TYPE = 'password_change';

export type TokenSecurityContext = { client?: string; deviceId?: string };

export function securityEventContext(app: FastifyInstance, context?: TokenSecurityContext) {
  const client = context?.client?.slice(0, 32);
  const deviceHash = context?.deviceId
    ? createHmac('sha256', app.env.JWT_SECRET).update(context.deviceId).digest('hex')
    : undefined;
  return { client, deviceHash };
}

function parseExpiry(expr: string): number {
  const match = expr.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) throw new Error(`Invalid expiry format: ${expr}`);
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 } as const;
  return Number(match[1]) * multipliers[match[2] as keyof typeof multipliers] * 1000;
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function key(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(
  userId: string,
  secret: string,
  expiresIn: string,
  issuer: string,
  audience: string,
): Promise<string> {
  return new SignJWT({ tokenType: ACCESS_TYPE })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key(secret));
}

export async function verifyAccessToken(
  token: string,
  secret: string,
  issuer: string,
  audience: string,
): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, key(secret), {
    algorithms: ['HS256'], issuer, audience,
  });
  if (payload.tokenType !== ACCESS_TYPE || typeof payload.sub !== 'string') {
    throw new Error('Invalid access token');
  }
  return { sub: payload.sub };
}

export async function signPasswordChangeChallenge(
  userId: string,
  secret: string,
  issuer: string,
  audience: string,
): Promise<string> {
  return new SignJWT({ tokenType: PASSWORD_CHANGE_TYPE })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(key(secret));
}

export async function verifyPasswordChangeChallenge(
  token: string,
  secret: string,
  issuer: string,
  audience: string,
): Promise<string> {
  const { payload } = await jwtVerify(token, key(secret), {
    algorithms: ['HS256'], issuer, audience,
  });
  if (payload.tokenType !== PASSWORD_CHANGE_TYPE || typeof payload.sub !== 'string') {
    throw new Error('Invalid password-change challenge');
  }
  return payload.sub;
}

export async function createRefreshToken(
  app: FastifyInstance,
  userId: string,
  expiresIn: string,
  familyId = randomUUID(),
  context?: TokenSecurityContext,
): Promise<string> {
  const raw = randomBytes(48).toString('base64url');
  await app.prisma.$transaction(async (tx) => {
    await tx.refreshToken.create({ data: {
        token: hashToken(raw), userId, familyId,
        expiresAt: new Date(Date.now() + parseExpiry(expiresIn)),
    } });
    await tx.securityEvent.create({ data: {
      type: 'TOKEN_FAMILY_CREATED', userId, familyId, ...securityEventContext(app, context),
    } });
  });
  return raw;
}

export async function rotateRefreshToken(
  app: FastifyInstance,
  rawToken: string,
  expiresIn: string,
  context?: TokenSecurityContext,
): Promise<{ userId: string; newRawToken: string } | null> {
  const existing = await app.prisma.refreshToken.findUnique({ where: { token: hashToken(rawToken) } });
  if (!existing || new Date() > existing.expiresAt) return null;
  if (existing.revokedAt || existing.usedAt) {
    await app.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null }, data: { revokedAt: new Date() },
      });
      await tx.securityEvent.create({ data: {
        type: 'TOKEN_REUSE_DETECTED', userId: existing.userId, familyId: existing.familyId,
        ...securityEventContext(app, context),
      } });
    });
    return null;
  }

  const newRawToken = randomBytes(48).toString('base64url');
  const rotated = await app.prisma.$transaction(async (tx) => {
    const consumed = await tx.refreshToken.updateMany({
      where: { id: existing.id, usedAt: null, revokedAt: null },
      data: { usedAt: new Date(), revokedAt: new Date() },
    });
    if (consumed.count !== 1) {
      await tx.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null }, data: { revokedAt: new Date() },
      });
      await tx.securityEvent.create({ data: {
        type: 'TOKEN_REUSE_DETECTED', userId: existing.userId, familyId: existing.familyId,
        ...securityEventContext(app, context),
      } });
      return false;
    }
    await tx.refreshToken.create({
      data: {
        token: hashToken(newRawToken), userId: existing.userId, familyId: existing.familyId,
        expiresAt: new Date(Date.now() + parseExpiry(expiresIn)),
      },
    });
    await tx.securityEvent.create({ data: {
      type: 'TOKEN_ROTATED', userId: existing.userId, familyId: existing.familyId,
      ...securityEventContext(app, context),
    } });
    return true;
  });
  return rotated ? { userId: existing.userId, newRawToken } : null;
}

export async function revokeRefreshToken(app: FastifyInstance, rawToken: string, context?: TokenSecurityContext): Promise<void> {
  const existing = await app.prisma.refreshToken.findUnique({ where: { token: hashToken(rawToken) } });
  if (!existing) return;
  await app.prisma.$transaction(async (tx) => {
    await tx.refreshToken.updateMany({
      where: { familyId: existing.familyId, revokedAt: null }, data: { revokedAt: new Date() },
    });
    await tx.securityEvent.create({ data: {
      type: 'TOKEN_FAMILY_REVOKED', userId: existing.userId, familyId: existing.familyId,
      ...securityEventContext(app, context),
    } });
  });
}

export async function revokeAllUserTokens(app: FastifyInstance, userId: string, context?: TokenSecurityContext): Promise<void> {
  await app.prisma.$transaction(async (tx) => {
    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null }, data: { revokedAt: new Date() },
    });
    await tx.securityEvent.create({ data: {
      type: 'ACCOUNT_TOKENS_REVOKED', userId, ...securityEventContext(app, context),
    } });
  });
}
