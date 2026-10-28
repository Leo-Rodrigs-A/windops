import { Bell, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { useOfflineWorkspace } from '../offline/offline-workspace-context';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Feedback } from './ui/feedback';

const collections = [
  ['workspace', 'Workspace'],
  ['parks', 'Parques'],
  ['turbines', 'Turbinas'],
  ['issues', 'Chamados ativos'],
  ['issue-events', 'Histórico dos chamados ativos'],
] as const;

function replicaErrorLabel(message: string) {
  const normalized = message.toLowerCase();
  const httpError = message.match(/^HTTP Error (\d+) at (https?:\/\/[^ ]+)(?:: (.*))?$/);
  if (httpError) {
    const [, status, requestUrl, responseBody] = httpError;
    let parameters = 'URL inválida';
    try {
      const url = new URL(requestUrl?.endsWith(':') ? requestUrl.slice(0, -1) : (requestUrl ?? ''));
      parameters =
        [
          ...new Set(
            [...url.searchParams.entries()].map(([key, value]) =>
              key === 'cursor' && value === '' ? 'cursor (vazio)' : key,
            ),
          ),
        ].join(', ') || 'nenhum';
    } catch {
      // Show only the status if the request URL cannot be parsed safely.
    }
    let responseCode = '';
    let responseMessage = '';
    try {
      const body = JSON.parse(responseBody ?? '') as {
        error?: { code?: unknown; message?: unknown };
        message?: unknown;
      };
      const code = body.error?.code;
      const detail = body.error?.message ?? body.message;
      if (typeof code === 'string') responseCode = ` (${code})`;
      if (typeof detail === 'string' && !detail.includes('could not be completed'))
        responseMessage = ` ${detail.slice(0, 120)}`;
    } catch {
      // Electric may return plain text; do not echo a URL or signed handle.
    }
    return `HTTP ${status}${responseCode}; parâmetros enviados: ${parameters}.${responseMessage}`;
  }
  if (normalized.includes('401') || normalized.includes('session_required'))
    return 'A API recusou a sessão. Atualize a sessão e tente novamente.';
  if (normalized.includes('403') || normalized.includes('workspace_access_required'))
    return 'A API recusou o acesso a este workspace. Confira sua participação.';
  if (
    normalized.includes('503') ||
    normalized.includes('sync_unavailable') ||
    normalized.includes('electric unavailable')
  )
    return 'O serviço de sincronização (API/Electric) está indisponível.';
  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('network') ||
    normalized.includes('connection')
  )
    return 'Não foi possível alcançar a API de sincronização.';
  return `Detalhe: ${message.slice(0, 180)}`;
}

export function WorkspaceSystemActions() {
  const { snapshot } = useAuth();
  const {
    online,
    ready,
    loading,
    error,
    persistentStorage,
    replicaStatus,
    senderStatus,
    pendingCommands,
    lastConfirmedAt,
    store,
    retrySync,
  } = useOfflineWorkspace();
  const [open, setOpen] = useState(false);
  const [exportError, setExportError] = useState('');
  const accountOnline = snapshot.status === 'authenticated';
  const replicaCaughtUp = collections.every(
    ([collection]) => replicaStatus?.caughtUp[collection] === true,
  );
  const state = useMemo(() => {
    if (error) return { text: 'Armazenamento local indisponível', icon: CloudOff };
    if (senderStatus?.state === 'sending') return { text: 'Enviando alterações', icon: Cloud };
    if (pendingCommands.some((command) => command.status === 'conflict'))
      return { text: 'Conflito para revisar', icon: CloudOff };
    if (snapshot.status === 'offline')
      return {
        text:
          pendingCommands.length > 0
            ? 'Aguardando autenticação'
            : 'Offline · sessão precisa ser renovada',
        icon: CloudOff,
      };
    if (snapshot.status === 'revoked')
      return {
        text:
          pendingCommands.length > 0
            ? 'Acesso revogado · pendências preservadas'
            : 'Acesso revogado',
        icon: CloudOff,
      };
    if (pendingCommands.length > 0 && !online)
      return { text: 'Salvo no aparelho · pendente', icon: CloudOff };
    if (senderStatus?.state === 'error') return { text: 'Falha ao sincronizar', icon: CloudOff };
    if (Object.keys(replicaStatus?.errors ?? {}).length > 0)
      return { text: 'Falha na sincronização', icon: CloudOff };
    if (!online)
      return {
        text: ready
          ? persistentStorage === true
            ? 'Offline · dados preparados'
            : 'Offline · proteção não confirmada'
          : 'Offline · sem cache completo',
        icon: CloudOff,
      };
    if (ready && pendingCommands.length === 0 && replicaCaughtUp)
      return { text: 'Sincronizado', icon: Cloud };
    if (ready && pendingCommands.length === 0)
      return { text: 'Atualizando dados do servidor', icon: Cloud };
    if (loading) return { text: 'Preparando acesso offline', icon: Cloud };
    return { text: 'Preparação offline incompleta', icon: Cloud };
  }, [
    error,
    loading,
    online,
    pendingCommands,
    persistentStorage,
    replicaCaughtUp,
    ready,
    replicaStatus,
    senderStatus,
    snapshot.status,
  ]);
  const Icon = state.icon;

  function exportPending() {
    if (!store) return;
    setExportError('');
    try {
      store.downloadPendingExport();
    } catch {
      setExportError('Não foi possível exportar as pendências neste aparelho.');
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        aria-label="Notificações — integração ainda não disponível"
        className="text-muted-foreground"
        disabled
        size="icon"
        title="As notificações serão agrupadas aqui quando a integração estiver disponível."
        variant="ghost"
      >
        <Bell aria-hidden="true" className="size-5" />
      </Button>
      <Button
        aria-label={`Sincronização: ${state.text}`}
        className={state.text === 'Sincronizado' ? 'text-emerald-500' : 'text-muted-foreground'}
        onClick={() => setOpen(true)}
        size="icon"
        title={state.text}
        variant="ghost"
      >
        <Icon aria-hidden="true" className="size-5" />
      </Button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sincronização</DialogTitle>
            <DialogDescription>{state.text}</DialogDescription>
          </DialogHeader>
          {error ? (
            <Feedback message={error} tone="error" />
          ) : (
            <div className="space-y-4">
              {!ready && !online && (
                <Feedback
                  message="Este aparelho ainda não terminou a preparação. Conecte-se ao workspace para baixar os dados necessários antes da próxima visita sem rede."
                  tone="warning"
                />
              )}
              {ready && persistentStorage === false && (
                <Feedback
                  message="O navegador não concedeu proteção contra remoção automática do armazenamento. Isso não causa a falha da sincronização, mas os dados locais podem ser removidos pelo navegador."
                  tone="warning"
                />
              )}
              {snapshot.status === 'offline' && (
                <Feedback
                  message="Sua sessão precisa ser renovada para enviar alterações. Os dados e comandos locais continuam disponíveis neste aparelho."
                  tone="warning"
                />
              )}
              <ul className="space-y-2 text-sm">
                {collections.map(([key, label]) => {
                  const complete = replicaStatus?.snapshots[key] === true;
                  const message = replicaStatus?.errors[key];
                  return (
                    <li className="space-y-1" key={key}>
                      <div className="flex items-start justify-between gap-3">
                        <span>{label}</span>
                        <span className={message ? 'text-danger' : 'text-muted-foreground'}>
                          {message
                            ? 'Falha na sincronização'
                            : complete
                              ? 'Disponível neste aparelho'
                              : 'Preparando'}
                        </span>
                      </div>
                      {message && (
                        <p className="text-xs text-muted-foreground">
                          {replicaErrorLabel(message)}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">Alterações pendentes: {pendingCommands.length}</p>
                <p className="mt-1 text-muted-foreground">
                  Proteção de armazenamento:{' '}
                  {persistentStorage === null
                    ? 'verificando'
                    : persistentStorage
                      ? 'confirmada pelo navegador'
                      : 'não confirmada pelo navegador'}
                </p>
                {lastConfirmedAt && (
                  <p className="mt-1 text-muted-foreground">
                    Última atualização da réplica:{' '}
                    {new Intl.DateTimeFormat('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }).format(new Date(lastConfirmedAt))}
                  </p>
                )}
              </div>
              {pendingCommands.length > 0 && (
                <ul
                  className="max-h-40 space-y-2 overflow-auto text-sm"
                  aria-label="Alterações pendentes"
                >
                  {pendingCommands.map((command) => (
                    <li className="rounded-md bg-muted/50 p-2" key={command.id}>
                      <p>
                        {command.kind === 'create'
                          ? 'Novo chamado'
                          : command.kind === 'update'
                            ? 'Edição de chamado'
                            : 'Alteração de atendimento'}{' '}
                        · {command.status.replaceAll('_', ' ')}
                      </p>
                      {command.blockReason && (
                        <p className="mt-1 text-xs text-muted-foreground">{command.blockReason}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {exportError && <Feedback message={exportError} tone="error" />}
            </div>
          )}
          <DialogFooter>
            {pendingCommands.length > 0 && (
              <Button onClick={exportPending} variant="outline">
                Exportar pendências
              </Button>
            )}
            <Button
              disabled={!online || !accountOnline || loading}
              onClick={retrySync}
              variant="outline"
            >
              <RefreshCw aria-hidden="true" /> Tentar sincronizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
