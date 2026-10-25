import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { EmailSender } from '../../platform/email.js';

const challengeLifetimeMs = 15 * 60 * 1000;
const resendWindowMs = 15 * 60 * 1000;
const resendCooldownMs = 60 * 1000;
const maxAttempts = 5;
const maxSends = 3;
const activeSessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;

export type ChallengeFailure =
  | 'invalid'
  | 'expired'
  | 'cooldown'
  | 'send_limit'
  | 'rate_limit'
  | 'delivery';

export class ChallengeError extends Error {
  constructor(readonly reason: ChallengeFailure) {
    super('Email verification challenge could not be completed.');
    this.name = 'ChallengeError';
  }
}

export class LoginChallengeService {
  private readonly macKey: Buffer;

  constructor(
    private readonly pool: Pool,
    secret: string,
    private readonly emailSender: EmailSender,
  ) {
    this.macKey = createHmac('sha256', secret).update('windops/email-second-step/v1').digest();
  }

  async issueForNewSession(sessionId: string, email: string): Promise<void> {
    const client = await this.pool.connect();
    let code: string | undefined;
    try {
      await client.query('BEGIN');
      const session = await this.lockPendingSession(client, sessionId);
      if (!session) throw new ChallengeError('invalid');
      const existing = await client.query(
        'SELECT consumed_at FROM public.auth_login_challenges WHERE session_id = $1 FOR UPDATE',
        [sessionId],
      );
      if (existing.rowCount === 0) {
        code = this.newCode();
        const challengeId = randomUUID();
        const nowResult = await client.query<{ at: Date }>('SELECT clock_timestamp() AS at');
        const now = nowResult.rows[0]?.at;
        if (!now) throw new Error('Database clock unavailable.');
        await client.query(
          `INSERT INTO public.auth_login_challenges
             (id, session_id, code_mac, expires_at, sent_at, window_started_at)
           VALUES ($1, $2, $3, $4, $5, $5)`,
          [
            challengeId,
            sessionId,
            this.mac(challengeId, sessionId, code),
            new Date(now.getTime() + challengeLifetimeMs),
            now,
          ],
        );
        await client.query(
          `UPDATE public.auth_sessions
           SET expires_at = $2, updated_at = $3
           WHERE id = $1 AND email_second_step_at IS NULL`,
          [sessionId, new Date(now.getTime() + challengeLifetimeMs), now],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    if (code) await this.deliver(email, code);
  }

  async consumeRateLimit(
    scope: string,
    principal: string,
    max: number,
    windowMs: number,
  ): Promise<void> {
    const hashedPrincipal = createHmac('sha256', this.macKey)
      .update(`${scope}:${principal}`)
      .digest('hex');
    const key = `windops:${scope}:${hashedPrincipal}`;
    const result = await this.pool.query<{ count: number }>(
      `INSERT INTO public.auth_rate_limits (key, count, last_request)
       VALUES ($1, 1, floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE
           WHEN public.auth_rate_limits.last_request < floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint - $2
             THEN 1
           ELSE public.auth_rate_limits.count + 1
         END,
         last_request = floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint
       RETURNING count`,
      [key, windowMs],
    );
    const rate = result.rows[0];
    if (!rate || rate.count > max) throw new ChallengeError('rate_limit');
  }

  async resend(sessionId: string): Promise<void> {
    const client = await this.pool.connect();
    let email = '';
    let code = '';
    try {
      await client.query('BEGIN');
      const session = await this.lockPendingSession(client, sessionId);
      if (!session || session.email_second_step_at) throw new ChallengeError('invalid');
      const challengeResult = await client.query<{
        id: string;
        code_mac: Buffer;
        expires_at: Date;
        attempts: number;
        sent_at: Date;
        send_count: number;
        window_started_at: Date;
        consumed_at: Date | null;
      }>(
        `SELECT id, code_mac, expires_at, attempts, sent_at, send_count, window_started_at, consumed_at
         FROM public.auth_login_challenges WHERE session_id = $1 FOR UPDATE`,
        [sessionId],
      );
      const challenge = challengeResult.rows[0];
      const nowResult = await client.query<{ at: Date }>('SELECT clock_timestamp() AS at');
      const now = nowResult.rows[0]?.at;
      if (!now) throw new Error('Database clock unavailable.');
      if (
        !challenge ||
        challenge.consumed_at ||
        challenge.attempts >= maxAttempts ||
        session.expires_at <= now
      )
        throw new ChallengeError('expired');
      if (now.getTime() - challenge.sent_at.getTime() < resendCooldownMs)
        throw new ChallengeError('cooldown');
      const windowExpired = now.getTime() - challenge.window_started_at.getTime() >= resendWindowMs;
      if (!windowExpired && challenge.send_count >= maxSends)
        throw new ChallengeError('send_limit');

      email = session.email;
      code = this.newCode();
      const challengeId = challenge.id;
      const expiresAt = new Date(now.getTime() + challengeLifetimeMs);
      await client.query(
        `UPDATE public.auth_login_challenges
         SET code_mac = $2, expires_at = $3, sent_at = $4,
             send_count = $5, window_started_at = $6, attempts = 0,
             updated_at = $4
         WHERE id = $1`,
        [
          challengeId,
          this.mac(challengeId, sessionId, code),
          expiresAt,
          now,
          windowExpired ? 1 : challenge.send_count + 1,
          windowExpired ? now : challenge.window_started_at,
        ],
      );
      await client.query(
        'UPDATE public.auth_sessions SET expires_at = $2, updated_at = $3 WHERE id = $1',
        [sessionId, expiresAt, now],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    await this.deliver(email, code);
  }

  async verify(sessionId: string, submittedCode: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const session = await this.lockPendingSession(client, sessionId);
      const challengeResult = await client.query<{
        id: string;
        code_mac: Buffer;
        expires_at: Date;
        attempts: number;
        consumed_at: Date | null;
      }>(
        `SELECT id, code_mac, expires_at, attempts, consumed_at
         FROM public.auth_login_challenges WHERE session_id = $1 FOR UPDATE`,
        [sessionId],
      );
      const challenge = challengeResult.rows[0];
      const nowResult = await client.query<{ at: Date }>('SELECT clock_timestamp() AS at');
      const now = nowResult.rows[0]?.at;
      if (!now) throw new Error('Database clock unavailable.');
      if (
        !session ||
        session.email_second_step_at ||
        session.expires_at <= now ||
        !challenge ||
        challenge.consumed_at ||
        challenge.expires_at <= now ||
        challenge.attempts >= maxAttempts
      ) {
        if (session && !session.email_second_step_at) {
          await client.query('DELETE FROM public.auth_sessions WHERE id = $1', [sessionId]);
        }
        await client.query('COMMIT');
        throw new ChallengeError('expired');
      }

      const expected = this.mac(challenge.id, sessionId, submittedCode);
      const valid =
        challenge.code_mac.length === expected.length &&
        timingSafeEqual(challenge.code_mac, expected);
      if (!valid) {
        const attempts = challenge.attempts + 1;
        await client.query(
          'UPDATE public.auth_login_challenges SET attempts = $2, updated_at = $3 WHERE id = $1',
          [challenge.id, attempts, now],
        );
        if (attempts >= maxAttempts)
          await client.query('DELETE FROM public.auth_sessions WHERE id = $1', [sessionId]);
        await client.query('COMMIT');
        throw new ChallengeError('invalid');
      }

      await client.query(
        'UPDATE public.auth_login_challenges SET consumed_at = $2, updated_at = $2 WHERE id = $1',
        [challenge.id, now],
      );
      await client.query(
        `UPDATE public.auth_sessions
         SET email_second_step_at = $2, expires_at = $3, updated_at = $2
         WHERE id = $1 AND email_second_step_at IS NULL`,
        [sessionId, now, new Date(now.getTime() + activeSessionLifetimeMs)],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async getState(sessionId: string): Promise<{
    email: string;
    userId: string;
    emailSecondStepAt: Date | null;
    expiresAt: Date;
  } | null> {
    const result = await this.pool.query<{
      email: string;
      user_id: string;
      email_second_step_at: Date | null;
      expires_at: Date;
    }>(
      `SELECT u.email, u.id AS user_id, s.email_second_step_at, s.expires_at
       FROM public.auth_sessions s
       JOIN public.auth_users u ON u.id = s.user_id
       WHERE s.id = $1 AND s.expires_at > clock_timestamp()`,
      [sessionId],
    );
    const row = result.rows[0];
    return row
      ? {
          email: row.email,
          userId: row.user_id,
          emailSecondStepAt: row.email_second_step_at,
          expiresAt: row.expires_at,
        }
      : null;
  }

  private async lockPendingSession(client: PoolClient, sessionId: string) {
    const result = await client.query<{
      email: string;
      email_second_step_at: Date | null;
      expires_at: Date;
    }>(
      `SELECT u.email, s.email_second_step_at, s.expires_at
       FROM public.auth_sessions s
       JOIN public.auth_users u ON u.id = s.user_id
       WHERE s.id = $1 FOR UPDATE OF s`,
      [sessionId],
    );
    return result.rows[0] ?? null;
  }

  private newCode(): string {
    return String(randomInt(10_000_000, 100_000_000));
  }

  private mac(challengeId: string, sessionId: string, code: string): Buffer {
    return createHmac('sha256', this.macKey).update(`${challengeId}:${sessionId}:${code}`).digest();
  }

  private async deliver(email: string, code: string): Promise<void> {
    try {
      await this.emailSender.send({
        to: email,
        subject: 'Seu código de acesso ao Wind Ops',
        text: `Seu código de acesso é ${code}. Ele expira em 15 minutos. Se você não solicitou este código, ignore esta mensagem.`,
      });
    } catch {
      throw new ChallengeError('delivery');
    }
  }
}
