import { betterAuth } from 'better-auth';
import type { Pool } from 'pg';
// Builder only. Do not mount before mandatory second step and account-linking tests exist.
export function createIdentityProvider(pool: Pool, origin: string, secret: string) {
  return betterAuth({
    database: pool,
    baseURL: origin,
    secret,
    emailAndPassword: { enabled: false },
    trustedOrigins: [origin],
  });
}
