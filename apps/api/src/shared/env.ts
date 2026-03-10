import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(10),
  // Used for verifying Supabase JWTs server-side (HS256)
  SUPABASE_JWT_SECRET: z.string().min(10),

  // Prisma
  DATABASE_URL: z.string().min(10),

  // Network
  CORS_ORIGIN: z.string().default('*'),
  TRUST_PROXY: z.coerce.boolean().default(true)
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid environment variables', parsed.error.flatten());
    throw new Error('Invalid environment variables');
  }
  return parsed.data;
}

