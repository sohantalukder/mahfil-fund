import { PrismaClient, UserRoleName } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
  console.log('🌱 Seeding database...');

  // ── Seed roles ──────────────────────────────────────────────────────────────
  const roleNames: UserRoleName[] = ['super_admin', 'admin', 'collector', 'viewer'];
  for (const name of roleNames) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }
  console.log('✅ Roles seeded');

  // ── Seed super admin ─────────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@mahfilfund.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345';
  const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);

  let superAdminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!superAdminUser) {
    superAdminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'Super Admin',
        emailVerified: true,
        isActive: true
      }
    });
    console.log(`✅ Super admin user created: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Super admin already exists: ${adminEmail}`);
  }

  // Assign super_admin role
  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'super_admin' } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: superAdminUser.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: superAdminUser.id, roleId: superAdminRole.id }
  });
  console.log('✅ Super admin role assigned');

  // ── Seed default community ────────────────────────────────────────────────────
  let defaultCommunity = await prisma.community.findUnique({ where: { slug: 'default' } });
  if (!defaultCommunity) {
    defaultCommunity = await prisma.community.create({
      data: {
        name: 'Default Community',
        slug: 'default',
        description: 'Default community for migrated data',
        status: 'ACTIVE',
        createdByUserId: superAdminUser.id
      }
    });
    console.log('✅ Default community created');
  } else {
    console.log('ℹ️  Default community already exists');
  }

  // Ensure super admin has membership in default community
  await prisma.communityMembership.upsert({
    where: { userId_communityId: { userId: superAdminUser.id, communityId: defaultCommunity.id } },
    update: {},
    create: {
      userId: superAdminUser.id,
      communityId: defaultCommunity.id,
      role: 'super_admin',
      status: 'ACTIVE'
    }
  });
  console.log('✅ Super admin membership in default community ensured');

  // ── Backfill communityId on existing records ──────────────────────────────────
  const [eventsUpdated, donorsUpdated, donationsUpdated, expensesUpdated] = await Promise.all([
    prisma.event.updateMany({
      where: { communityId: null },
      data: { communityId: defaultCommunity.id }
    }),
    prisma.donor.updateMany({
      where: { communityId: null },
      data: { communityId: defaultCommunity.id }
    }),
    prisma.donation.updateMany({
      where: { communityId: null },
      data: { communityId: defaultCommunity.id }
    }),
    prisma.expense.updateMany({
      where: { communityId: null },
      data: { communityId: defaultCommunity.id }
    })
  ]);

  console.log(`✅ Backfilled communityId: ${eventsUpdated.count} events, ${donorsUpdated.count} donors, ${donationsUpdated.count} donations, ${expensesUpdated.count} expenses`);

  // ── Seed sample community (for demo) ─────────────────────────────────────────
  const sampleSlug = 'bhabanipur-youth-society';
  let sampleCommunity = await prisma.community.findUnique({ where: { slug: sampleSlug } });
  if (!sampleCommunity) {
    sampleCommunity = await prisma.community.create({
      data: {
        name: 'Bhabanipur Youth & Student Society',
        slug: sampleSlug,
        description: 'A youth and student welfare organization',
        location: 'Bhabanipur, Dhaka',
        district: 'Dhaka',
        thana: 'Hazaribagh',
        contactNumber: '01700000001',
        email: 'bhabanipur@example.com',
        status: 'ACTIVE',
        createdByUserId: superAdminUser.id
      }
    });
    console.log('✅ Sample community created');
  }

  // ── Seed sample admin user ────────────────────────────────────────────────────
  const sampleAdminEmail = 'communityAdmin@mahfilfund.com';
  let sampleAdmin = await prisma.user.findUnique({ where: { email: sampleAdminEmail } });
  if (!sampleAdmin) {
    const hash = await bcrypt.hash('Admin@12345', SALT_ROUNDS);
    sampleAdmin = await prisma.user.create({
      data: {
        email: sampleAdminEmail,
        passwordHash: hash,
        fullName: 'Community Admin',
        emailVerified: true,
        isActive: true
      }
    });

    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } });
    await prisma.userRole.create({ data: { userId: sampleAdmin.id, roleId: adminRole.id } });
    await prisma.communityMembership.create({
      data: {
        userId: sampleAdmin.id,
        communityId: sampleCommunity.id,
        role: 'admin',
        status: 'ACTIVE'
      }
    });
    console.log(`✅ Sample admin user created: ${sampleAdminEmail}`);
  }

  console.log('\n🎉 Seeding complete!');
  console.log(`   Super Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`   Community Admin: ${sampleAdminEmail} / Admin@12345`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
