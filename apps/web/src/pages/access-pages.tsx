import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, CheckCircle2, Globe, KeyRound, Mail, ShieldCheck, Wind } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { AccessLayout } from '../components/access-layout';
import { TowerMark } from '../components/brand/tower-mark';
import { SignOutButton } from '../components/sign-out-button';
import { ThemeToggle } from '../components/theme-toggle';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Feedback, LoadingState } from '../components/ui/feedback';
import { TextField } from '../components/ui/form-field';
import { ApiRequestError, authPost, getAuthProviders } from '../lib/auth-api';

function failureMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError && error.status === 429) {
    return 'Muitas tentativas em pouco tempo. Aguarde e tente novamente.';
  }
  if (error instanceof ApiRequestError && (error.status === 404 || error.status >= 500)) {
    return 'O serviço de autenticação está indisponível neste momento. Tente novamente em instantes.';
  }
  if (error instanceof Error && error.message.startsWith('Não foi possível conectar'))
    return error.message;
  return fallback;
}

function InlineLink({
  to,
  children,
}: {
  to: '/entrar' | '/cadastro' | '/recuperar-senha' | '/';
  children: string;
}) {
  return (
    <Button asChild className="h-auto min-h-0 px-1 py-0" size="sm" variant="link">
      <Link to={to}>{children}</Link>
    </Button>
  );
}

function ErrorNotice({ message }: { message: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div
      className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      ref={ref}
      tabIndex={-1}
    >
      <Feedback message={message} tone="error" />
    </div>
  );
}

export function LandingPage() {
  const { snapshot } = useAuth();
  const orphan = snapshot.status === 'orphan';
  const accountName = orphan ? snapshot.me.user.name.trim() || snapshot.me.user.email : '';

  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-background px-5 text-foreground sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_15%,rgb(21_93_252_/_0.23),transparent_46%),radial-gradient(ellipse_at_90%_60%,rgb(6_182_212_/_0.1),transparent_36%)]"
      />
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between py-6">
        <Link aria-label="Wind Ops, início" className="inline-flex items-center gap-2" to="/">
          <TowerMark className="size-6 text-primary" />
          <span className="font-semibold tracking-tight">Wind Ops</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {orphan ? (
            <>
              <span className="max-w-48 truncate px-2 text-sm font-medium" title={accountName}>
                {accountName}
              </span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Button asChild className="hidden sm:inline-flex" variant="ghost">
                <Link to="/entrar">Entrar</Link>
              </Button>
              <Button asChild>
                <Link to="/cadastro">
                  Criar conta <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </header>
      <section className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div className="max-w-2xl space-y-7">
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-brand">
            <ShieldCheck aria-hidden="true" className="size-4" /> Operação de campo, com contexto
          </p>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            O registro começa <span className="text-brand">no campo.</span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Wind Ops organiza o registro e o acompanhamento de problemas nos elevadores de torres
            eólicas, conectando o trabalho de campo à equipe de operação.
          </p>
          {orphan ? (
            <Card className="max-w-xl bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Sua sessão continua ativa</CardTitle>
                <CardDescription>
                  Esta conta ainda não está vinculada a um workspace. Você pode voltar aqui sem
                  entrar novamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row">
                <Button asChild>
                  <Link to="/sem-workspace">Ver status do acesso</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link to="/cadastro">
                    Começar <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/entrar">Já tenho acesso</Link>
                </Button>
              </div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <KeyRound aria-hidden="true" className="size-4 text-brand" /> Acesso protegido por
                verificação de e-mail.
              </p>
            </>
          )}
        </div>
        <div className="relative mx-auto w-full max-w-xl">
          <div
            aria-hidden="true"
            className="absolute -inset-8 -z-10 rounded-full bg-blue-500/10 blur-3xl"
          />
          <Card className="overflow-hidden bg-card/90 shadow-2xl shadow-blue-950/30">
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-blue-500/15 text-brand">
                  <Wind aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <CardTitle className="text-base">Registro de campo</CardTitle>
                  <CardDescription>Contexto compartilhado com a equipe</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-3 rounded-xl border border-border bg-background/60 p-4">
                <p className="text-xs font-medium text-muted-foreground">Fluxo de trabalho</p>
                {['Registrar no local', 'Contextualizar a equipe', 'Acompanhar atendimento'].map(
                  (item) => (
                    <div className="flex items-center gap-2 text-sm" key={item}>
                      <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-brand" />
                      <span>{item}</span>
                    </div>
                  ),
                )}
              </div>
              <div
                aria-hidden="true"
                className="relative min-h-48 overflow-hidden rounded-xl border border-blue-300/15 bg-[radial-gradient(ellipse_at_72%_25%,rgb(37_99_235_/_0.46),transparent_44%),linear-gradient(145deg,#09090b,#18181b_65%,#082f49)]"
              >
                <div className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255_/_0.035)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255_/_0.035)_1px,transparent_1px)] bg-[size:26px_26px]" />
                <div className="absolute top-[28%] left-[18%] h-px w-[64%] rotate-[-18deg] bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
                <div className="absolute top-[28%] left-[46%] size-2 rounded-full bg-cyan-100 shadow-[0_0_26px_10px_rgb(34_211_238_/_0.3)]" />
                <div className="absolute right-4 bottom-4 left-4 rounded-lg border border-white/10 bg-black/25 p-3 backdrop-blur">
                  <div className="mb-2 h-2 w-1/3 rounded bg-blue-200/60" />
                  <div className="h-2 w-4/5 rounded bg-white/20" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      <footer className="mx-auto flex w-full max-w-7xl items-center justify-between border-t border-border py-5 text-xs text-muted-foreground">
        <span>Wind Ops · Operação em campo</span>
        <span>Desenvolvido para equipes de manutenção eólica</span>
      </footer>
    </main>
  );
}

export function SignInPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const googleError = new URLSearchParams(window.location.search).has('erro');
  const passwordChanged = new URLSearchParams(window.location.search).has('senha');

  useEffect(() => {
    let mounted = true;
    void getAuthProviders()
      .then((providers) => {
        if (mounted) setGoogleConfigured(providers.google);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await authPost('/api/auth/sign-in/email', { email, password });
      const next = await refresh();
      if (next.status === 'pending') await navigate({ to: '/confirmar-acesso', replace: true });
      else if (next.status === 'authenticated') await navigate({ to: '/app', replace: true });
      else if (next.status === 'orphan') await navigate({ to: '/sem-workspace', replace: true });
      else setError('Não foi possível iniciar a sessão. Confira seus dados e tente novamente.');
    } catch (cause) {
      setError(failureMessage(cause, 'Não foi possível entrar. Confira seu e-mail e sua senha.'));
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setError('');
    setBusy(true);
    try {
      const result = await authPost('/api/auth/sign-in/social', {
        provider: 'google',
        callbackURL: window.location.origin,
        errorCallbackURL: `${window.location.origin}/entrar?erro=google`,
      });
      const parsed = result as { url?: unknown } | null;
      if (typeof parsed?.url !== 'string') throw new Error('Resposta inválida do provedor.');
      const target = new URL(parsed.url);
      if (target.protocol !== 'https:' || target.hostname !== 'accounts.google.com') {
        throw new Error('Destino de autenticação inválido.');
      }
      window.location.assign(target.href);
    } catch (cause) {
      setError(
        failureMessage(
          cause,
          'Não foi possível iniciar o acesso com Google. Tente com e-mail e senha.',
        ),
      );
      setBusy(false);
    }
  }

  return (
    <AccessLayout
      description="Entre para continuar o trabalho da sua equipe. Depois da senha, enviaremos um código de acesso para seu e-mail."
      eyebrow="Acesso à operação"
      formDescription="Use sua senha ou uma conta Google. Toda nova entrada exige confirmação por e-mail."
      formTitle="Acesse sua conta"
      heading="Entrar no Wind Ops"
    >
      {googleError && (
        <Feedback
          message="O acesso com Google foi cancelado ou não pôde ser concluído. Você pode tentar novamente."
          tone="warning"
        />
      )}
      {passwordChanged && (
        <Feedback
          message="Sua senha foi atualizada. Entre novamente com a nova senha."
          tone="success"
        />
      )}
      {error && <ErrorNotice key={error} message={error} />}
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <TextField
          autoComplete="email"
          label="E-mail"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
        <TextField
          autoComplete="current-password"
          label="Senha"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        <div className="flex justify-end">
          <Button asChild className="h-auto min-h-0 px-1 py-0" size="sm" variant="link">
            <Link to="/recuperar-senha">Esqueci minha senha</Link>
          </Button>
        </div>
        <Button className="w-full" disabled={busy} type="submit">
          {busy ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <div className="relative py-1 text-center text-xs text-muted-foreground before:absolute before:inset-x-0 before:top-1/2 before:border-t before:border-border">
        <span className="relative bg-card px-3">ou</span>
      </div>
      {googleConfigured && (
        <Button
          className="w-full"
          disabled={busy}
          onClick={() => void signInWithGoogle()}
          type="button"
          variant="outline"
        >
          <Globe aria-hidden="true" /> Continuar com Google
        </Button>
      )}
      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem acesso? <InlineLink to="/cadastro">Criar conta</InlineLink>
      </p>
    </AccessLayout>
  );
}

export function SignUpPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError('As senhas não conferem. Revise os dois campos.');
      return;
    }
    setBusy(true);
    try {
      await authPost('/api/auth/sign-up/email', {
        name: name.trim(),
        email,
        password,
        callbackURL: `${window.location.origin}/verificar-email?emailVerified=true`,
      });
      await navigate({ to: '/verificar-email', replace: true });
    } catch (cause) {
      setError(
        failureMessage(
          cause,
          'Não foi possível iniciar o cadastro. Confira os dados e tente novamente.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccessLayout
      description="Crie sua identidade de acesso. A entrada na operação depende de um vínculo autorizado com um workspace."
      eyebrow="Novo acesso"
      formDescription="Após o cadastro, confirme o e-mail para ativar sua identidade."
      formTitle="Dados da conta"
      heading="Criar sua conta"
    >
      {error && <ErrorNotice key={error} message={error} />}
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <TextField
          autoComplete="name"
          label="Nome"
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
        <TextField
          autoComplete="email"
          label="E-mail de trabalho"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
        <TextField
          autoComplete="new-password"
          description="Use pelo menos 12 caracteres."
          label="Senha"
          minLength={12}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        <TextField
          autoComplete="new-password"
          label="Confirmar senha"
          minLength={12}
          onChange={(event) => setConfirmation(event.target.value)}
          required
          type="password"
          value={confirmation}
        />
        <Button className="w-full" disabled={busy} type="submit">
          {busy ? 'Enviando…' : 'Criar conta'}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Já tem uma conta? <InlineLink to="/entrar">Entrar</InlineLink>
      </p>
    </AccessLayout>
  );
}

export function VerifyEmailPage() {
  const verified = new URLSearchParams(window.location.search).get('emailVerified') === 'true';
  return (
    <AccessLayout
      description="A confirmação do endereço protege a titularidade da conta e prepara o acesso seguro à operação."
      eyebrow="Confirmação de endereço"
      formDescription="Acesse sua caixa de entrada para continuar."
      formTitle={verified ? 'Confirmação concluída' : 'Confirme seu endereço'}
      heading={verified ? 'E-mail confirmado' : 'Confira seu e-mail'}
    >
      <div className="grid size-12 place-items-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-brand">
        {verified ? (
          <CheckCircle2 aria-hidden="true" className="size-6" />
        ) : (
          <Mail aria-hidden="true" className="size-6" />
        )}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {verified
          ? 'Seu endereço foi confirmado. Agora você pode entrar com seu e-mail e senha.'
          : 'Se o cadastro foi aceito, enviamos um link para confirmar o endereço informado. Abra o e-mail e use o link para concluir esta etapa.'}
      </p>
      {!verified && (
        <Feedback
          message="Se a mensagem não chegar, confira a pasta de spam antes de tentar novamente."
          tone="info"
        />
      )}
      <Button asChild className="w-full">
        <Link to="/entrar">Ir para entrar</Link>
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        O cadastro não cria automaticamente um vínculo com uma empresa.
      </p>
    </AccessLayout>
  );
}

export function SecondStepPage() {
  const { snapshot, refresh } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pending = snapshot.status === 'pending' ? snapshot : null;

  if (snapshot.status === 'loading') {
    return (
      <AccessLayout
        description="Cada nova entrada online exige uma confirmação adicional por e-mail."
        eyebrow="Verificação de segurança"
        formTitle="Conferindo seu acesso"
        heading="Confirme seu acesso"
      >
        <LoadingState label="Conferindo a etapa de segurança…" />
      </AccessLayout>
    );
  }

  if (snapshot.status === 'error') {
    return (
      <AccessLayout
        description="Cada nova entrada online exige uma confirmação adicional por e-mail."
        eyebrow="Verificação de segurança"
        formTitle="Não foi possível validar"
        heading="Confirme seu acesso"
      >
        <Feedback message={snapshot.message} tone="error" />
        <Button className="w-full" onClick={() => void refresh()}>
          Tentar novamente
        </Button>
        <Button asChild className="w-full" variant="outline">
          <Link to="/entrar">Voltar para entrar</Link>
        </Button>
      </AccessLayout>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!/^\d{8}$/.test(code)) {
      setError('Informe os oito dígitos do código.');
      return;
    }
    setBusy(true);
    try {
      await authPost('/api/auth/second-step/verify', { code });
      const next = await refresh();
      if (next.status === 'authenticated') await navigate({ to: '/app', replace: true });
      else if (next.status === 'orphan') await navigate({ to: '/sem-workspace', replace: true });
      else setError('Não foi possível confirmar o código. Entre novamente para solicitar outro.');
    } catch (cause) {
      setError(
        failureMessage(
          cause,
          'Código inválido ou expirado. Confira o e-mail ou solicite um novo código.',
        ),
      );
      await refresh();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError('');
    setNotice('');
    setResending(true);
    try {
      await authPost('/api/auth/second-step/resend');
      const next = await refresh();
      setNotice(
        next.status === 'pending'
          ? `Um novo código foi enviado. Ele expira às ${new Date(next.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`
          : 'Se a etapa ainda estiver ativa, um novo código foi enviado.',
      );
    } catch (cause) {
      setError(
        failureMessage(
          cause,
          'Não foi possível enviar outro código. Aguarde um pouco e tente novamente.',
        ),
      );
    } finally {
      setResending(false);
    }
  }

  if (!pending) {
    return (
      <AccessLayout
        description="Cada nova entrada online exige uma confirmação adicional por e-mail."
        eyebrow="Verificação de segurança"
        formDescription="Informe o código recebido para continuar."
        formTitle="Código de confirmação"
        heading="Confirme seu acesso"
      >
        <Feedback
          message="Esta etapa não está ativa. Entre novamente para iniciar uma nova confirmação."
          tone="warning"
        />
        <Button asChild className="w-full">
          <Link to="/entrar">Voltar para entrar</Link>
        </Button>
      </AccessLayout>
    );
  }

  return (
    <AccessLayout
      description="Digite o código de oito dígitos enviado ao e-mail da sua conta. O código é validado pelo servidor."
      eyebrow="Segunda etapa obrigatória"
      formDescription="O código não é armazenado neste dispositivo."
      formTitle="Código de acesso"
      heading="Confirme seu acesso"
    >
      <div className="flex items-start gap-3 rounded-lg border border-border bg-background/50 p-3 text-sm">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand" />
        <p className="text-muted-foreground">
          O código expira às{' '}
          {new Date(pending.expiresAt).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
          .
        </p>
      </div>
      {notice && <Feedback message={notice} tone="success" />}
      {error && <ErrorNotice key={error} message={error} />}
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <TextField
          autoComplete="one-time-code"
          autoFocus
          inputMode="numeric"
          label="Código de acesso"
          maxLength={8}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
          pattern="[0-9]{8}"
          placeholder="00000000"
          required
          value={code}
        />
        <Button className="w-full" disabled={busy} type="submit">
          {busy ? 'Confirmando…' : 'Confirmar e continuar'}
        </Button>
      </form>
      <Button
        className="w-full"
        disabled={busy || resending}
        onClick={() => void resend()}
        type="button"
        variant="outline"
      >
        {resending ? 'Enviando…' : 'Enviar outro código'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        A validade e os limites de tentativas são controlados pelo servidor.
      </p>
    </AccessLayout>
  );
}

export function RecoverPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await authPost('/api/auth/request-password-reset', {
        email,
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      setSent(true);
    } catch (cause) {
      setError(
        failureMessage(cause, 'Não foi possível enviar a solicitação. Tente novamente mais tarde.'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccessLayout
      description="Solicite um link de recuperação para criar uma nova senha."
      eyebrow="Recuperação de acesso"
      formDescription="A resposta não informa se o endereço possui uma conta."
      formTitle="Solicite um link"
      heading="Esqueceu sua senha?"
    >
      {sent ? (
        <>
          <Feedback
            message="Se houver uma conta associada ao endereço informado, enviaremos instruções para redefinir a senha."
            tone="info"
          />
          <p className="text-sm text-muted-foreground">
            Confira também a pasta de spam. Por segurança, esta confirmação não revela se o e-mail
            existe.
          </p>
          <Button asChild className="w-full" variant="outline">
            <Link to="/entrar">Voltar para entrar</Link>
          </Button>
        </>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={submit}>
          {error && <ErrorNotice key={error} message={error} />}
          <TextField
            autoComplete="email"
            label="E-mail da conta"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
          <Button className="w-full" disabled={busy} type="submit">
            {busy ? 'Enviando…' : 'Enviar link de recuperação'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <InlineLink to="/entrar">Voltar para entrar</InlineLink>
          </p>
        </form>
      )}
    </AccessLayout>
  );
}

export function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get('token');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!token) {
      setError('Este link não contém um token de recuperação. Solicite outro link.');
      return;
    }
    if (password !== confirmation) {
      setError('As senhas não conferem. Revise os dois campos.');
      return;
    }
    setBusy(true);
    try {
      await authPost('/api/auth/reset-password', { token, newPassword: password });
      window.location.assign('/entrar?senha=alterada');
    } catch (cause) {
      setError(
        failureMessage(
          cause,
          'O link pode ter expirado ou já ter sido usado. Solicite uma nova recuperação.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccessLayout
      description="Escolha uma senha nova com pelo menos 12 caracteres. O link é válido para um único uso."
      eyebrow="Redefinição de senha"
      formDescription="Escolha uma nova senha para sua conta."
      formTitle="Nova senha"
      heading="Crie uma nova senha"
    >
      {error && <ErrorNotice key={error} message={error} />}
      {!token ? (
        <>
          <Feedback
            message="O link está incompleto ou expirou. Solicite um novo para continuar."
            tone="warning"
          />
          <Button asChild className="w-full">
            <Link to="/recuperar-senha">Solicitar novo link</Link>
          </Button>
        </>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <TextField
            autoComplete="new-password"
            label="Nova senha"
            minLength={12}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          <TextField
            autoComplete="new-password"
            label="Confirmar nova senha"
            minLength={12}
            onChange={(event) => setConfirmation(event.target.value)}
            required
            type="password"
            value={confirmation}
          />
          <Button className="w-full" disabled={busy} type="submit">
            {busy ? 'Salvando…' : 'Salvar nova senha'}
          </Button>
          <Button asChild className="w-full" variant="outline">
            <Link to="/recuperar-senha">Solicitar novo link</Link>
          </Button>
        </form>
      )}
    </AccessLayout>
  );
}
