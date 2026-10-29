import { BellOff, BellRing } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { ApiRequestError } from '../lib/auth-api';
import { getPushStatus } from '../lib/notifications-api';
import { disablePushOnDevice, enablePushOnDevice } from '../lib/push-subscriptions';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Feedback } from './ui/feedback';

function pushFailureMessage(cause: unknown) {
  const message = cause instanceof Error ? cause.message : '';
  if (/registration failed - push service error/i.test(message)) {
    if (/electron/i.test(navigator.userAgent))
      return 'O navegador integrado usado nesta sessão não disponibiliza um serviço de push compatível. Abra o Wind Ops em um navegador padrão para ativar notificações.';
    return 'O navegador não conseguiu se registrar no serviço de push. Confira a conexão e tente novamente em outro navegador compatível.';
  }
  return message || 'Não foi possível atualizar as notificações neste aparelho.';
}

export function PushSettings({ workspaceId }: { workspaceId: string }) {
  const { refresh: refreshAuth } = useAuth();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [serverEnabled, setServerEnabled] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    const browserSupportsPush =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      window.isSecureContext;
    setSupported(browserSupportsPush);
    if (!browserSupportsPush) {
      setPermission('unsupported');
      setLoading(false);
      return;
    }
    const refreshPermission = () => setPermission(Notification.permission);
    refreshPermission();
    window.addEventListener('focus', refreshPermission);
    document.addEventListener('visibilitychange', refreshPermission);
    void Promise.allSettled([
      getPushStatus(workspaceId),
      navigator.serviceWorker
        .getRegistration()
        .then((registration) => (registration ? registration.pushManager.getSubscription() : null)),
    ]).then(([statusResult, subscriptionResult]) => {
      if (!active) return;
      if (statusResult.status === 'fulfilled')
        setServerEnabled(statusResult.value.enabled && Boolean(statusResult.value.publicKey));
      else {
        const hasSubscription =
          subscriptionResult.status === 'fulfilled' && Boolean(subscriptionResult.value);
        if (hasSubscription)
          setNotice(
            'Sem conexão ou sessão válida para confirmar a inscrição. Ainda é possível desativar o push neste aparelho.',
          );
        else setError('Não foi possível consultar a configuração de notificações.');
        if (
          statusResult.reason instanceof ApiRequestError &&
          [401, 403].includes(statusResult.reason.status)
        )
          void refreshAuth();
      }
      if (subscriptionResult.status === 'fulfilled')
        setSubscribed(Boolean(subscriptionResult.value));
      else setError('Não foi possível consultar a inscrição deste aparelho.');
      setLoading(false);
    });
    return () => {
      active = false;
      window.removeEventListener('focus', refreshPermission);
      document.removeEventListener('visibilitychange', refreshPermission);
    };
  }, [refreshAuth, workspaceId]);

  async function togglePush() {
    if (busy || !supported) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (subscribed) {
        const serverRevoked = await disablePushOnDevice(workspaceId);
        setSubscribed(false);
        if (!serverRevoked)
          setNotice(
            'O push foi desativado neste aparelho. O servidor não confirmou a revogação; ele descartará a inscrição quando o endpoint expirar.',
          );
        return;
      }
      if (Notification.permission === 'denied') {
        setError(
          'As notificações estão bloqueadas nas opções deste site. Altere a permissão do site para “Perguntar” ou “Permitir” e volte a esta tela.',
        );
        return;
      }
      if (!serverEnabled)
        throw new Error('O envio de notificações ainda não foi configurado neste servidor.');
      let nextPermission: NotificationPermission = Notification.permission;
      if (nextPermission === 'default') nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== 'granted') {
        if (nextPermission === 'denied')
          throw new Error('A permissão foi negada. Altere-a nas configurações do navegador.');
        throw new Error('A permissão para notificações não foi concedida.');
      }
      const status = await getPushStatus(workspaceId);
      setServerEnabled(status.enabled && Boolean(status.publicKey));
      if (!status.enabled || !status.publicKey)
        throw new Error('O envio de notificações ainda não foi configurado neste servidor.');
      await enablePushOnDevice(workspaceId, status.publicKey);
      setSubscribed(true);
    } catch (cause) {
      if (cause instanceof ApiRequestError && [401, 403].includes(cause.status)) void refreshAuth();
      setError(pushFailureMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const description = !supported
    ? 'Este navegador ou esta conexão não oferece Web Push neste aparelho.'
    : permission === 'denied'
      ? 'A permissão foi negada no navegador. Você pode alterá-la nas configurações do site.'
      : subscribed
        ? 'Este aparelho está inscrito para receber avisos de novos chamados.'
        : permission === 'granted'
          ? 'A permissão já foi concedida. A ativação não será solicitada novamente neste navegador.'
          : 'Ative para receber avisos de novos chamados neste aparelho.';

  return (
    <Card>
      <CardHeader>
        <span className="grid size-11 place-items-center rounded-xl border border-primary/10 bg-primary/10 text-primary">
          {subscribed ? (
            <BellRing aria-hidden="true" className="size-5" />
          ) : (
            <BellOff aria-hidden="true" className="size-5" />
          )}
        </span>
        <CardTitle>Notificações neste aparelho</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <Feedback message={error} tone="error" />}
        {notice && <Feedback message={notice} tone="warning" />}
        {!serverEnabled && supported && !loading && !error && (
          <Feedback
            message="O servidor ainda não está configurado para enviar Web Push. A campainha continua disponível quando há conexão."
            tone="info"
          />
        )}
        <Button
          disabled={
            loading ||
            busy ||
            !supported ||
            (!subscribed && permission !== 'denied' && !serverEnabled)
          }
          onClick={() => void togglePush()}
          variant={subscribed ? 'outline' : 'default'}
        >
          {busy
            ? 'Atualizando…'
            : subscribed
              ? 'Desativar neste aparelho'
              : permission === 'denied'
                ? 'Permissão bloqueada'
                : permission === 'granted'
                  ? 'Concluir ativação'
                  : 'Ativar notificações'}
        </Button>
      </CardContent>
    </Card>
  );
}
