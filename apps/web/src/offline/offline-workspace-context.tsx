import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '../auth/auth-context';
import { type CommandSenderStatus, LocalCommandSender } from './command-sender';
import {
  type LocalIssueCommand,
  type LocalIssueStore,
  openLocalIssueStore,
  type ReplicaCollection,
} from './local-issue-store';
import { type ReplicaStatus, WorkspaceReplica } from './workspace-replica';

type Runtime = {
  key: string;
  store: LocalIssueStore | null;
  replica: WorkspaceReplica | null;
  sender: LocalCommandSender | null;
  replicaStatus: ReplicaStatus;
  senderStatus: CommandSenderStatus;
  persistentStorage: boolean | null;
  version: number;
  error: string | null;
};

export type OfflineWorkspaceState = {
  store: LocalIssueStore | null;
  workspaceId: string | null;
  workspaceName: string | null;
  online: boolean;
  canWriteLocally: boolean;
  ready: boolean;
  loading: boolean;
  error: string | null;
  persistentStorage: boolean | null;
  replicaStatus: ReplicaStatus | null;
  senderStatus: CommandSenderStatus | null;
  pendingCommands: LocalIssueCommand[];
  lastConfirmedAt: string | null;
  version: number;
  refreshLocal: () => void;
  retrySync: () => void;
};

const OfflineWorkspaceContext = createContext<OfflineWorkspaceState | null>(null);

export function OfflineWorkspaceProvider({ children }: { children: ReactNode }) {
  const { snapshot, refresh: refreshAuth } = useAuth();
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const runtimeRef = useRef<Runtime | null>(runtime);
  runtimeRef.current = runtime;

  const partition =
    snapshot.status === 'authenticated'
      ? { accountId: snapshot.me.user.id, workspaceId: snapshot.context.workspace.id }
      : snapshot.status === 'offline' || snapshot.status === 'revoked'
        ? { accountId: snapshot.accountId, workspaceId: snapshot.workspaceId }
        : null;
  const key = partition ? `${partition.accountId}:${partition.workspaceId}` : null;
  const accountId = partition?.accountId ?? null;
  const workspaceId = partition?.workspaceId ?? null;
  const runtimeInitialized = Boolean(
    runtime?.key === key && runtime.store && runtime.replica && runtime.sender,
  );

  useEffect(() => {
    const becameOnline = () => {
      setOnline(true);
      void refreshAuth();
    };
    const becameOffline = () => setOnline(false);
    window.addEventListener('online', becameOnline);
    window.addEventListener('offline', becameOffline);
    return () => {
      window.removeEventListener('online', becameOnline);
      window.removeEventListener('offline', becameOffline);
    };
  }, [refreshAuth]);

  useEffect(() => {
    if (!accountId || !workspaceId || !key) {
      setRuntime(null);
      setOpeningKey(null);
      return;
    }
    let active = true;
    let openedStore: LocalIssueStore | null = null;
    let openedReplica: WorkspaceReplica | null = null;
    let openedSender: LocalCommandSender | null = null;
    let unsubscribeStore: (() => void) | undefined;
    let unsubscribeReplica: (() => void) | undefined;
    let unsubscribeSender: (() => void) | undefined;
    setOpeningKey(key);
    setRuntime(null);
    void openLocalIssueStore({ accountId, workspaceId })
      .then(async (store) => {
        if (!active) {
          store.close();
          return;
        }
        const replica = new WorkspaceReplica(store);
        const sender = new LocalCommandSender(store);
        openedStore = store;
        openedReplica = replica;
        openedSender = sender;
        const current: Runtime = {
          key,
          store,
          replica,
          sender,
          replicaStatus: replica.getStatus(),
          senderStatus: sender.getStatus(),
          persistentStorage: null,
          version: 0,
          error: null,
        };
        setRuntime(current);
        unsubscribeStore = store.subscribe(() =>
          setRuntime((previous) =>
            previous?.key === key ? { ...previous, version: previous.version + 1 } : previous,
          ),
        );
        unsubscribeReplica = replica.subscribe((replicaStatus) =>
          setRuntime((previous) =>
            previous?.key === key ? { ...previous, replicaStatus } : previous,
          ),
        );
        unsubscribeSender = sender.subscribe((senderStatus) =>
          setRuntime((previous) =>
            previous?.key === key ? { ...previous, senderStatus } : previous,
          ),
        );
        try {
          const persistentStorage = await store.requestPersistentStorage();
          if (active)
            setRuntime((previous) =>
              previous?.key === key ? { ...previous, persistentStorage } : previous,
            );
        } catch {
          if (active)
            setRuntime((previous) =>
              previous?.key === key ? { ...previous, persistentStorage: false } : previous,
            );
        }
      })
      .catch((error: unknown) => {
        if (active)
          setRuntime({
            key,
            store: null,
            replica: null,
            sender: null,
            replicaStatus: emptyReplicaStatus(),
            senderStatus: { state: 'error', pendingCount: 0, lastError: null },
            persistentStorage: false,
            version: 0,
            error: error instanceof Error ? error.message : 'Falha ao abrir o armazenamento local.',
          });
      });
    return () => {
      active = false;
      unsubscribeStore?.();
      unsubscribeReplica?.();
      unsubscribeSender?.();
      openedSender?.stop();
      openedReplica?.close();
      openedStore?.close();
    };
  }, [accountId, key, workspaceId]);

  useEffect(() => {
    const current = runtimeRef.current;
    if (
      !runtimeInitialized ||
      !current ||
      !key ||
      current.key !== key ||
      !current.sender ||
      !current.replica
    )
      return;
    if (snapshot.status === 'authenticated' && online) {
      current.replica.start();
      current.sender.start();
    } else {
      current.sender.stop();
      current.replica.close();
    }
    return () => {
      current.sender?.stop();
      current.replica?.close();
    };
  }, [key, online, runtimeInitialized, snapshot.status]);

  const refreshLocal = useCallback(() => {
    setRuntime((previous) =>
      previous ? { ...previous, version: previous.version + 1 } : previous,
    );
  }, []);

  const retrySync = useCallback(() => {
    if (!runtime?.replica || !runtime.sender || !online || snapshot.status !== 'authenticated')
      return;
    runtime.replica.retry();
    runtime.sender.start();
    void runtime.sender.flush();
  }, [online, runtime, snapshot.status]);

  const currentRuntime = runtime?.key === key ? runtime : null;
  const collections: ReplicaCollection[] = [
    'workspace',
    'parks',
    'turbines',
    'issues',
    'issue-events',
  ];
  const lastConfirmedAt = currentRuntime?.store
    ? (collections
        .map((collection) => currentRuntime.store?.getCheckpoint(collection)?.updatedAt ?? null)
        .filter((value): value is string => value !== null)
        .sort()
        .at(-1) ?? null)
    : null;
  const cachedWorkspace = currentRuntime?.store?.listReplica('workspace')[0];
  const workspaceName =
    snapshot.status === 'authenticated'
      ? snapshot.context.workspace.name
      : typeof cachedWorkspace?.name === 'string'
        ? cachedWorkspace.name
        : snapshot.status === 'offline'
          ? 'Workspace'
          : null;

  const value = useMemo<OfflineWorkspaceState>(
    () => ({
      store: currentRuntime?.store ?? null,
      workspaceId,
      workspaceName,
      online,
      canWriteLocally:
        Boolean(currentRuntime?.store) &&
        (snapshot.status === 'authenticated' || snapshot.status === 'offline'),
      ready: currentRuntime?.store?.isReplicaReady() ?? false,
      loading: Boolean(key && openingKey === key && !currentRuntime && !runtime?.error),
      error: runtime?.key === key ? runtime.error : null,
      persistentStorage: currentRuntime?.persistentStorage ?? null,
      replicaStatus: currentRuntime?.replicaStatus ?? null,
      senderStatus: currentRuntime?.senderStatus ?? null,
      pendingCommands: currentRuntime?.store?.listPendingCommands() ?? [],
      lastConfirmedAt,
      version: currentRuntime?.version ?? 0,
      refreshLocal,
      retrySync,
    }),
    [
      currentRuntime,
      key,
      lastConfirmedAt,
      online,
      openingKey,
      refreshLocal,
      retrySync,
      runtime?.error,
      runtime?.key,
      snapshot.status,
      workspaceId,
      workspaceName,
    ],
  );

  return (
    <OfflineWorkspaceContext.Provider value={value}>{children}</OfflineWorkspaceContext.Provider>
  );
}

export function useOfflineWorkspace() {
  const value = useContext(OfflineWorkspaceContext);
  if (!value) throw new Error('useOfflineWorkspace must be used inside OfflineWorkspaceProvider.');
  return value;
}

function emptyReplicaStatus(): ReplicaStatus {
  return {
    ready: false,
    snapshots: {
      workspace: false,
      parks: false,
      turbines: false,
      issues: false,
      'issue-events': false,
    },
    caughtUp: {
      workspace: false,
      parks: false,
      turbines: false,
      issues: false,
      'issue-events': false,
    },
    errors: {},
  };
}
