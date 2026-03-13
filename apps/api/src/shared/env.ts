import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

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

  // Network
  CORS_ORIGIN: z.string().default('*'),
  TRUST_PROXY: z.coerce.boolean().default(true)
});

export type Env = z.infer<typeof EnvSchema>;

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
    // eslint-disable-next-line no-console
    console.error('Invalid environment variables', parsed.error.flatten());
    throw new Error('Invalid environment variables');
  }
  return parsed.data;
}
