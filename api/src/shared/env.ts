import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_ISSUER: z.string().default('mahfil-fund-api'),
  JWT_AUDIENCE: z.string().default('mahfil-fund-clients'),

  // Prisma
  DATABASE_URL: z.string().min(10),

  // Mailtrap SMTP
  MAILTRAP_HOST: z.string().min(1),
  MAILTRAP_PORT: z.coerce.number().int().default(2525),
  MAILTRAP_USER: z.string().min(1),
  MAILTRAP_PASS: z.string().min(1),
  MAIL_FROM: z.string().email().default('noreply@mahfilfund.com'),

  // OTP
  OTP_EXPIRY_MINUTES: z.coerce.number().int().min(1).default(10),

  // Supabase Storage
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('mahfil-uploads'),

  // Community limits
  ADMIN_COMMUNITY_LIMIT: z.coerce.number().int().min(1).default(10),

  // Network
  CORS_ORIGIN: z.string().min(1),
  TRUST_PROXY: z.string().default('false')
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === 'production' && value.TRUST_PROXY.trim().toLowerCase() === 'true') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['TRUST_PROXY'], message: 'Production must use explicit trusted proxy addresses or named ranges' });
  }
});

export type Env = z.infer<typeof EnvSchema>;

export function parseTrustProxy(value: string): boolean | string[] {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'false' || normalized === '') return false;
  if (normalized === 'true') return true;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const nodeEnv = raw.NODE_ENV ?? 'development';
  const effectiveRaw: NodeJS.ProcessEnv =
    nodeEnv !== 'production' && !raw.JWT_SECRET
      ? {
          ...raw,
          JWT_SECRET: 'dev-local-jwt-secret-at-least-32-characters'
        }
      : raw;

  const parsed = EnvSchema.safeParse(effectiveRaw);
  if (!parsed.success) {
     
    console.error('Invalid environment variables', parsed.error.flatten());
    throw new Error('Invalid environment variables');
  }
  return parsed.data;
}
