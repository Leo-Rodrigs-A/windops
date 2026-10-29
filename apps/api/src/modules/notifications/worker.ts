import type { Pool } from 'pg';

export type PushPayload = { title: string; body: string; url: string; eventId: string };
export type PushSender = {
  send(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: PushPayload,
  ): Promise<unknown>;
};

type ClaimedDelivery = {
  id: string;
  workspaceId: string;
  userId: string;
  eventId: string;
  endpoint: string;
  p256dh: string;
  authSecret: string;
  type: string;
  issueId: string;
};

export function createNotificationWorker(
  pool: Pool,
  sender: PushSender,
  options?: {
    intervalMs?: number;
    batchSize?: number;
    leaseSeconds?: number;
    onError?: (errorCode: string) => void;
  },
) {
  const intervalMs = options?.intervalMs ?? 5_000;
  const batchSize = options?.batchSize ?? 25;
  const leaseSeconds = options?.leaseSeconds ?? 60;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = true;
  let running: Promise<void> | undefined;

  async function claim(): Promise<ClaimedDelivery[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE public.notification_deliveries d
         SET status = 'cancelled', cancelled_at = clock_timestamp(), lease_until = NULL
         WHERE d.status IN ('pending', 'claimed')
           AND (d.status = 'pending' OR d.lease_until <= clock_timestamp())
           AND (NOT EXISTS (
             SELECT 1 FROM public.workspace_members wm
             WHERE wm.workspace_id = d.workspace_id AND wm.user_id = d.recipient_user_id AND wm.revoked_at IS NULL
           ) OR NOT EXISTS (
             SELECT 1 FROM public.push_subscriptions ps
             WHERE ps.id = d.subscription_id AND ps.revoked_at IS NULL
           ))`,
      );
      const claimed = await client.query<ClaimedDelivery>(
        `WITH candidates AS (
           SELECT d.id
           FROM public.notification_deliveries d
           JOIN public.push_subscriptions ps ON ps.id = d.subscription_id
             AND ps.revoked_at IS NULL
           JOIN public.workspace_members wm ON wm.workspace_id = d.workspace_id
             AND wm.user_id = d.recipient_user_id AND wm.revoked_at IS NULL
           WHERE (d.status = 'pending' AND d.available_at <= clock_timestamp())
              OR (d.status = 'claimed' AND d.lease_until <= clock_timestamp())
           ORDER BY d.available_at, d.created_at, d.id
           FOR UPDATE OF d SKIP LOCKED LIMIT $1
         )
         UPDATE public.notification_deliveries d
         SET status = 'claimed', attempts = attempts + 1,
             claimed_at = clock_timestamp(), lease_until = clock_timestamp() + ($2 * interval '1 second')
         FROM candidates c, public.push_subscriptions ps, public.issue_events e
         WHERE d.id = c.id AND ps.id = d.subscription_id AND ps.revoked_at IS NULL
           AND e.id = d.event_id AND e.workspace_id = d.workspace_id
         RETURNING d.id, d.workspace_id AS "workspaceId", d.recipient_user_id AS "userId",
           d.event_id AS "eventId", ps.endpoint, ps.p256dh, ps.auth_secret AS "authSecret",
           e.type, d.issue_id AS "issueId"`,
        [batchSize, leaseSeconds],
      );
      await client.query('COMMIT');
      return claimed.rows;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async function updateFailure(delivery: ClaimedDelivery, statusCode: number | null) {
    const expired = statusCode === 404 || statusCode === 410;
    const retryable =
      statusCode === 429 || (statusCode !== null && statusCode >= 500) || statusCode === null;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (expired) {
        await client.query(
          `UPDATE public.push_subscriptions SET revoked_at = clock_timestamp(), updated_at = clock_timestamp()
           WHERE id = (SELECT subscription_id FROM public.notification_deliveries WHERE id = $1)`,
          [delivery.id],
        );
      }
      await client.query(
        `UPDATE public.notification_deliveries
         SET status = CASE WHEN $2 OR attempts >= 8 THEN 'dead' ELSE 'pending' END,
             available_at = clock_timestamp() + (LEAST(3600, power(2, LEAST(attempts, 10)) * 5) * interval '1 second'),
             lease_until = NULL,
             last_error_code = $3
         WHERE id = $1 AND status = 'claimed'`,
        [
          delivery.id,
          expired || !retryable,
          statusCode === null ? 'network_error' : `http_${statusCode}`,
        ],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async function runOnce() {
    const deliveries = await claim();
    for (const delivery of deliveries) {
      try {
        const eligible = await pool.query(
          `SELECT 1 FROM public.notification_deliveries d
           JOIN public.push_subscriptions ps ON ps.id = d.subscription_id AND ps.revoked_at IS NULL
           JOIN public.workspace_members wm ON wm.workspace_id = d.workspace_id
             AND wm.user_id = d.recipient_user_id AND wm.revoked_at IS NULL
           WHERE d.id = $1 AND d.status = 'claimed' AND d.lease_until > clock_timestamp()`,
          [delivery.id],
        );
        if (!eligible.rowCount) {
          await pool.query(
            `UPDATE public.notification_deliveries SET status = 'cancelled', cancelled_at = clock_timestamp(), lease_until = NULL
             WHERE id = $1 AND status = 'claimed'`,
            [delivery.id],
          );
          continue;
        }
        await sender.send(
          {
            endpoint: delivery.endpoint,
            keys: { p256dh: delivery.p256dh, auth: delivery.authSecret },
          },
          {
            title: 'Novo chamado',
            body: 'Um novo chamado foi registrado no seu workspace.',
            url: `/chamados/${delivery.issueId}`,
            eventId: delivery.eventId,
          },
        );
        await pool.query(
          `UPDATE public.notification_deliveries
           SET status = 'sent', sent_at = clock_timestamp(), lease_until = NULL
           WHERE id = $1 AND status = 'claimed'`,
          [delivery.id],
        );
      } catch (error) {
        const statusCode =
          error && typeof error === 'object' && 'statusCode' in error
            ? Number((error as { statusCode: unknown }).statusCode)
            : null;
        options?.onError?.(statusCode === null ? 'network_error' : `http_${statusCode}`);
        await updateFailure(delivery, Number.isInteger(statusCode) ? statusCode : null);
      }
    }
  }

  function schedule() {
    if (stopped) return;
    timer = setTimeout(() => {
      running = runOnce()
        .catch(() => options?.onError?.('worker_error'))
        .finally(() => {
          running = undefined;
          schedule();
        });
    }, intervalMs);
    timer.unref?.();
  }

  return {
    runOnce,
    start() {
      if (!stopped) return;
      stopped = false;
      schedule();
    },
    async stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      await running;
    },
  };
}
