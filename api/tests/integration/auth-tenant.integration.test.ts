import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { hashPassword } from '../../src/services/password.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integration = testDatabaseUrl ? describe : describe.skip;

integration('API auth and tenant boundaries (isolated PostgreSQL)', () => {
  let app: FastifyInstance;
  let creatorId: string;
  let memberId: string;
  let temporaryUserId: string;
  let concurrentTemporaryUserId: string;
  let communityAId: string;
  let communityBId: string;

  beforeAll(async () => {
    if (!testDatabaseUrl) return;
    if (process.env.DATABASE_URL === testDatabaseUrl && process.env.NODE_ENV !== 'test') {
      throw new Error('Refusing to run integration cleanup unless NODE_ENV=test');
    }
    Object.assign(process.env, {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: 'integration-test-secret-that-is-longer-than-32-characters',
      JWT_ISSUER: 'mahfil-integration',
      JWT_AUDIENCE: 'mahfil-integration-clients',
      MAILTRAP_HOST: '127.0.0.1',
      MAILTRAP_USER: 'integration',
      MAILTRAP_PASS: 'integration',
      MAIL_FROM: 'integration@example.com',
      CORS_ORIGIN: 'http://localhost:3000',
      TRUST_PROXY: 'false',
    });
    app = buildApp();
    await app.ready();

    const marker = crypto.randomUUID();
    const passwordHash = await hashPassword('Integration-password-123');
    const creator = await app.prisma.user.create({ data: {
      email: `creator-${marker}@example.com`, passwordHash, fullName: 'Test Creator', isSuperAdmin: true,
    } });
    const member = await app.prisma.user.create({ data: {
      email: `member-${marker}@example.com`, passwordHash, fullName: 'Test Member',
    } });
    const temporary = await app.prisma.user.create({ data: {
      email: `temporary-${marker}@example.com`,
      passwordHash: await hashPassword('Temporary-password-123'),
      fullName: 'Temporary User',
      mustChangePassword: true,
    } });
    const concurrentTemporary = await app.prisma.user.create({ data: {
      email: `temporary-concurrent-${marker}@example.com`,
      passwordHash: await hashPassword('Temporary-password-123'),
      fullName: 'Concurrent Temporary User',
      mustChangePassword: true,
    } });
    creatorId = creator.id;
    memberId = member.id;
    temporaryUserId = temporary.id;
    concurrentTemporaryUserId = concurrentTemporary.id;

    const [communityA, communityB] = await Promise.all([
      app.prisma.community.create({ data: { name: 'Integration A', slug: `integration-a-${marker}`, createdByUserId: creator.id } }),
      app.prisma.community.create({ data: { name: 'Integration B', slug: `integration-b-${marker}`, createdByUserId: creator.id } }),
    ]);
    communityAId = communityA.id;
    communityBId = communityB.id;
    await app.prisma.communityMembership.create({ data: {
      userId: member.id, communityId: communityA.id, role: 'COLLECTOR', status: 'ACTIVE', addedByUserId: creator.id,
    } });
  });

  afterAll(async () => {
    if (!app) return;
    const communityIds = [communityAId, communityBId].filter(Boolean);
    await app.prisma.$transaction([
      app.prisma.idempotencyKey.deleteMany({ where: { communityId: { in: communityIds } } }),
      app.prisma.syncOperationItem.deleteMany({ where: { communityId: { in: communityIds } } }),
      app.prisma.syncOperation.deleteMany({ where: { communityId: { in: communityIds } } }),
      app.prisma.outboxJob.deleteMany({ where: { communityId: { in: communityIds } } }),
      app.prisma.invoice.deleteMany({ where: { communityId: { in: communityIds } } }),
      app.prisma.donation.deleteMany({ where: { communityId: { in: communityIds } } }),
      app.prisma.expense.deleteMany({ where: { communityId: { in: communityIds } } }),
      app.prisma.donor.deleteMany({ where: { communityId: { in: communityIds } } }),
      app.prisma.event.deleteMany({ where: { communityId: { in: communityIds } } }),
      app.prisma.auditLog.deleteMany({ where: { communityId: { in: communityIds } } }),
      app.prisma.errorLog.deleteMany({ where: { communityId: { in: communityIds } } }),
      app.prisma.attachment.deleteMany({ where: { communityId: { in: communityIds } } }),
    ]);
    await app.prisma.community.deleteMany({ where: { id: { in: [communityAId, communityBId].filter(Boolean) } } });
    await app.prisma.user.deleteMany({ where: { id: { in: [creatorId, memberId, temporaryUserId, concurrentTemporaryUserId].filter(Boolean) } } });
    await app.close();
  });

  it('returns only a short-lived challenge for a temporary-password login', async () => {
    const temporary = await app.prisma.user.findUniqueOrThrow({ where: { id: temporaryUserId } });
    const login = await app.inject({
      method: 'POST', url: '/auth/login', headers: { 'x-client': 'mobile' },
      payload: { email: temporary.email, password: 'Temporary-password-123' },
    });
    expect(login.statusCode).toBe(200);
    const loginBody = login.json();
    expect(loginBody.data.requiresPasswordChange).toBe(true);
    expect(loginBody.data.challengeToken).toEqual(expect.any(String));
    expect(loginBody.data.accessToken).toBeUndefined();
    expect(loginBody.data.refreshToken).toBeUndefined();

    const complete = await app.inject({
      method: 'POST', url: '/auth/complete-first-login', headers: { 'x-client': 'mobile' },
      payload: { challengeToken: loginBody.data.challengeToken, newPassword: 'Changed-password-123' },
    });
    expect(complete.statusCode).toBe(200);
    expect(complete.json().data.accessToken).toEqual(expect.any(String));
    expect(complete.json().data.refreshToken).toEqual(expect.any(String));
  });

  it('allows only one concurrent first-login completion', async () => {
    const temporary = await app.prisma.user.findUniqueOrThrow({ where: { id: concurrentTemporaryUserId } });
    const login = await app.inject({
      method: 'POST', url: '/auth/login', headers: { 'x-client': 'mobile' },
      payload: { email: temporary.email, password: 'Temporary-password-123' },
    });
    const challengeToken = login.json().data.challengeToken as string;
    const completions = await Promise.all([
      app.inject({ method: 'POST', url: '/auth/complete-first-login', headers: { 'x-client': 'mobile' }, payload: { challengeToken, newPassword: 'Changed-password-123' } }),
      app.inject({ method: 'POST', url: '/auth/complete-first-login', headers: { 'x-client': 'mobile' }, payload: { challengeToken, newPassword: 'Changed-password-456' } }),
    ]);
    expect(completions.map((response) => response.statusCode).sort()).toEqual([200, 401]);
  });

  it('rejects a valid user at a community path where they have no membership', async () => {
    const member = await app.prisma.user.findUniqueOrThrow({ where: { id: memberId } });
    const login = await app.inject({
      method: 'POST', url: '/auth/login', headers: { 'x-client': 'mobile' },
      payload: { email: member.email, password: 'Integration-password-123' },
    });
    const token = login.json().data.accessToken as string;

    const allowed = await app.inject({
      method: 'GET', url: `/communities/${communityAId}/donors`, headers: { authorization: `Bearer ${token}` },
    });
    const denied = await app.inject({
      method: 'GET', url: `/communities/${communityBId}/donors`, headers: { authorization: `Bearer ${token}` },
    });
    expect(allowed.statusCode).toBe(200);
    expect(denied.statusCode).toBe(403);
    expect(denied.json().error.code).toBe('FORBIDDEN');
  });

  it('does not let a super administrator bypass tenant membership', async () => {
    const creator = await app.prisma.user.findUniqueOrThrow({ where: { id: creatorId } });
    const login = await app.inject({
      method: 'POST', url: '/auth/login', headers: { 'x-client': 'mobile' },
      payload: { email: creator.email, password: 'Integration-password-123' },
    });
    const denied = await app.inject({
      method: 'GET', url: `/communities/${communityAId}/donors`,
      headers: { authorization: `Bearer ${login.json().data.accessToken as string}` },
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.json().error.code).toBe('FORBIDDEN');
  });

  it('commits an idempotency reservation, mutation, audit, and response as one replayable result', async () => {
    const member = await app.prisma.user.findUniqueOrThrow({ where: { id: memberId } });
    const login = await app.inject({
      method: 'POST', url: '/auth/login', headers: { 'x-client': 'mobile' },
      payload: { email: member.email, password: 'Integration-password-123' },
    });
    const [event, donor] = await Promise.all([
      app.prisma.event.create({ data: {
        communityId: communityAId, name: 'Idempotency Event', year: 2026, createdByUserId: memberId,
      } }),
      app.prisma.donor.create({ data: {
        communityId: communityAId, fullName: 'Idempotency Donor', phone: '01700000000',
        donorType: 'individual', createdByUserId: memberId, updatedByUserId: memberId,
      } }),
    ]);
    const key = `integration-${crypto.randomUUID()}`;
    const request = {
      method: 'POST' as const,
      url: `/communities/${communityAId}/donations`,
      headers: { authorization: `Bearer ${login.json().data.accessToken as string}`, 'idempotency-key': key },
      payload: {
        eventId: event.id, donorId: donor.id, amount: 500,
        paymentMethod: 'CASH', donationDate: '2026-09-30T00:00:00.000Z',
      },
    };

    const first = await app.inject(request);
    const replay = await app.inject(request);
    expect(first.statusCode).toBe(200);
    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toEqual(first.json());
    expect(await app.prisma.donation.count({ where: { communityId: communityAId, donorId: donor.id } })).toBe(1);
    expect(await app.prisma.auditLog.count({ where: {
      communityId: communityAId, entityType: 'donation', entityId: first.json().data.donation.id,
    } })).toBe(1);

    const conflict = await app.inject({ ...request, payload: { ...request.payload, amount: 501 } });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error.code).toBe('CONFLICT');
  });

  it('rejects tenant access while the community is suspended', async () => {
    const member = await app.prisma.user.findUniqueOrThrow({ where: { id: memberId } });
    const login = await app.inject({
      method: 'POST', url: '/auth/login', headers: { 'x-client': 'mobile' },
      payload: { email: member.email, password: 'Integration-password-123' },
    });
    await app.prisma.community.update({ where: { id: communityAId }, data: { status: 'SUSPENDED' } });
    try {
      const denied = await app.inject({
        method: 'GET', url: `/communities/${communityAId}/donors`,
        headers: { authorization: `Bearer ${login.json().data.accessToken as string}` },
      });
      expect(denied.statusCode).toBe(403);
    } finally {
      await app.prisma.community.update({ where: { id: communityAId }, data: { status: 'ACTIVE' } });
    }
  });
});
