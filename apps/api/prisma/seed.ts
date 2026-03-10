import { PrismaClient, UserRoleName } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

async function main() {
  const roles: UserRoleName[] = ['super_admin', 'admin', 'collector', 'viewer'];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      create: { name },
      update: {}
    });
  }

  // Optional: seed a super admin user via Supabase Auth + app DB
  //
  // Required env vars:
  // - SUPABASE_URL
  // - SUPABASE_SERVICE_ROLE_KEY (do NOT commit)
  // - SEED_ADMIN_EMAIL
  // - SEED_ADMIN_PASSWORD
  const seedEmail = process.env.SEED_ADMIN_EMAIL;
  const seedPassword = process.env.SEED_ADMIN_PASSWORD;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (seedEmail && seedPassword && supabaseUrl && serviceRoleKey) {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Create (or fetch) Supabase Auth user
    const existing = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (existing.error) throw existing.error;
    const found = existing.data.users.find((u) => u.email?.toLowerCase() === seedEmail.toLowerCase());

    const authUser =
      found ??
      (
        await supabaseAdmin.auth.admin.createUser({
          email: seedEmail,
          password: seedPassword,
          email_confirm: true
        })
      ).data.user;

    if (!authUser) throw new Error('Failed to create/find Supabase Auth user');

    // Ensure app user row exists and assign super_admin role
    const user = await prisma.user.upsert({
      where: { authUserId: authUser.id },
      create: { authUserId: authUser.id, email: authUser.email ?? undefined },
      update: { email: authUser.email ?? undefined }
    });

    const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'super_admin' } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: superAdminRole.id } },
      create: { userId: user.id, roleId: superAdminRole.id },
      update: {}
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

