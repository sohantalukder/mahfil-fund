import { PrismaClient, UserRoleName } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
  const roles: UserRoleName[] = ['super_admin', 'admin', 'collector', 'viewer'];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }

  const seedEmail = process.env.SEED_ADMIN_EMAIL;
  const seedPassword = process.env.SEED_ADMIN_PASSWORD;

  if (seedEmail && seedPassword) {
    const passwordHash = await bcrypt.hash(seedPassword, SALT_ROUNDS);

    const user = await prisma.user.upsert({
      where: { email: seedEmail.toLowerCase() },
      create: {
        email: seedEmail.toLowerCase(),
        passwordHash,
        emailVerified: true,
      },
      update: {
        passwordHash,
        emailVerified: true,
      },
    });

    const superAdminRole = await prisma.role.findUniqueOrThrow({
      where: { name: 'super_admin' },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: superAdminRole.id } },
      create: { userId: user.id, roleId: superAdminRole.id },
      update: {},
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
