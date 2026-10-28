import type { Issue } from '@windops/contracts';
import { ApiRequestError, getWorkspaceContext } from '../lib/auth-api';
import {
  completeIssue,
  createIssue,
  returnIssue,
  startIssue,
  updateIssue,
} from '../lib/issues-api';
import {
  currentAccountGeneration,
  isCurrentAccountGeneration,
  registerOfflineResource,
} from './local-access';
import type { LocalIssueCommand, LocalIssueStore, SyncedIssueRow } from './local-issue-store';

export type CommandSenderStatus = {
  state: 'idle' | 'sending' | 'waiting' | 'error';
  pendingCount: number;
  lastError: string | null;
};

export type CommandSenderTransport = {
  authorizeWorkspace(workspaceId: string): Promise<void>;
  send(workspaceId: string, command: LocalIssueCommand, payload: unknown): Promise<SyncedIssueRow>;
};

type Timer = ReturnType<typeof globalThis.setTimeout>;
type Options = {
  ownerId?: string;
  transport?: CommandSenderTransport;
  random?: () => number;
  setTimer?: (callback: () => void, delayMs: number) => Timer;
  clearTimer?: (timer: Timer) => void;
};

const retryableStatuses = new Set(['pending', 'sending', 'waiting_auth', 'waiting_eligibility']);
const maxBackoffMs = 60_000;

function orderByDependency(commands: LocalIssueCommand[]) {
  const remaining = new Map(commands.map((command) => [command.id, command]));
  const ordered: LocalIssueCommand[] = [];
  while (remaining.size > 0) {
    const ready = [...remaining.values()]
      .filter((command) => !command.dependsOn || !remaining.has(command.dependsOn))
      .sort(
        (left, right) =>
          left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
      );
    if (ready.length === 0) {
      return { ordered, cycle: [...remaining.values()] };
    }
    for (const command of ready) {
      remaining.delete(command.id);
      ordered.push(command);
    }
  }
  return { ordered, cycle: [] };
}

function syncedIssue(issue: Issue): SyncedIssueRow {
  return {
    id: issue.id,
    workspaceId: issue.workspaceId,
    parkId: issue.parkId,
    turbineId: issue.turbineId,
    text: issue.text,
    completionReport: issue.completionReport,
    status: issue.status,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    revision: issue.revision,
  };
}

const defaultTransport: CommandSenderTransport = {
  async authorizeWorkspace(workspaceId) {
    const context = await getWorkspaceContext(workspaceId);
    if (context.workspace.id !== workspaceId)
      throw new Error('O servidor respondeu com outro workspace.');
  },
  async send(workspaceId, command, payloadInput) {
    const payload = payloadInput as Record<string, unknown>;
    let issue: Issue;
    switch (command.kind) {
      case 'create':
        issue = await createIssue(workspaceId, payload as never);
        break;
      case 'update':
        issue = await updateIssue(workspaceId, command.issueId, payload as never);
        break;
      case 'start':
        issue = await startIssue(workspaceId, command.issueId, payload as never);
        break;
      case 'return':
        issue = await returnIssue(workspaceId, command.issueId, payload as never);
        break;
      case 'complete':
        issue = await completeIssue(workspaceId, command.issueId, payload as never);
        break;
      case 'release':
        throw new Error('Liberação administrativa deve continuar online.');
    }
    return syncedIssue(issue);
  },
};

function errorCode(error: unknown) {
  return error instanceof ApiRequestError ? error.code : undefined;
}

function errorStatus(error: unknown) {
  return error instanceof ApiRequestError ? error.status : undefined;
}

export class LocalCommandSender {
  private readonly ownerId: string;
  private readonly transport: CommandSenderTransport;
  private readonly random: () => number;
  private readonly setTimer: (callback: () => void, delayMs: number) => Timer;
  private readonly clearTimer: (timer: Timer) => void;
  private readonly listeners = new Set<(status: CommandSenderStatus) => void>();
  private timer: Timer | undefined;
  private running: Promise<void> | undefined;
  private active = false;
  private stopped = false;
  private backoffAttempt = 0;
  private shouldRetry = false;
  private readonly status: CommandSenderStatus = {
    state: 'idle',
    pendingCount: 0,
    lastError: null,
  };
  private unregisterResource: (() => void) | undefined;

  constructor(
    private readonly store: LocalIssueStore,
    options: Options = {},
  ) {
    this.ownerId = options.ownerId ?? crypto.randomUUID();
    this.transport = options.transport ?? defaultTransport;
    this.random = options.random ?? Math.random;
    this.setTimer = options.setTimer ?? globalThis.setTimeout.bind(globalThis);
    this.clearTimer = options.clearTimer ?? globalThis.clearTimeout.bind(globalThis);
  }

  getStatus(): CommandSenderStatus {
    return { ...this.status, pendingCount: this.store.listPendingCommands().length };
  }

  subscribe(listener: (status: CommandSenderStatus) => void) {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.stopped = false;
    this.unregisterResource = registerOfflineResource(() => this.stop());
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onWake);
      window.addEventListener('focus', this.onWake);
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
    void this.flush().catch((error: unknown) => this.setState('error', this.message(error)));
  }

  stop() {
    this.active = false;
    this.stopped = true;
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onWake);
      window.removeEventListener('focus', this.onWake);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    if (this.timer !== undefined) this.clearTimer(this.timer);
    this.timer = undefined;
    this.setState('idle', null);
    this.unregisterResource?.();
    this.unregisterResource = undefined;
  }

  flush(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    if (this.running) return this.running;
    const attempt = this.flushOnce().finally(() => {
      this.running = undefined;
      if (this.shouldRetry) this.scheduleRetry();
      this.shouldRetry = false;
    });
    this.running = attempt;
    return attempt;
  }

  private readonly onWake = () => {
    if (!this.active) return;
    if (this.timer !== undefined) this.clearTimer(this.timer);
    this.timer = undefined;
    void this.flush().catch((error: unknown) => this.setState('error', this.message(error)));
  };

  private readonly onVisibilityChange = () => {
    if (document.visibilityState === 'visible') this.onWake();
  };

  private async flushOnce() {
    const accountGeneration = currentAccountGeneration();
    await this.store.recoverInterruptedSends();
    const { ordered: candidates, cycle } = orderByDependency(
      this.store.listPendingCommands().filter((command) => retryableStatuses.has(command.status)),
    );
    this.status.pendingCount = this.store.listPendingCommands().length;
    if (candidates.length === 0) {
      this.setState('idle', null);
      return;
    }

    const acquired = await this.store.acquireLease(this.ownerId);
    if (!acquired) {
      this.shouldRetry = true;
      this.setState('waiting', null);
      return;
    }

    try {
      try {
        await this.transport.authorizeWorkspace(this.store.partition.workspaceId);
      } catch (error) {
        await this.handlePreflightError(error, candidates);
        return;
      }
      if (this.stopped || !isCurrentAccountGeneration(accountGeneration)) return;

      this.backoffAttempt = 0;
      this.setState('sending', null);
      for (const command of cycle)
        await this.store.setCommandStatus(
          command.id,
          'blocked',
          'A fila local contém uma dependência circular.',
        );
      for (const queued of candidates) {
        if (this.stopped) break;
        const command = this.store.getCommand(queued.id);
        if (!command || !retryableStatuses.has(command.status)) continue;
        const projection = this.store.getIssue(command.issueId);
        if (
          command.workspaceId !== this.store.partition.workspaceId ||
          command.chainId !== command.issueId ||
          (projection && projection.workspaceId !== this.store.partition.workspaceId)
        ) {
          await this.store.setCommandStatus(
            command.id,
            'blocked',
            'O comando não pertence à partição ativa do workspace.',
          );
          continue;
        }
        if (!(await this.store.acquireLease(this.ownerId))) {
          this.shouldRetry = true;
          break;
        }

        const dependency = command.dependsOn
          ? (this.store.getCommand(command.dependsOn) ?? null)
          : null;
        if (command.dependsOn && !dependency) {
          await this.store.setCommandStatus(
            command.id,
            'blocked',
            'A dependência local deste comando não existe mais.',
          );
          continue;
        }
        if (
          dependency &&
          (dependency.issueId !== command.issueId || dependency.chainId !== command.chainId)
        ) {
          await this.store.setCommandStatus(
            command.id,
            'blocked',
            'A dependência pertence a outra cadeia de chamados.',
          );
          continue;
        }
        if (dependency && !this.isAckReady(dependency)) {
          if (this.isTerminal(dependency.status))
            await this.store.setCommandStatus(
              command.id,
              'blocked',
              `Dependência ${dependency.id} terminou em ${dependency.status}.`,
            );
          continue;
        }

        if (command.kind === 'release') {
          await this.store.setCommandStatus(
            command.id,
            'blocked',
            'Liberação administrativa continua disponível somente online.',
          );
          continue;
        }

        const prepared = this.preparePayload(command, dependency);
        if (prepared.conflict) {
          await this.store.setCommandStatus(command.id, 'conflict', prepared.conflict);
          continue;
        }
        const frozen = await this.store.prepareCommandForSend(command.id, prepared.payload);
        if (!frozen) continue;
        const payload = frozen.frozenPayload ?? prepared.payload;
        try {
          const issue = await this.transport.send(
            this.store.partition.workspaceId,
            frozen,
            payload,
          );
          if (this.stopped || !isCurrentAccountGeneration(accountGeneration)) break;
          await this.store.recordCommandAck(command.id, issue);
        } catch (error) {
          await this.handleCommandError(command.id, error);
          if (errorStatus(error) === 401) break;
        }
      }

      this.status.pendingCount = this.store.listPendingCommands().length;
      const hasWaiting = this.store
        .listPendingCommands()
        .some(
          (command) =>
            command.status === 'waiting_eligibility' ||
            command.status === 'waiting_auth' ||
            command.status === 'pending',
        );
      this.setState(hasWaiting ? 'waiting' : 'idle', null);
      if (hasWaiting) this.shouldRetry = true;
    } finally {
      await this.store.releaseLease(this.ownerId);
    }
  }

  private preparePayload(command: LocalIssueCommand, dependency: LocalIssueCommand | null) {
    if (command.frozenPayload !== null) return { payload: command.frozenPayload };
    const payload = { ...(command.payload as Record<string, unknown>) };
    let expectedRevision = payload.expectedRevision as number | undefined;
    if (command.kind !== 'create' && dependency) {
      expectedRevision =
        dependency.acknowledgedIssue?.revision ??
        this.store.getIssue(command.issueId)?.serverRevision ??
        expectedRevision;
      payload.expectedRevision = expectedRevision;
    }
    const issue = this.store.getIssue(command.issueId);
    if (
      command.kind !== 'create' &&
      expectedRevision !== undefined &&
      issue?.serverRevision !== null &&
      issue?.serverRevision !== undefined &&
      issue.serverRevision > expectedRevision
    ) {
      return {
        payload,
        conflict: 'O servidor tem uma revisão mais nova que a base deste comando.',
      };
    }
    return { payload };
  }

  private async handlePreflightError(error: unknown, candidates: LocalIssueCommand[]) {
    const status = errorStatus(error);
    if (status === 401) {
      for (const command of candidates)
        await this.store.setCommandStatus(
          command.id,
          'waiting_auth',
          'Autentique-se novamente para enviar.',
        );
      this.setState('waiting', 'Autenticação necessária.');
      this.shouldRetry = true;
    } else if (status === 403) {
      for (const command of candidates)
        await this.store.setCommandStatus(
          command.id,
          'blocked',
          'A membership não está mais ativa neste workspace.',
        );
      this.setState('error', 'Acesso ao workspace revogado.');
    } else {
      this.setState('waiting', this.message(error));
      this.shouldRetry = true;
    }
  }

  private async handleCommandError(commandId: string, error: unknown) {
    const status = errorStatus(error);
    const code = errorCode(error);
    if (status === 401) {
      await this.store.setCommandStatus(commandId, 'waiting_auth', 'Autenticação necessária.');
      this.shouldRetry = true;
      this.setState('waiting', 'Autenticação necessária.');
    } else if (status === 403 && code === 'ISSUE_CREATOR_WAIT') {
      await this.store.setCommandStatus(
        commandId,
        'waiting_eligibility',
        'O servidor ainda não permite que o criador inicie este chamado.',
      );
      this.shouldRetry = true;
    } else if (status === 403 && code === 'WORKSPACE_ACCESS_DENIED') {
      for (const command of this.store.listPendingCommands())
        if (retryableStatuses.has(command.status))
          await this.store.setCommandStatus(
            command.id,
            'blocked',
            'A membership não está mais ativa neste workspace.',
          );
      this.setState('error', 'Acesso ao workspace revogado.');
    } else if (status === 403) {
      await this.store.setCommandStatus(commandId, 'blocked', this.message(error));
    } else if (status === 409) {
      await this.store.setCommandStatus(commandId, 'conflict', this.message(error));
    } else if (status === 408 || status === 429 || (status !== undefined && status >= 500)) {
      await this.store.setCommandStatus(
        commandId,
        'pending',
        'Servidor temporariamente indisponível; retry conserva chave e payload.',
      );
      this.shouldRetry = true;
    } else if (status !== undefined && status >= 400 && status < 500) {
      await this.store.setCommandStatus(commandId, 'rejected', this.message(error));
    } else {
      await this.store.setCommandStatus(
        commandId,
        'pending',
        'Resultado desconhecido; retry conserva chave e payload.',
      );
      this.shouldRetry = true;
    }
  }

  private isAckReady(command: LocalIssueCommand) {
    return command.status === 'confirmed' || command.status === 'confirmed_waiting_replica';
  }

  private isTerminal(status: LocalIssueCommand['status']) {
    return status === 'blocked' || status === 'conflict' || status === 'rejected';
  }

  private scheduleRetry() {
    if (!this.active || this.timer !== undefined) return;
    this.backoffAttempt++;
    const base = Math.min(1_000 * 2 ** (this.backoffAttempt - 1), maxBackoffMs);
    const delay = Math.min(maxBackoffMs, Math.round(base * (0.5 + this.random())));
    this.timer = this.setTimer(() => {
      this.timer = undefined;
      void this.flush().catch((error: unknown) => this.setState('error', this.message(error)));
    }, delay);
  }

  private message(error: unknown) {
    if (error instanceof ApiRequestError) return error.code ?? `HTTP ${error.status}`;
    return error instanceof Error ? error.message : 'Falha inesperada no envio.';
  }

  private setState(state: CommandSenderStatus['state'], lastError: string | null) {
    this.status.state = state;
    this.status.lastError = lastError;
    this.status.pendingCount = this.store.listPendingCommands().length;
    const snapshot = this.getStatus();
    for (const listener of this.listeners) listener(snapshot);
  }
}
