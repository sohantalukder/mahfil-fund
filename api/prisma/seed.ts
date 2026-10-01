import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/services/password.js';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || adminPassword.length < 10) {
    throw new Error('SEED_ADMIN_EMAIL and a 10+ character SEED_ADMIN_PASSWORD are required');
  }

  const passwordHash = await hashPassword(adminPassword);
  const existingAdmin = await prisma.user.findFirst({ where: { email: adminEmail } });
  const superAdmin = existingAdmin
    ? await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { passwordHash, isSuperAdmin: true, isActive: true, mustChangePassword: true },
      })
    : await prisma.user.create({ data: {
        email: adminEmail, passwordHash, fullName: 'Super Admin',
        isActive: true, isSuperAdmin: true, mustChangePassword: true,
      } });

  const defaultCommunity = await prisma.community.upsert({
    where: { slug: 'default' }, update: {},
    create: {
      name: 'Default Community', slug: 'default',
      description: 'Default community', status: 'ACTIVE', createdByUserId: superAdmin.id,
    },
  });
  await prisma.communityMembership.upsert({
    where: { userId_communityId: { userId: superAdmin.id, communityId: defaultCommunity.id } },
    update: { role: 'ADMIN', status: 'ACTIVE' },
    create: { userId: superAdmin.id, communityId: defaultCommunity.id, role: 'ADMIN', status: 'ACTIVE' },
  });

  console.log(`Seeded super administrator ${adminEmail}`);
  console.log('No legacy records were reassigned; run security:preflight before migration.');
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
