import { useNavigate } from '@tanstack/react-router';
import type { Notification } from '@windops/contracts';
import { Bell, Check, ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { ApiRequestError } from '../lib/auth-api';
import { getNotifications, markNotificationRead } from '../lib/notifications-api';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Feedback, LoadingState } from './ui/feedback';

const eventLabels: Record<Notification['type'], string> = {
  created: 'Um chamado foi registrado.',
  edited: 'Um chamado foi atualizado.',
  started: 'O atendimento de um chamado foi iniciado.',
  returned: 'Um chamado foi devolvido.',
  released: 'Um chamado foi liberado.',
  completed: 'Um chamado foi concluído.',
  archived: 'Um chamado foi arquivado.',
  reopened: 'Um chamado foi reaberto.',
  reactivated: 'Um chamado foi reativado.',
};

function notificationError(error: unknown) {
  if (error instanceof ApiRequestError && error.status === 401)
    return 'Sua sessão precisa ser renovada para consultar as notificações.';
  if (error instanceof ApiRequestError && error.status === 403)
    return 'Seu acesso a este workspace mudou. Atualize sua sessão.';
  return 'Não foi possível carregar as notificações. Confira a conexão e tente novamente.';
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function NotificationBell({
  workspaceId,
  online,
}: {
  workspaceId: string;
  online: boolean;
}) {
  const navigate = useNavigate();
  const { refresh: refreshAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(
    async (append = false, pageCursor: string | null = null) => {
      if (!online || !workspaceId) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError('');
      try {
        const page = await getNotifications(workspaceId, {
          limit: 25,
          ...(append && pageCursor ? { cursor: pageCursor } : {}),
        });
        setItems((current) => {
          if (!append) return page.items;
          const known = new Set(current.map((item) => item.id));
          return [...current, ...page.items.filter((item) => !known.has(item.id))];
        });
        setCursor(page.nextCursor);
        setUnreadCount(page.unreadCount);
      } catch (cause) {
        setError(notificationError(cause));
        if (cause instanceof ApiRequestError && [401, 403].includes(cause.status))
          void refreshAuth();
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [online, refreshAuth, workspaceId],
  );

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setUnreadCount(0);
    setError('');
    if (!online) return;
    void refresh();
    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 60_000);
    const onFocus = () => void refresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [online, refresh]);

  async function openNotification(item: Notification) {
    if (!item.readAt) {
      setItems((current) =>
        current.map((notification) =>
          notification.id === item.id
            ? { ...notification, readAt: new Date().toISOString() }
            : notification,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      try {
        await markNotificationRead(workspaceId, item.id);
      } catch (cause) {
        // Navigation remains useful if marking the notice read races with a session refresh.
        if (cause instanceof ApiRequestError && [401, 403].includes(cause.status))
          void refreshAuth();
      }
    }
    setOpen(false);
    await navigate({ to: '/chamados/$issueId', params: { issueId: item.issueId } });
  }

  return (
    <>
      <Button
        aria-label={`Notificações${unreadCount ? `, ${unreadCount} não lidas` : ''}`}
        aria-haspopup="dialog"
        className="relative text-muted-foreground"
        onClick={() => {
          setOpen(true);
          void refresh();
        }}
        size="icon"
        title={unreadCount ? `${unreadCount} notificações não lidas` : 'Notificações'}
        variant="ghost"
      >
        <Bell aria-hidden="true" className="size-5" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="max-h-[min(80dvh,42rem)] gap-4 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-5 pt-5 pb-4">
            <DialogTitle>Notificações</DialogTitle>
            <DialogDescription>
              {unreadCount === 0
                ? 'Avisos dos chamados deste workspace.'
                : `${unreadCount} ${unreadCount === 1 ? 'aviso não lido' : 'avisos não lidos'}.`}
            </DialogDescription>
          </DialogHeader>
          <div aria-live="polite" className="min-h-0 space-y-3 overflow-y-auto px-5 pb-5">
            {!online && (
              <Feedback
                message="A campainha precisa de conexão. As pendências locais continuam neste aparelho."
                tone="warning"
              />
            )}
            {error && <Feedback message={error} tone="error" />}
            {loading && items.length === 0 && <LoadingState label="Carregando notificações…" />}
            {!loading && online && !error && items.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Você não tem notificações.
              </p>
            )}
            {items.length > 0 && (
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      className="flex min-h-16 w-full items-start gap-3 py-3 text-left outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => void openNotification(item)}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${item.readAt ? 'bg-muted' : 'bg-primary'}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{eventLabels[item.type]}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {dateLabel(item.createdAt)}
                        </span>
                      </span>
                      {item.readAt && (
                        <Check aria-hidden="true" className="mt-1 size-4 text-muted-foreground" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {cursor && (
              <Button
                className="w-full"
                disabled={loadingMore || !online}
                onClick={() => void refresh(true, cursor)}
                variant="outline"
              >
                {loadingMore ? 'Carregando…' : 'Carregar mais'}
                <ChevronDown aria-hidden="true" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
