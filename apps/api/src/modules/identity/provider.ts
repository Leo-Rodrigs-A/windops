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
    advanced: { database: { generateId: 'uuid' } },
    user: {
      modelName: 'auth_users',
      fields: { emailVerified: 'email_verified', createdAt: 'created_at', updatedAt: 'updated_at' },
    },
    session: {
      modelName: 'auth_sessions',
      fields: {
        userId: 'user_id',
        expiresAt: 'expires_at',
        ipAddress: 'ip_address',
        userAgent: 'user_agent',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
      additionalFields: {
        emailSecondStepAt: {
          type: 'date',
          required: false,
          input: false,
          returned: false,
          fieldName: 'email_second_step_at',
        },
      },
    },
    account: {
      modelName: 'auth_accounts',
      encryptOAuthTokens: true,
      fields: {
        accountId: 'account_id',
        providerId: 'provider_id',
        userId: 'user_id',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        idToken: 'id_token',
        accessTokenExpiresAt: 'access_token_expires_at',
        refreshTokenExpiresAt: 'refresh_token_expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    verification: {
      modelName: 'auth_verifications',
      fields: { expiresAt: 'expires_at', createdAt: 'created_at', updatedAt: 'updated_at' },
      storeIdentifier: 'hashed',
    },
    rateLimit: {
      storage: 'database',
      modelName: 'auth_rate_limits',
      fields: { lastRequest: 'last_request' },
    },
  });
}
