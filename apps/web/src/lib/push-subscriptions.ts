import { subscribePush, unsubscribePush } from './notifications-api';

const deviceStorageKey = 'windops-push-device-id';

export function getPushDeviceId() {
  let deviceId = localStorage.getItem(deviceStorageKey);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(deviceStorageKey, deviceId);
  }
  return deviceId;
}

function decodeApplicationServerKey(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function enablePushOnDevice(workspaceId: string, publicKey: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window))
    throw new Error('Este navegador não oferece notificações push.');
  const existingRegistration = await navigator.serviceWorker.getRegistration();
  if (!existingRegistration)
    throw new Error(
      'O service worker ainda não está disponível. Recarregue o app e tente novamente.',
    );
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeApplicationServerKey(publicKey),
    }));
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    await subscription.unsubscribe();
    throw new Error('O navegador não retornou os dados necessários para ativar o push.');
  }
  try {
    await subscribePush(workspaceId, {
      deviceId: getPushDeviceId(),
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    });
  } catch (error) {
    await subscription.unsubscribe();
    throw error;
  }
}

export async function disablePushOnDevice(workspaceId: string) {
  const registration = await navigator.serviceWorker?.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  const deviceId = localStorage.getItem(deviceStorageKey);
  let serverRevoked = !deviceId;
  if (deviceId) {
    try {
      await unsubscribePush(workspaceId, deviceId);
      serverRevoked = true;
    } catch {
      serverRevoked = false;
    }
  }
  await subscription?.unsubscribe();
  return serverRevoked;
}

export async function clearPushOnSignOut(workspaceId: string) {
  try {
    await disablePushOnDevice(workspaceId);
  } catch {
    // Sign out remains available if notification revocation cannot reach the API.
    const registration = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
    const subscription = await registration?.pushManager.getSubscription().catch(() => undefined);
    await subscription?.unsubscribe().catch(() => false);
  }
}
