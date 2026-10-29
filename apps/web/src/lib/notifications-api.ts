import {
  type Notification,
  type NotificationsPage,
  notificationSchema,
  notificationsPageSchema,
  pushStatusSchema,
} from '@windops/contracts';
import { z } from 'zod';
import { requestJson } from './auth-api';

const pushResultSchema = z.object({ status: z.literal('subscribed') }).strict();

function notificationsPath(workspaceId: string) {
  return `/api/workspaces/${encodeURIComponent(workspaceId)}/notifications`;
}

export async function getNotifications(
  workspaceId: string,
  query: { limit?: number; cursor?: string } = {},
): Promise<NotificationsPage> {
  const search = new URLSearchParams();
  if (query.limit) search.set('limit', String(query.limit));
  if (query.cursor) search.set('cursor', query.cursor);
  const suffix = search.size ? `?${search.toString()}` : '';
  return notificationsPageSchema.parse(
    await requestJson(`${notificationsPath(workspaceId)}${suffix}`),
  );
}

export async function markNotificationRead(workspaceId: string, notificationId: string) {
  return notificationSchema.parse(
    await requestJson(
      `${notificationsPath(workspaceId)}/${encodeURIComponent(notificationId)}/read`,
      {
        method: 'POST',
      },
    ),
  ) as Notification;
}

export async function getPushStatus(workspaceId: string) {
  return pushStatusSchema.parse(await requestJson(`${notificationsPath(workspaceId)}/push/status`));
}

export async function subscribePush(
  workspaceId: string,
  input: { deviceId: string; endpoint: string; keys: { p256dh: string; auth: string } },
) {
  return pushResultSchema.parse(
    await requestJson(`${notificationsPath(workspaceId)}/push-subscriptions`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  );
}

export async function unsubscribePush(workspaceId: string, deviceId: string) {
  await requestJson(
    `${notificationsPath(workspaceId)}/push-subscriptions/${encodeURIComponent(deviceId)}`,
    { method: 'DELETE' },
  );
}
