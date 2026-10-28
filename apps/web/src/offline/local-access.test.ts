import { afterEach, describe, expect, it } from 'vitest';
import {
  currentAccountGeneration,
  disconnectLocalAccount,
  isLocalAccountDisconnected,
  readLocalAccess,
  reconnectLocalAccount,
  registerOfflineResource,
  rememberLocalAccess,
} from './local-access';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe('acesso local previamente validado', () => {
  afterEach(() => {
    disconnectLocalAccount(memoryStorage());
  });

  it('persiste apenas a identidade particionada, sem cargo ou credencial', () => {
    const storage = memoryStorage();
    rememberLocalAccess(
      {
        accountId: '10000000-0000-4000-8000-000000000001',
        workspaceId: '20000000-0000-4000-8000-000000000001',
        validatedAt: '2026-10-27T12:00:00.000Z',
      },
      storage,
    );
    expect(readLocalAccess(storage)).toEqual({
      accountId: '10000000-0000-4000-8000-000000000001',
      workspaceId: '20000000-0000-4000-8000-000000000001',
      validatedAt: '2026-10-27T12:00:00.000Z',
    });
    expect(storage.getItem('windops-local-access-v1')).not.toMatch(/role|token|cookie|password/i);
  });

  it('desconecta recursos e remove o acesso local sem apagar o journal particionado', () => {
    const storage = memoryStorage();
    rememberLocalAccess(
      {
        accountId: '10000000-0000-4000-8000-000000000001',
        workspaceId: '20000000-0000-4000-8000-000000000001',
        validatedAt: '2026-10-27T12:00:00.000Z',
      },
      storage,
    );
    let stopped = 0;
    const unregister = registerOfflineResource(() => {
      stopped += 1;
    });
    const before = currentAccountGeneration();
    disconnectLocalAccount(storage);
    unregister();
    expect(stopped).toBe(1);
    expect(readLocalAccess(storage)).toBeNull();
    expect(isLocalAccountDisconnected('10000000-0000-4000-8000-000000000001', storage)).toBe(true);
    expect(currentAccountGeneration()).toBe(before + 1);
    reconnectLocalAccount(storage);
    expect(isLocalAccountDisconnected('10000000-0000-4000-8000-000000000001', storage)).toBe(false);
  });
});
