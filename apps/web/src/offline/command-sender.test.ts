import { indexedDB } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiRequestError } from '../lib/auth-api';
import { type CommandSenderTransport, LocalCommandSender } from './command-sender';
import {
  type LocalIssueCommand,
  type LocalIssueStore,
  openLocalIssueStore,
  type SyncedIssueRow,
} from './local-issue-store';

const basePartition = {
  accountId: '10000000-0000-4000-8000-000000000001',
  workspaceId: '20000000-0000-4000-8000-000000000001',
};
const issueId = '30000000-0000-4000-8000-000000000001';
const parkId = '40000000-0000-4000-8000-000000000001';
const turbineId = '50000000-0000-4000-8000-000000000001';
const stores: LocalIssueStore[] = [];

async function openStore(scope = { ...basePartition, workspaceId: crypto.randomUUID() }) {
  const store = await openLocalIssueStore(scope, indexedDB);
  stores.push(store);
  return store;
}

afterEach(() => {
  for (const store of stores.splice(0)) store.close();
});

function remoteIssue(
  scope: { workspaceId: string },
  id = issueId,
  revision = 1,
  overrides: Partial<SyncedIssueRow> = {},
): SyncedIssueRow {
  return {
    id,
    workspaceId: scope.workspaceId,
    parkId,
    turbineId,
    text: 'Relato do servidor',
    completionReport: null,
    status: 'pending',
    createdAt: '2026-10-27T12:00:00.000Z',
    updatedAt: '2026-10-27T12:00:00.000Z',
    revision,
    ...overrides,
  };
}

function createServer(scope: { workspaceId: string }, dropAfterCommit = true) {
  const rows = new Map<string, SyncedIssueRow>();
  const receipts = new Map<string, { payload: string; issue: SyncedIssueRow }>();
  const eventIds = new Set<string>();
  const attempts: Array<{ command: LocalIssueCommand; payload: Record<string, unknown> }> = [];
  const droppedResponses = new Set<string>();
  const transport: CommandSenderTransport = {
    async authorizeWorkspace(id) {
      if (id !== scope.workspaceId) throw new ApiRequestError(403, 'WORKSPACE_ACCESS_DENIED');
    },
    async send(workspaceId, command, payloadInput) {
      expect(workspaceId).toBe(scope.workspaceId);
      const payload = payloadInput as Record<string, unknown>;
      attempts.push({ command, payload });
      const body = JSON.stringify(payload);
      const existing = receipts.get(command.id);
      if (existing) {
        expect(existing.payload).toBe(body);
        return existing.issue;
      }

      let issue: SyncedIssueRow;
      if (command.kind === 'create') {
        issue = remoteIssue(scope, command.issueId, 1, { text: String(payload.text) });
      } else {
        const current = rows.get(command.issueId);
        if (!current) throw new ApiRequestError(404, 'RESOURCE_NOT_FOUND');
        if (payload.expectedRevision !== current.revision)
          throw new ApiRequestError(409, 'REVISION_CONFLICT');
        const next = {
          ...current,
          revision: current.revision + 1,
          updatedAt: new Date().toISOString(),
        };
        if (command.kind === 'update' && typeof payload.text === 'string') next.text = payload.text;
        if (command.kind === 'start') next.status = 'in_progress';
        if (command.kind === 'return') next.status = 'pending';
        if (command.kind === 'complete') {
          next.status = 'completed';
          next.completionReport = typeof payload.report === 'string' ? payload.report : null;
        }
        issue = next;
      }
      rows.set(command.issueId, issue);
      eventIds.add(command.id);
      receipts.set(command.id, { payload: body, issue });
      if (dropAfterCommit && !droppedResponses.has(command.id)) {
        droppedResponses.add(command.id);
        throw new Error('Resposta perdida depois do commit remoto.');
      }
      return issue;
    },
  };
  return { transport, rows, receipts, eventIds, attempts };
}

describe('envio durável de comandos locais', () => {
  it('reabre entre etapas e reproduz a mesma chave/payload após perder a resposta pós-commit', async () => {
    const scope = { ...basePartition, workspaceId: crypto.randomUUID() };
    let store = await openStore(scope);
    const created = await store.saveCreate({
      issueId,
      commandId: '61000000-0000-4000-8000-000000000001',
      parkId,
      turbineId,
      text: 'Relato de campo',
    });
    await store.saveUpdate({
      issueId,
      commandId: '61000000-0000-4000-8000-000000000002',
      text: 'Relato atualizado',
    });
    await store.queueMutation({
      issueId,
      commandId: '61000000-0000-4000-8000-000000000003',
      kind: 'start',
      payload: { commandId: '61000000-0000-4000-8000-000000000003', expectedRevision: 1 },
    });
    await store.queueMutation({
      issueId,
      commandId: '61000000-0000-4000-8000-000000000004',
      kind: 'complete',
      payload: {
        commandId: '61000000-0000-4000-8000-000000000004',
        expectedRevision: 1,
        report: 'Concluído',
      },
    });
    expect(created.command.chainId).toBe(issueId);
    const server = createServer(scope);

    for (let stage = 0; stage < 5; stage++) {
      await new LocalCommandSender(store, {
        ownerId: `sender-${stage}`,
        transport: server.transport,
      }).flush();
      store.close();
      store = await openStore(scope);
      if (stage === 0) {
        const replicated = server.rows.get(issueId);
        if (!replicated) throw new Error('O commit simulado não produziu a issue esperada.');
        await store.applyReplicaBatch({
          collection: 'issues',
          changes: [],
          checkpoint: {
            collection: 'issues',
            workspaceId: scope.workspaceId,
            offset: '1_0',
            handle: 'h',
            snapshotComplete: true,
            updatedAt: new Date().toISOString(),
          },
          snapshotRows: [replicated],
        });
        expect(store.getCommand(created.command.id)?.status).toBe('pending');
      }
    }

    expect(server.eventIds.size).toBe(4);
    expect(server.receipts.size).toBe(4);
    expect(server.rows.get(issueId)).toMatchObject({
      status: 'completed',
      text: 'Relato atualizado',
      completionReport: 'Concluído',
      revision: 4,
    });
    expect(
      server.attempts.filter((attempt) => attempt.command.id === created.command.id),
    ).toHaveLength(2);
    expect(server.attempts[1]?.payload).toEqual(server.attempts[0]?.payload);
    expect(server.attempts.map((attempt) => attempt.command.kind)).toEqual([
      'create',
      'create',
      'update',
      'update',
      'start',
      'start',
      'complete',
      'complete',
    ]);
    expect(
      server.attempts
        .filter(({ command }) => command.kind !== 'create')
        .map(({ payload }) => payload.expectedRevision),
    ).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('espera elegibilidade/autenticação do servidor sem adiantar pela hora local', async () => {
    const scope = { ...basePartition, workspaceId: crypto.randomUUID() };
    const store = await openStore(scope);
    await store.applyReplicaBatch({
      collection: 'issues',
      changes: [],
      checkpoint: {
        collection: 'issues',
        workspaceId: scope.workspaceId,
        offset: '1_0',
        handle: 'h',
        snapshotComplete: true,
        updatedAt: new Date().toISOString(),
      },
      snapshotRows: [remoteIssue(scope)],
    });
    const startCommandId = '62000000-0000-4000-8000-000000000001';
    await store.queueMutation({
      issueId,
      commandId: startCommandId,
      kind: 'start',
      payload: { commandId: startCommandId, expectedRevision: 1 },
    });
    let authorized = false;
    let eligible = false;
    let sends = 0;
    const transport: CommandSenderTransport = {
      async authorizeWorkspace() {
        if (!authorized) throw new ApiRequestError(401, 'AUTHENTICATION_REQUIRED');
      },
      async send() {
        sends++;
        if (!eligible) throw new ApiRequestError(403, 'ISSUE_CREATOR_WAIT');
        return remoteIssue(scope, issueId, 2, { status: 'in_progress' });
      },
    };
    const sender = new LocalCommandSender(store, { ownerId: 'auth-test', transport });
    await sender.flush();
    expect(sends).toBe(0);
    expect(store.getCommand(startCommandId)?.status).toBe('waiting_auth');
    authorized = true;
    await sender.flush();
    expect(sends).toBe(1);
    expect(store.getCommand(startCommandId)?.status).toBe('waiting_eligibility');
    eligible = true;
    await sender.flush();
    expect(sends).toBe(2);
    expect(store.getCommand(startCommandId)?.status).toBe('confirmed_waiting_replica');
  });

  it('isola conflitos/bloqueios por issue e continua enviando cadeias independentes', async () => {
    const scope = { ...basePartition, workspaceId: crypto.randomUUID() };
    const store = await openStore(scope);
    const independentId = '30000000-0000-4000-8000-000000000002';
    const unavailableIssueId = '30000000-0000-4000-8000-000000000003';
    await store.saveCreate({
      issueId,
      commandId: '63000000-0000-4000-8000-000000000001',
      parkId,
      turbineId,
      text: 'Conflito',
    });
    await store.saveUpdate({
      issueId,
      commandId: '63000000-0000-4000-8000-000000000002',
      text: 'Dependente',
    });
    await store.saveCreate({
      issueId: independentId,
      commandId: '63000000-0000-4000-8000-000000000003',
      parkId,
      turbineId,
      text: 'Independente',
    });
    await store.saveCreate({
      issueId: unavailableIssueId,
      commandId: '63000000-0000-4000-8000-000000000004',
      parkId,
      turbineId,
      text: 'Equipamento arquivado',
    });
    await store.saveUpdate({
      issueId: unavailableIssueId,
      commandId: '63000000-0000-4000-8000-000000000005',
      text: 'Dependente do equipamento',
    });
    const sent: string[] = [];
    const transport: CommandSenderTransport = {
      async authorizeWorkspace() {},
      async send(_workspaceId, command) {
        sent.push(command.id);
        if (command.id === '63000000-0000-4000-8000-000000000001')
          throw new ApiRequestError(409, 'REVISION_CONFLICT');
        if (command.id === '63000000-0000-4000-8000-000000000004')
          throw new ApiRequestError(409, 'EQUIPMENT_UNAVAILABLE');
        return remoteIssue(scope, command.issueId, 1);
      },
    };
    await new LocalCommandSender(store, { ownerId: 'conflict-test', transport }).flush();
    expect(store.getCommand('63000000-0000-4000-8000-000000000001')?.status).toBe('conflict');
    expect(store.getCommand('63000000-0000-4000-8000-000000000002')?.status).toBe('blocked');
    expect(store.getCommand('63000000-0000-4000-8000-000000000003')?.status).toBe(
      'confirmed_waiting_replica',
    );
    expect(store.getCommand('63000000-0000-4000-8000-000000000004')?.status).toBe('conflict');
    expect(store.getCommand('63000000-0000-4000-8000-000000000005')?.status).toBe('blocked');
    expect(sent).toEqual([
      '63000000-0000-4000-8000-000000000001',
      '63000000-0000-4000-8000-000000000003',
      '63000000-0000-4000-8000-000000000004',
    ]);
  });

  it('usa lease entre abas e não envia duas vezes simultaneamente', async () => {
    const scope = { ...basePartition, workspaceId: crypto.randomUUID() };
    const firstStore = await openStore(scope);
    const otherStore = await openStore(scope);
    await firstStore.saveCreate({
      issueId,
      commandId: '64000000-0000-4000-8000-000000000001',
      parkId,
      turbineId,
      text: 'Uma vez',
    });
    let release!: () => void;
    let started!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const sentStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    let sendCount = 0;
    const transport: CommandSenderTransport = {
      async authorizeWorkspace() {},
      async send(workspaceId) {
        sendCount++;
        started();
        await gate;
        return remoteIssue({ workspaceId });
      },
    };
    const first = new LocalCommandSender(firstStore, { ownerId: 'tab-one', transport });
    const second = new LocalCommandSender(otherStore, { ownerId: 'tab-two', transport });
    const firstRun = first.flush();
    await sentStarted;
    await second.flush();
    expect(sendCount).toBe(1);
    release();
    await firstRun;
    expect(sendCount).toBe(1);
  });

  it('reproduz recibo remoto se a gravação local do ACK falhar', async () => {
    const scope = { ...basePartition, workspaceId: crypto.randomUUID() };
    const store = await openStore(scope);
    const created = await store.saveCreate({
      issueId,
      commandId: '64500000-0000-4000-8000-000000000001',
      parkId,
      turbineId,
      text: 'ACK não gravado',
    });
    const server = createServer(scope, false);
    const persistAck = store.recordCommandAck.bind(store);
    let failAck = true;
    store.recordCommandAck = async (...args) => {
      if (failAck) {
        failAck = false;
        throw new DOMException('Falha local simulada', 'QuotaExceededError');
      }
      return persistAck(...args);
    };

    await new LocalCommandSender(store, {
      ownerId: 'ack-failure',
      transport: server.transport,
    }).flush();
    expect(server.eventIds.size).toBe(1);
    expect(store.getCommand(created.command.id)?.status).toBe('pending');
    expect(store.getCommand(created.command.id)?.frozenPayload).toEqual(created.command.payload);
    await new LocalCommandSender(store, {
      ownerId: 'ack-retry',
      transport: server.transport,
    }).flush();
    expect(server.eventIds.size).toBe(1);
    expect(server.attempts).toHaveLength(2);
    expect(server.attempts[0]?.payload).toEqual(server.attempts[1]?.payload);
    expect(store.getCommand(created.command.id)?.status).toBe('confirmed_waiting_replica');
  });

  it('mantém liberação administrativa fora do envio offline e classifica falha de domínio', async () => {
    const scope = { ...basePartition, workspaceId: crypto.randomUUID() };
    const store = await openStore(scope);
    await store.saveCreate({
      issueId,
      commandId: '65000000-0000-4000-8000-000000000001',
      parkId,
      turbineId,
      text: 'Pendente',
    });
    const createAck = remoteIssue(scope);
    await store.recordCommandAck('65000000-0000-4000-8000-000000000001', createAck);
    const releaseId = '65000000-0000-4000-8000-000000000002';
    await store.queueMutation({
      issueId,
      commandId: releaseId,
      kind: 'release',
      payload: { commandId: releaseId, expectedRevision: 1 },
    });
    const sender = new LocalCommandSender(store, {
      ownerId: 'release-test',
      transport: {
        async authorizeWorkspace() {},
        async send() {
          throw new Error('release must not be sent');
        },
      },
    });
    await sender.flush();
    expect(store.getCommand(releaseId)?.status).toBe('blocked');
    expect(store.getCommand(releaseId)?.blockReason).toContain('somente online');
  });

  it('bloqueia a fila inteira quando o preflight confirma revogação do workspace', async () => {
    const scope = { ...basePartition, workspaceId: crypto.randomUUID() };
    const store = await openStore(scope);
    const first = await store.saveCreate({
      issueId,
      commandId: '66000000-0000-4000-8000-000000000001',
      parkId,
      turbineId,
      text: 'Fila bloqueada',
    });
    let sends = 0;
    const sender = new LocalCommandSender(store, {
      ownerId: 'revoked-workspace',
      transport: {
        async authorizeWorkspace() {
          throw new ApiRequestError(403, 'WORKSPACE_ACCESS_DENIED');
        },
        async send() {
          sends++;
          return remoteIssue(scope);
        },
      },
    });
    await sender.flush();
    expect(sends).toBe(0);
    expect(store.getCommand(first.command.id)?.status).toBe('blocked');
    expect(store.getCommand(first.command.id)?.blockReason).toContain('membership');
  });

  it('aplica backoff exponencial com jitter e teto de 60 segundos', async () => {
    const scope = { ...basePartition, workspaceId: crypto.randomUUID() };
    const store = await openStore(scope);
    await store.saveCreate({
      issueId,
      commandId: '67000000-0000-4000-8000-000000000001',
      parkId,
      turbineId,
      text: 'Retry com backoff',
    });
    const delays: number[] = [];
    const callbacks: Array<() => void> = [];
    const sender = new LocalCommandSender(store, {
      ownerId: 'backoff-test',
      random: () => 1,
      setTimer: (callback, delay) => {
        callbacks.push(callback);
        delays.push(delay);
        return undefined as never;
      },
      clearTimer: () => {},
      transport: {
        async authorizeWorkspace() {
          throw new Error('Sem conexão');
        },
        async send() {
          throw new Error('Não deveria enviar sem preflight');
        },
      },
    });
    sender.start();
    await sender.flush();
    for (let attempt = 1; attempt < 7; attempt++) {
      callbacks[attempt - 1]?.();
      await sender.flush();
    }
    expect(delays).toEqual([1_500, 3_000, 6_000, 12_000, 24_000, 48_000, 60_000]);
    sender.stop();
  });
});
