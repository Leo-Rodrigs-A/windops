import { z } from 'zod';

const hintSchema = z
  .object({
    accountId: z.uuid(),
    workspaceId: z.uuid(),
    validatedAt: z.string().datetime(),
  })
  .strict();

export type LocalAccessHint = z.infer<typeof hintSchema>;
const hintKey = 'windops-local-access-v1';
const disconnectedKey = 'windops-local-disconnected-account-v1';
const channelName = 'windops-local-access-v1';
const resources = new Set<() => void>();
let channel: BroadcastChannel | undefined;
let generation = 0;

function browserStorage(storage?: Storage) {
  try {
    return storage ?? globalThis.localStorage;
  } catch {
    return null;
  }
}

function getChannel() {
  if (typeof BroadcastChannel === 'undefined') return undefined;
  channel ??= new BroadcastChannel(channelName);
  return channel;
}

export function rememberLocalAccess(hint: LocalAccessHint, storage?: Storage) {
  try {
    browserStorage(storage)?.setItem(hintKey, JSON.stringify(hintSchema.parse(hint)));
  } catch {
    // Offline access remains unavailable if the browser refuses local storage.
  }
}

export function readLocalAccess(storage?: Storage): LocalAccessHint | null {
  try {
    const value = browserStorage(storage)?.getItem(hintKey);
    return value ? hintSchema.parse(JSON.parse(value)) : null;
  } catch {
    return null;
  }
}

export function registerOfflineResource(stop: () => void) {
  resources.add(stop);
  return () => resources.delete(stop);
}

export function currentAccountGeneration() {
  return generation;
}

export function isCurrentAccountGeneration(value: number) {
  return generation === value;
}

export function disconnectLocalAccount(storage?: Storage, accountId?: string) {
  const target = browserStorage(storage);
  const hint = readLocalAccess(target ?? undefined);
  const disconnectedAccountId = accountId ?? hint?.accountId;
  generation += 1;
  try {
    target?.removeItem(hintKey);
    if (disconnectedAccountId) target?.setItem(disconnectedKey, disconnectedAccountId);
  } catch {
    /* The local session is still disconnected in memory. */
  }
  for (const stop of resources) stop();
  resources.clear();
  getChannel()?.postMessage({ type: 'disconnect', accountId: disconnectedAccountId });
  return hint;
}

export function isLocalAccountDisconnected(accountId: string, storage?: Storage) {
  try {
    return browserStorage(storage)?.getItem(disconnectedKey) === accountId;
  } catch {
    return false;
  }
}

export function reconnectLocalAccount(storage?: Storage) {
  try {
    browserStorage(storage)?.removeItem(disconnectedKey);
  } catch {
    // A successful online login still proceeds if local storage is unavailable.
  }
}

export function blockRevokedWorkspace(accountId: string, storage?: Storage) {
  const target = browserStorage(storage);
  const hint = readLocalAccess(target ?? undefined);
  if (hint?.accountId === accountId) {
    try {
      target?.removeItem(hintKey);
    } catch {
      /* Continue stopping local workers. */
    }
  }
  generation += 1;
  for (const stop of resources) stop();
  resources.clear();
  getChannel()?.postMessage({ type: 'revoked', accountId });
  return hint?.accountId === accountId ? hint : null;
}

export function subscribeToLocalDisconnect(
  onDisconnect: (accountId?: string, revoked?: boolean) => void,
) {
  const bus = getChannel();
  if (!bus) return () => undefined;
  const listener = (event: MessageEvent<unknown>) => {
    const parsed = z
      .object({ type: z.enum(['disconnect', 'revoked']), accountId: z.uuid().optional() })
      .safeParse(event.data);
    if (!parsed.success) return;
    generation += 1;
    for (const stop of resources) stop();
    resources.clear();
    onDisconnect(parsed.data.accountId, parsed.data.type === 'revoked');
  };
  bus.addEventListener('message', listener);
  return () => bus.removeEventListener('message', listener);
}
