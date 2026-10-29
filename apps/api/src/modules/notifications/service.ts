import type { PoolClient } from 'pg';

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
}

export function createNotificationsService(): NotificationsService {
  return {
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
  };
}
