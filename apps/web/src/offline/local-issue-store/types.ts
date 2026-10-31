import type { Issue } from '@windops/contracts';

export type LocalCommandStatus =
  | 'pending'
  | 'sending'
  | 'waiting_auth'
  | 'waiting_eligibility'
  | 'blocked'
  | 'conflict'
  | 'superseded'
  | 'rejected'
  | 'confirmed_waiting_replica'
  | 'confirmed';
export type LocalCommandKind = 'create' | 'update' | 'start' | 'return' | 'release' | 'complete';

export type ReplicaCollection = 'workspace' | 'parks' | 'turbines' | 'issues' | 'issue-events';

export type SyncedIssueRow = {
  id: string;
  workspaceId: string;
  parkId: string;
  turbineId: string;
  text: string;
  completionReport: string | null;
  archivedAt?: string | null;
  status: Issue['status'];
  createdAt: string;
  updatedAt: string;
  revision: number;
};

export type ReplicaRow = {
  id: string;
  workspaceId: string;
  [key: string]: unknown;
};

export type ReplicaCheckpoint = {
  collection: ReplicaCollection;
  workspaceId: string;
  offset: string;
  handle: string | null;
  snapshotComplete: boolean;
  updatedAt: string;
};

export type ReplicaChange = {
  operation: 'insert' | 'update' | 'delete';
  id: string;
  row?: ReplicaRow;
};

export type LocalIssueProjection = {
  id: string;
  workspaceId: string;
  serverIssue: SyncedIssueRow | null;
  local: {
    parkId: string;
    turbineId: string;
    text: string;
    status: Issue['status'] | 'local';
    completionReport?: string | null;
  };
  serverRevision: number | null;
  serverActive: boolean | null;
  localRevision: number;
  createdAt?: string;
  updatedAt: string;
  localIdentity?: {
    creatorUserId: string | null;
    creatorName: string | null;
    handlerUserId: string | null;
    handlerName: string | null;
  };
};

export type LocalIssueCommand = {
  id: string;
  issueId: string;
  chainId: string;
  workspaceId: string;
  kind: LocalCommandKind;
  payload: unknown;
  status: LocalCommandStatus;
  dependsOn: string | null;
  baseServerRevision: number | null;
  createdAt: string;
  attemptedAt: string | null;
  frozenPayload: unknown | null;
  blockReason: string | null;
  baseServerIssue?: SyncedIssueRow | null;
  acknowledgedIssue?: SyncedIssueRow | null;
};

export type JournalRow =
  | { id: string; kind: 'issue'; value: LocalIssueProjection }
  | { id: string; kind: 'command'; value: LocalIssueCommand }
  | {
      id: string;
      kind: 'replica';
      value: { collection: ReplicaCollection; row: ReplicaRow; active: boolean; cachedAt: string };
    }
  | { id: string; kind: 'checkpoint'; value: ReplicaCheckpoint }
  | { id: string; kind: 'revision'; value: { revision: number } };

export type Partition = { accountId: string; workspaceId: string };
