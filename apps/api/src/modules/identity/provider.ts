import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import type { Pool } from 'pg';
import type { EmailSender } from '../../platform/email.js';
import { LoginChallengeService } from './challenges.js';

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
}

export interface IdentityProvider {
  auth: {
    handler: (request: Request) => Promise<Response>;
    api: {
      getSession: (input: { headers: Headers }) => Promise<{ session: { id: string } } | null>;
    };
  };
  challenges: LoginChallengeService;
}

// Builder only. Do not mount before mandatory second step and account-linking tests exist.
export function createIdentityProvider(
  pool: Pool,
  origin: string,
  secret: string,
  emailSender: EmailSender,
  googleCredentials?: GoogleCredentials,
): IdentityProvider {
  const challenges = new LoginChallengeService(pool, secret, emailSender);
  const auth = betterAuth({
    database: pool,
    baseURL: origin,
    basePath: '/api/auth',
    secret,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await emailSender.send({
          to: user.email,
          subject: 'Redefina sua senha do Wind Ops',
          text: `Use este link para redefinir sua senha: ${url}\n\nSe você não solicitou a redefinição, ignore esta mensagem.`,
        });
      },
    },
    trustedOrigins: [origin],
    advanced: {
      database: { generateId: 'uuid' },
      ipAddress: { ipAddressHeaders: ['x-windops-client-ip'] },
    },
    user: {
      modelName: 'auth_users',
      fields: { emailVerified: 'email_verified', createdAt: 'created_at', updatedAt: 'updated_at' },
    },
    session: {
      expiresIn: 7 * 24 * 60 * 60,
      disableSessionRefresh: true,
      cookieCache: { enabled: false },
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
      accountLinking: {
        enabled: true,
        requireLocalEmailVerified: true,
        allowDifferentEmails: false,
        allowUnlinkingAll: false,
        trustedProviders: [],
      },
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
      enabled: true,
      storage: 'database',
      window: 60,
      max: 20,
      modelName: 'auth_rate_limits',
      fields: { lastRequest: 'last_request' },
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 60, max: 3 },
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        await emailSender.send({
          to: user.email,
          subject: 'Confirme seu e-mail no Wind Ops',
          text: `Confirme seu endereço de e-mail: ${url}`,
        });
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({
            data: { ...user, email: user.email.trim().toLowerCase() },
          }),
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (
          ['/sign-up/email', '/sign-in/email', '/request-password-reset'].includes(ctx.path) &&
          typeof ctx.body?.email === 'string'
        ) {
          return {
            context: {
              ...ctx,
              body: { ...ctx.body, email: ctx.body.email.trim().toLowerCase() },
            },
          };
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        const newSession = ctx.context.newSession;
        if (!newSession) return;
        try {
          await challenges.issueForNewSession(newSession.session.id, newSession.user.email);
        } catch {
          await pool.query('DELETE FROM public.auth_sessions WHERE id = $1', [
            newSession.session.id,
          ]);
          throw new APIError('INTERNAL_SERVER_ERROR', {
            message: 'Unable to complete sign-in.',
          });
        }
      }),
    },
    ...(googleCredentials
      ? {
          socialProviders: {
            google: {
              ...googleCredentials,
              requireEmailVerification: true,
              mapProfileToUser: (profile) => {
                if (profile.email_verified !== true) {
                  throw new APIError('FORBIDDEN', {
                    message: 'Google account email must be verified.',
                  });
                }
                return {};
              },
            },
          },
        }
      : {}),
  });
  return { auth, challenges };
}
