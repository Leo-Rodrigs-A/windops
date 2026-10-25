import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { z } from 'zod';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    APP_ORIGIN: z.url(),
    DATABASE_URL: z.url().refine((v) => /^postgres(ql)?:/.test(v), 'PostgreSQL URL required'),
    ELECTRIC_URL: z.url(),
    ELECTRIC_SECRET: z.string().min(1),
    EMAIL_TRANSPORT: z.enum(['smtp', 'resend']).default('smtp'),
    SMTP_URL: z.url().optional(),
    EMAIL_FROM: z.string().min(1),
    RESEND_API_KEY: z.string().min(1).optional(),
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    VAPID_SUBJECT: z.string().optional(),
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.EMAIL_TRANSPORT === 'smtp' && !env.SMTP_URL)
      ctx.addIssue({ code: 'custom', path: ['SMTP_URL'], message: 'SMTP URL required' });
    if (env.EMAIL_TRANSPORT === 'resend' && !env.RESEND_API_KEY)
      ctx.addIssue({ code: 'custom', path: ['RESEND_API_KEY'], message: 'Resend key required' });
    if (env.NODE_ENV === 'production' && !env.APP_ORIGIN.startsWith('https://'))
      ctx.addIssue({ code: 'custom', path: ['APP_ORIGIN'], message: 'HTTPS required' });
  });
export type Environment = z.infer<typeof schema>;
export function parseEnvironment(input: Record<string, unknown>): Environment {
  const result = schema.safeParse(
    Object.fromEntries(Object.entries(input).filter(([, value]) => value !== '')),
  );
  if (!result.success)
    throw new Error(
      'Invalid environment: ' +
        result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    );
  return result.data;
}
export function loadEnvironment(): Environment {
  const fileEnvironment =
    config({
      path: fileURLToPath(new URL('../../../../.env', import.meta.url)),
      quiet: true,
      processEnv: {},
    }).parsed ?? {};
  return parseEnvironment({ ...fileEnvironment, ...process.env });
}

export function loadMigrationDatabaseUrl(): string {
  const fileEnvironment =
    config({
      path: fileURLToPath(new URL('../../../../.env', import.meta.url)),
      quiet: true,
      processEnv: {},
    }).parsed ?? {};
  const result = z
    .url()
    .refine((value) => /^postgres(ql)?:/.test(value), 'PostgreSQL URL required')
    .safeParse(process.env.MIGRATION_DATABASE_URL ?? fileEnvironment.MIGRATION_DATABASE_URL);
  if (!result.success)
    throw new Error('Invalid environment: MIGRATION_DATABASE_URL is required for migrations.');
  return result.data;
}
