import { createHash, randomBytes, randomUUID } from 'node:crypto';
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
  googleEnabled: boolean;
  auth: {
    handler: (request: Request) => Promise<Response>;
    api: {
      getSession: (input: {
        headers: Headers;
      }) => Promise<{ session: { id: string }; user: { name: string } } | null>;
      setPassword: (input: { headers: Headers; body: { newPassword: string } }) => Promise<unknown>;
      updateUser: (input: { headers: Headers; body: { name: string } }) => Promise<unknown>;
    };
  };
  challenges: LoginChallengeService;
  beginEmailSignup(email: string, origin: string): Promise<void>;
  completeEmailSignup(input: {
    token: string;
    name: string;
    password: string;
  }): Promise<'created' | 'invalid'>;
  onboardingStatus(userId: string): Promise<'needs_setup' | 'already_configured' | 'ineligible'>;
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
      sendOnSignUp: false,
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
  return {
    auth,
    challenges,
    googleEnabled: Boolean(googleCredentials),
    async beginEmailSignup(email, appOrigin) {
      const normalized = email.trim().toLowerCase();
      const alreadyExists = await pool.query('SELECT 1 FROM public.auth_users WHERE email = $1', [
        normalized,
      ]);
      if (alreadyExists.rowCount) return;

      const token = randomBytes(32).toString('base64url');
      const id = randomUUID();
      const tokenHash = createHash('sha256').update(token).digest();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE public.auth_signup_intents SET consumed_at = clock_timestamp()
           WHERE email = $1 AND consumed_at IS NULL`,
          [normalized],
        );
        await client.query(
          `INSERT INTO public.auth_signup_intents (id, email, token_hash, expires_at)
           VALUES ($1, $2, $3, clock_timestamp() + interval '30 minutes')`,
          [id, normalized, tokenHash],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      await emailSender.send({
        to: normalized,
        subject: 'Confirme seu e-mail para criar sua conta Wind Ops',
        text: `Confirme seu e-mail e escolha seu nome e senha: ${new URL(`/cadastro/confirmar#token=${encodeURIComponent(token)}`, appOrigin).href}\n\nO link expira em 30 minutos.`,
      });
    },
    async completeEmailSignup({ token, name, password }) {
      const tokenHash = createHash('sha256').update(token).digest();
      const client = await pool.connect();
      let email: string | undefined;
      try {
        await client.query('BEGIN');
        const result = await client.query<{ id: string; email: string; createdAt: Date }>(
          `SELECT id, email, created_at AS "createdAt" FROM public.auth_signup_intents
           WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > clock_timestamp()
           FOR UPDATE`,
          [tokenHash],
        );
        const intent = result.rows[0];
        if (!intent) {
          await client.query('ROLLBACK');
          return 'invalid';
        }
        email = intent.email;
        const existing = await client.query<{
          id: string;
          createdAt: Date;
          emailVerified: boolean;
        }>(
          `SELECT u.id, u.created_at AS "createdAt", u.email_verified AS "emailVerified"
           FROM public.auth_users u WHERE u.email = $1`,
          [email],
        );
        const priorUser = existing.rows[0];
        if (priorUser) {
          const credential = await client.query(
            `SELECT 1 FROM public.auth_accounts
             WHERE user_id = $1 AND provider_id = 'credential'`,
            [priorUser.id],
          );
          if (priorUser.createdAt < intent.createdAt || !credential.rowCount) {
            await client.query('ROLLBACK');
            return 'invalid';
          }
          await client.query('UPDATE public.auth_users SET email_verified = true WHERE id = $1', [
            priorUser.id,
          ]);
          await client.query(
            'UPDATE public.auth_signup_intents SET consumed_at = clock_timestamp() WHERE id = $1',
            [intent.id],
          );
          await client.query('COMMIT');
          return 'created';
        }
        const signup = await auth.api.signUpEmail({
          body: { email, name: name.trim(), password },
        });
        if (!signup.user?.id) throw new Error('Signup did not create a user.');
        const createdUser = await client.query<{ id: string }>(
          'SELECT id FROM public.auth_users WHERE email = $1',
          [email],
        );
        if (createdUser.rows[0]?.id !== signup.user.id)
          throw new Error('Signup email was claimed concurrently.');
        await client.query(
          'UPDATE public.auth_users SET email_verified = true, updated_at = clock_timestamp() WHERE id = $1',
          [createdUser.rows[0].id],
        );
        await client.query(
          'UPDATE public.auth_signup_intents SET consumed_at = clock_timestamp() WHERE id = $1',
          [intent.id],
        );
        await client.query('COMMIT');
        return 'created';
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
    async onboardingStatus(userId) {
      const result = await pool.query<{
        hasGoogle: boolean;
        hasPassword: boolean;
        hasName: boolean;
      }>(
        `SELECT
           EXISTS (
             SELECT 1 FROM public.auth_accounts google
             WHERE google.user_id = u.id AND google.provider_id = 'google'
           ) AS "hasGoogle",
           EXISTS (
             SELECT 1 FROM public.auth_accounts credential
             WHERE credential.user_id = u.id AND credential.provider_id = 'credential'
               AND credential.password IS NOT NULL
           ) AS "hasPassword",
           (u.name IS NOT NULL AND length(trim(u.name)) > 0) AS "hasName"
         FROM public.auth_users u WHERE u.id = $1 AND u.email_verified = true`,
        [userId],
      );
      const account = result.rows[0];
      if (!account?.hasGoogle) return 'ineligible';
      return account.hasPassword && account.hasName ? 'already_configured' : 'needs_setup';
    },
  };
}
