import webpush from 'web-push';
export interface PushConfig {
  subject: string;
  publicKey: string;
  privateKey: string;
}
export function createPushSender(config: PushConfig) {
  return {
    async send(
      subscription: webpush.PushSubscription,
      message: { title: string; body: string; url: string; eventId: string },
    ) {
      return webpush.sendNotification(subscription, JSON.stringify(message), {
        TTL: 3600,
        vapidDetails: config,
      });
    },
  };
}
