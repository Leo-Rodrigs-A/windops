import { createHash, randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import type {
  Notification,
  NotificationsPage,
  NotificationsQuery,
  PushSubscriptionInput,
} from '@windops/contracts';
import type { Pool, PoolClient } from 'pg';
import type { WorkspaceAuthorizationService } from '../workspaces/index.js';

export type NotificationEvent = {
  id: string;
  workspaceId: string;
  issueId: string;
  actorUserId: string;
  type:
    | 'created'
    | 'edited'
    | 'started'
    | 'returned'
    | 'released'
    | 'completed'
    | 'archived'
    | 'reopened'
    | 'reactivated';
};

export interface NotificationsService {
  recordIssueEvent(client: PoolClient, event: NotificationEvent): Promise<void>;
  list(
    workspaceId: string,
    userId: string,
    query: NotificationsQuery,
  ): Promise<NotificationsPage | { status: 'invalid_cursor' }>;
  markRead(
    headers: IncomingHttpHeaders,
    authorization: WorkspaceAuthorizationService,
    workspaceId: string,
    notificationId: string,
  ): Promise<
    | { status: 'ok'; value: Notification }
    | { status: 'unauthenticated' | 'forbidden' | 'not_found' }
  >;
  pushStatus(): { enabled: boolean; publicKey: string | null };
  subscribe(
    headers: IncomingHttpHeaders,
    authorization: WorkspaceAuthorizationService,
    workspaceId: string,
    input: PushSubscriptionInput,
  ): Promise<{ status: 'ok' | 'unauthenticated' | 'forbidden' | 'invalid_endpoint' }>;
  unsubscribe(
    headers: IncomingHttpHeaders,
    authorization: WorkspaceAuthorizationService,
    workspaceId: string,
    deviceId: string,
  ): Promise<{ status: 'ok' | 'unauthenticated' | 'forbidden' }>;
}

function allowedPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === 'https:' &&
      (url.port === '' || url.port === '443') &&
      !url.username &&
      !url.password &&
      (host === 'fcm.googleapis.com' ||
        host === 'push.services.mozilla.com' ||
        host === 'updates.push.services.mozilla.com' ||
        host === 'notify.windows.com' ||
        host.endsWith('.notify.windows.com') ||
        host === 'web.push.apple.com' ||
        host.endsWith('.push.apple.com'))
    );
  } catch {
    return false;
  }
}

export function createNotificationsService(pool?: Pool, publicKey?: string): NotificationsService {
  return {
    pushStatus() {
      return {
        enabled: Boolean(pool && publicKey),
        publicKey: pool && publicKey ? publicKey : null,
      };
    },
    async recordIssueEvent(client, event) {
      if (event.type === 'completed') {
        await client.query(
          `UPDATE public.notifications
           SET suppressed_at = clock_timestamp()
           WHERE workspace_id = $1 AND issue_id = $2 AND type = 'created'
             AND suppressed_at IS NULL AND read_at IS NULL`,
          [event.workspaceId, event.issueId],
        );
        await client.query(
          `UPDATE public.notification_deliveries d
           SET status = 'cancelled', cancelled_at = clock_timestamp()
           WHERE d.workspace_id = $1 AND d.issue_id = $2 AND d.status = 'pending'
             AND EXISTS (
               SELECT 1 FROM public.issue_events e
               WHERE e.id = d.event_id AND e.type = 'created'
             )`,
          [event.workspaceId, event.issueId],
        );
      }

      await client.query(
        `INSERT INTO public.notifications
           (id, workspace_id, recipient_user_id, issue_id, event_id, actor_user_id, type)
         SELECT gen_random_uuid(), $1, wm.user_id, $2, $3, $4, $5
         FROM public.workspace_members wm
         WHERE wm.workspace_id = $1 AND wm.revoked_at IS NULL AND wm.user_id <> $4
         ON CONFLICT (workspace_id, recipient_user_id, event_id) DO NOTHING`,
        [event.workspaceId, event.issueId, event.id, event.actorUserId, event.type],
      );

      if (event.type === 'created') {
        await client.query(
          `INSERT INTO public.notification_deliveries
             (id, workspace_id, event_id, issue_id, recipient_user_id, subscription_id)
           SELECT gen_random_uuid(), $1, $2, $3, n.recipient_user_id, ps.id
           FROM public.notifications n
           JOIN public.push_subscriptions ps
             ON ps.workspace_id = n.workspace_id AND ps.user_id = n.recipient_user_id
                AND ps.revoked_at IS NULL
           WHERE n.workspace_id = $1 AND n.event_id = $2 AND n.issue_id = $3
             AND n.suppressed_at IS NULL
           ON CONFLICT (workspace_id, recipient_user_id, event_id, subscription_id) DO NOTHING`,
          [event.workspaceId, event.id, event.issueId],
        );
      }
    },
    async list(workspaceId, userId, query) {
      if (!pool) throw new Error('Notification queries require a database pool.');
      const unread = await pool.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM public.notifications
         WHERE workspace_id = $1 AND recipient_user_id = $2
           AND read_at IS NULL AND suppressed_at IS NULL`,
        [workspaceId, userId],
      );
      const cursor = query.cursor
        ? await pool.query<{ createdAt: Date }>(
            `SELECT created_at AS "createdAt" FROM public.notifications
             WHERE workspace_id = $1 AND recipient_user_id = $2 AND id = $3`,
            [workspaceId, userId, query.cursor],
          )
        : null;
      if (cursor && !cursor.rows[0]) return { status: 'invalid_cursor' };
      const rows = await pool.query<{
        id: string;
        issueId: string;
        type: Notification['type'];
        createdAt: Date;
        readAt: Date | null;
      }>(
        `SELECT id, issue_id AS "issueId", type, created_at AS "createdAt", read_at AS "readAt"
         FROM public.notifications
         WHERE workspace_id = $1 AND recipient_user_id = $2 AND suppressed_at IS NULL
           AND ($3::timestamptz IS NULL OR (created_at, id) < ($3, $4::uuid))
         ORDER BY created_at DESC, id DESC LIMIT $5`,
        [
          workspaceId,
          userId,
          cursor?.rows[0]?.createdAt ?? null,
          query.cursor ?? null,
          query.limit + 1,
        ],
      );
      const page = rows.rows.slice(0, query.limit);
      return {
        items: page.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          readAt: row.readAt?.toISOString() ?? null,
        })),
        nextCursor: rows.rows.length > query.limit ? (page.at(-1)?.id ?? null) : null,
        unreadCount: unread.rows[0]?.count ?? 0,
      };
    },
    async markRead(headers, authorization, workspaceId, notificationId) {
      if (!pool) throw new Error('Notification writes require a database pool.');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const permission = await authorization.authorizeWorkspaceInTransaction(
          client,
          headers,
          workspaceId,
        );
        if (permission.status !== 'ok') {
          await client.query('ROLLBACK');
          return permission;
        }
        const result = await client.query<{
          id: string;
          issueId: string;
          type: Notification['type'];
          createdAt: Date;
          readAt: Date | null;
        }>(
          `UPDATE public.notifications SET read_at = COALESCE(read_at, clock_timestamp())
         WHERE workspace_id = $1 AND recipient_user_id = $2 AND id = $3
           AND suppressed_at IS NULL
         RETURNING id, issue_id AS "issueId", type, created_at AS "createdAt", read_at AS "readAt"`,
          [workspaceId, permission.value.user.id, notificationId],
        );
        const row = result.rows[0];
        if (!row) {
          await client.query('ROLLBACK');
          return { status: 'not_found' };
        }
        await client.query('COMMIT');
        return {
          status: 'ok',
          value: {
            ...row,
            createdAt: row.createdAt.toISOString(),
            readAt: row.readAt?.toISOString() ?? null,
          },
        };
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
    async subscribe(headers, authorization, workspaceId, input) {
      if (!allowedPushEndpoint(input.endpoint)) return { status: 'invalid_endpoint' };
      if (!pool) throw new Error('Push subscriptions require a database pool.');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const permission = await authorization.authorizeWorkspaceInTransaction(
          client,
          headers,
          workspaceId,
        );
        if (permission.status !== 'ok') {
          await client.query('ROLLBACK');
          return permission;
        }
        const userId = permission.value.user.id;
        const endpointHash = createHash('sha256').update(input.endpoint).digest();
        const existing = await client.query<{ id: string; endpointHash: Buffer }>(
          `SELECT id, endpoint_hash AS "endpointHash" FROM public.push_subscriptions
           WHERE workspace_id = $1 AND user_id = $2 AND device_id = $3 AND revoked_at IS NULL
           FOR UPDATE`,
          [workspaceId, userId, input.deviceId],
        );
        if (existing.rows[0]?.endpointHash.equals(endpointHash)) {
          await client.query(
            `UPDATE public.push_subscriptions SET p256dh = $2, auth_secret = $3, updated_at = clock_timestamp()
             WHERE id = $1`,
            [existing.rows[0].id, input.keys.p256dh, input.keys.auth],
          );
        } else {
          await client.query(
            `UPDATE public.push_subscriptions SET revoked_at = clock_timestamp(), updated_at = clock_timestamp()
             WHERE workspace_id = $1 AND user_id = $2 AND device_id = $3 AND revoked_at IS NULL`,
            [workspaceId, userId, input.deviceId],
          );
          await client.query(
            `UPDATE public.notification_deliveries SET status = 'cancelled', cancelled_at = clock_timestamp()
             WHERE status = 'pending' AND subscription_id IN (
               SELECT id FROM public.push_subscriptions
               WHERE workspace_id = $1 AND user_id = $2 AND device_id = $3 AND revoked_at IS NOT NULL
             )`,
            [workspaceId, userId, input.deviceId],
          );
          await client.query(
            `INSERT INTO public.push_subscriptions
               (id, workspace_id, user_id, device_id, endpoint, endpoint_hash, p256dh, auth_secret)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              randomUUID(),
              workspaceId,
              userId,
              input.deviceId,
              input.endpoint,
              endpointHash,
              input.keys.p256dh,
              input.keys.auth,
            ],
          );
        }
        await client.query('COMMIT');
        return { status: 'ok' };
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
    async unsubscribe(headers, authorization, workspaceId, deviceId) {
      if (!pool) throw new Error('Push subscriptions require a database pool.');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const permission = await authorization.authorizeWorkspaceInTransaction(
          client,
          headers,
          workspaceId,
        );
        if (permission.status !== 'ok') {
          await client.query('ROLLBACK');
          return permission;
        }
        await client.query(
          `UPDATE public.push_subscriptions SET revoked_at = COALESCE(revoked_at, clock_timestamp()), updated_at = clock_timestamp()
           WHERE workspace_id = $1 AND user_id = $2 AND device_id = $3`,
          [workspaceId, permission.value.user.id, deviceId],
        );
        await client.query(
          `UPDATE public.notification_deliveries SET status = 'cancelled', cancelled_at = clock_timestamp()
           WHERE workspace_id = $1 AND recipient_user_id = $2 AND status = 'pending'
             AND subscription_id IN (
               SELECT id FROM public.push_subscriptions
               WHERE workspace_id = $1 AND user_id = $2 AND device_id = $3
             )`,
          [workspaceId, permission.value.user.id, deviceId],
        );
        await client.query('COMMIT');
        return { status: 'ok' };
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
