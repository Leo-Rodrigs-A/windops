import { Link } from '@tanstack/react-router';
import {
  ArrowDown,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  KeyRound,
  Search,
  ShieldCheck,
  Users,
  Wind,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/auth-context';
import { TowerMark } from '../components/brand/tower-mark';
import { SignOutButton } from '../components/sign-out-button';
import { ThemeToggle } from '../components/theme-toggle';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const stages = [
  [
    '01',
    'Registre o problema',
    'Selecione o parque e a turbina. Descreva o que precisa de atenção.',
  ],
  ['02', 'Coloque a equipe no contexto', 'O registro fica no workspace para a equipe acompanhar.'],
  ['03', 'Acompanhe até a conclusão', 'Veja o andamento e consulte o histórico quando precisar.'],
];

const issues = [
  {
    state: 'Pendente',
    title: 'Elevador não inicia a subida',
    place: 'Ventos do Norte · Turbina ZAC-01-08',
    color: 'amber',
  },
  {
    state: 'Em andamento',
    title: 'Ruído durante a subida',
    place: 'Ventos do Norte · Turbina ZAC-01-09',
    color: 'blue',
  },
  {
    state: 'Concluída',
    title: 'Porta não fecha corretamente',
    place: 'Sul · Turbina ZAC-02-03',
    color: 'green',
  },
];

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-brand">{children}</p>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
}) {
  return (
    <div className="max-w-3xl space-y-3">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">{title}</h2>
      {description && (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      )}
    </div>
  );
}

function Section({
  children,
  id,
  className = '',
}: {
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section className={`border-t border-border py-14 sm:py-20 ${className}`} id={id}>
      {children}
    </section>
  );
}

function MiniIssueCard({ item }: { item: (typeof issues)[number] }) {
  const colors = {
    amber: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    blue: 'border-blue-400/20 bg-blue-400/10 text-blue-300',
    green: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  };
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{item.place.split(' · ')[0]}</span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] ${colors[item.color as keyof typeof colors]}`}
        >
          {item.state}
        </span>
      </div>
      <p className="mt-3 text-sm font-medium leading-snug">{item.title}</p>
      <p className="mt-2 text-xs text-muted-foreground">{item.place.split(' · ')[1]}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-[11px] text-brand">
        Abrir chamado <ArrowRight className="size-3" />
      </span>
    </div>
  );
}

export function PublicLandingPage() {
  const { snapshot } = useAuth();
  const orphan = snapshot.status === 'orphan';
  const accountName = orphan ? snapshot.me.user.name.trim() || snapshot.me.user.email : '';

  return (
    <main className="relative isolate overflow-hidden bg-background px-5 text-foreground sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(ellipse_at_50%_8%,rgb(21_93_252_/_0.18),transparent_55%),radial-gradient(ellipse_at_90%_45%,rgb(6_182_212_/_0.07),transparent_34%)]"
      />
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between py-5 sm:py-6">
          <Link aria-label="Wind Report, início" className="inline-flex items-center gap-2" to="/">
            <TowerMark className="size-5" />
            <span className="text-sm font-semibold tracking-tight">Wind Report</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {orphan ? (
              <>
                <span
                  className="hidden max-w-48 truncate px-2 text-xs font-medium sm:inline"
                  title={accountName}
                >
                  {accountName}
                </span>
                <SignOutButton />
              </>
            ) : (
              <>
                <Button asChild className="hidden sm:inline-flex" size="sm" variant="ghost">
                  <Link to="/entrar">Entrar</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/cadastro">
                    Criar conta <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </header>

        <section className="grid items-center gap-10 pb-16 pt-10 sm:pb-24 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="space-y-5 sm:space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-brand">
              <ShieldCheck className="size-4" /> Operação de campo, com contexto
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
              O registro começa <span className="text-brand">no campo.</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Wind Report organiza o registro e o acompanhamento de problemas nos elevadores de
              torres eólicas, conectando o trabalho de campo à equipe de operação.
            </p>
            {orphan ? (
              <Card className="max-w-xl bg-card/80">
                <CardHeader>
                  <CardTitle className="text-base">Sua sessão continua ativa</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Esta conta ainda não está vinculada a um workspace.
                  </p>
                </CardHeader>
                <CardContent>
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
                      Começar <ArrowRight />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary">
                    <Link to="/entrar">Já tenho acesso</Link>
                  </Button>
                </div>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <KeyRound className="size-4 text-brand" /> Acesso protegido por verificação de
                  e-mail.
                </p>
              </>
            )}
          </div>
          <Card className="overflow-hidden border-border/80 bg-card/80 shadow-2xl shadow-blue-950/20">
            <CardHeader className="border-b border-border py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-blue-500/15 text-brand">
                  <Wind className="size-5" />
                </span>
                <div>
                  <CardTitle className="text-sm">Registro de campo</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">Prévia ilustrativa do fluxo</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-[0.85fr_1.15fr] sm:p-5">
              <div className="space-y-3 rounded-xl border border-border bg-background/60 p-4">
                <p className="text-xs font-medium text-muted-foreground">Fluxo de trabalho</p>
                {['Registrar no local', 'Contextualizar a equipe', 'Acompanhar atendimento'].map(
                  (label) => (
                    <div className="flex items-center gap-2 text-xs" key={label}>
                      <CheckCircle2 className="size-4 shrink-0 text-brand" />
                      {label}
                    </div>
                  ),
                )}
              </div>
              <div
                aria-hidden="true"
                className="relative min-h-36 overflow-hidden rounded-xl border border-blue-300/15 bg-[radial-gradient(ellipse_at_72%_25%,rgb(37_99_235_/_0.46),transparent_44%),linear-gradient(145deg,#09090b,#18181b_65%,#082f49)]"
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
        </section>

        <div className="flex items-center justify-between border-b border-border pb-4 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>Do primeiro registro ao histórico da operação</span>
          <a
            aria-label="Ir para como funciona"
            className="rounded p-2 text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="#como-funciona"
          >
            <ArrowDown className="size-4" />
          </a>
        </div>

        <Section className="border-t-0 pt-10" id="como-funciona">
          <div className="space-y-8">
            <SectionTitle
              eyebrow="Um fluxo para quem está no campo"
              title="Do problema identificado ao chamado resolvido."
              description="Registre no local, compartilhe o contexto e acompanhe o atendimento. O mesmo chamado conecta o técnico à equipe de operação."
            />
            <div className="grid gap-5 md:grid-cols-3">
              {stages.map(([number, title, description]) => (
                <article className="border-t border-border pt-4" key={number}>
                  <p className="text-lg font-semibold text-brand">{number}</p>
                  <h3 className="mt-2 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </article>
              ))}
            </div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Acompanhamento por parque, turbina e situação do chamado
            </p>
          </div>
        </Section>

        <Section>
          <div className="grid items-center gap-9 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-6">
              <SectionTitle
                eyebrow="01 / Registro no local"
                title={
                  <>
                    O sinal pode cair.
                    <br />
                    Seu registro continua.
                  </>
                }
                description="Registre o problema durante a visita, com o parque e a turbina certos. Quando houver conexão, o trabalho pode seguir para sincronização."
              />
              <div className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
                  <Check className="size-4" />
                </span>
                <span>
                  <strong className="font-medium">
                    Pendências visíveis, sem depender da memória.
                  </strong>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    O estado da sincronização é apresentado no aplicativo.
                  </span>
                </span>
              </div>
            </div>
            <Card className="mx-auto w-full max-w-lg bg-card/80">
              <CardHeader className="pb-3">
                <p className="text-xs text-muted-foreground">Demonstração ilustrativa</p>
                <CardTitle className="text-base">Novo chamado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Parque', 'Ventos do Norte'],
                    ['Turbina', 'Turbina ZAC-01-08'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="mb-1.5 text-[10px] text-muted-foreground">{label}</p>
                      <div className="truncate rounded-md bg-muted px-3 py-2 text-xs">{value}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] text-muted-foreground">Descrição do problema</p>
                  <div className="rounded-md bg-muted p-3 text-xs leading-relaxed">
                    Elevador não inicia a subida.
                    <br />
                    Painel energizado; comando sem resposta.
                  </div>
                </div>
                <p className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle2 className="size-4" /> Salvo neste dispositivo
                </p>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section>
          <div className="grid items-center gap-9 lg:grid-cols-2 lg:gap-16">
            <Card className="order-2 mx-auto w-full max-w-lg bg-card/80 lg:order-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Demonstração ilustrativa</p>
                    <CardTitle className="mt-1 text-base">Notificações</CardTitle>
                  </div>
                  <Bell className="size-4 text-brand" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  A equipe pode receber avisos de novos chamados neste aparelho.
                </p>
                <span className="inline-flex min-h-9 items-center rounded-md bg-secondary px-3 text-xs font-medium text-secondary-foreground">
                  Ativar notificações
                </span>
                <div className="-mr-3 rounded-lg border border-border bg-muted p-3">
                  <p className="flex items-center gap-2 text-xs font-medium">
                    <TowerMark className="size-3" /> Wind Report{' '}
                    <span className="ml-auto text-muted-foreground">agora</span>
                  </p>
                  <p className="mt-2 text-xs font-semibold">Novo chamado · Ventos do Norte</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Turbina ZAC-01-08 · Elevador não inicia a subida
                  </p>
                </div>
              </CardContent>
            </Card>
            <div className="order-1 space-y-6 lg:order-2">
              <SectionTitle
                eyebrow="02 / Contexto compartilhado"
                title="Sua equipe fica sabendo."
                description="Avisos no aparelho ajudam a equipe a acompanhar os novos chamados sem depender de um repasse manual."
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Requer notificações ativadas e suporte do navegador e do dispositivo. O envio
                depende de conexão.
              </p>
            </div>
          </div>
        </Section>

        <Section>
          <div className="space-y-8">
            <SectionTitle
              eyebrow="Organização da operação"
              title="Cada equipe no seu espaço."
              description="Pessoas, parques e chamados reunidos no workspace. Administradores e técnicos trabalham com os acessos do seu perfil."
            />
            <div className="grid items-center gap-3 md:grid-cols-[1.1fr_32px_1fr_32px_1fr]">
              <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-5">
                <span className="rounded-full bg-blue-400/10 px-2 py-1 text-[10px] text-blue-300">
                  WORKSPACE
                </span>
                <h3 className="mt-3 font-semibold">Operação eólica</h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  Equipe e inventário no mesmo contexto
                </p>
              </div>
              <div aria-hidden="true" className="hidden h-px bg-border md:block" />
              <div className="grid gap-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Users className="size-4 text-brand" /> Equipe
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Administradores e técnicos</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Wind className="size-4 text-brand" /> Parques e turbinas
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ventos do Norte · Turbina ZAC-01-08
                  </p>
                </div>
              </div>
              <div aria-hidden="true" className="hidden h-px bg-border md:block" />
              <div className="rounded-xl border border-border bg-card p-4">
                <span className="rounded-full bg-amber-400/10 px-2 py-1 text-[10px] text-amber-300">
                  CHAMADO
                </span>
                <p className="mt-3 text-sm font-medium">Elevador não inicia a subida</p>
              </div>
            </div>
          </div>
        </Section>

        <Section>
          <div className="space-y-7">
            <SectionTitle
              eyebrow="03 / Atendimento e conclusão"
              title="Cada status deixa o próximo passo mais claro."
              description="Chamados organizados por situação, com o contexto do equipamento sempre visível."
            />
            <div className="grid gap-3 lg:grid-cols-3">
              {issues.map((item) => (
                <MiniIssueCard item={item} key={item.state} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Do registro à conclusão: alterações permanecem no histórico do chamado.
            </p>
          </div>
        </Section>

        <Section>
          <div className="space-y-7">
            <SectionTitle
              eyebrow="Contexto que continua útil"
              title="Encontre o chamado. Recupere o histórico."
              description="Pesquise e filtre por parque e turbina para localizar o que precisa de atenção."
            />
            <Card className="overflow-hidden bg-card/80">
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
                  <Button size="sm">Abertos e em andamento</Button>
                  <Button size="sm" variant="secondary">
                    Pendentes
                  </Button>
                  <Button size="sm" variant="secondary">
                    Em andamento
                  </Button>
                  <span className="ml-auto inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
                    <ClipboardList className="size-4" /> Novo chamado
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  <Search className="size-4" /> Pesquisar texto, parque ou turbina
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-muted px-3 py-1 text-[10px]">
                    Ventos do Norte
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1 text-[10px]">
                    Turbina ZAC-01-08
                  </span>
                </div>
                <div className="flex items-start gap-3 border-t border-border pt-4">
                  <ClipboardList className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">Ventos do Norte · Turbina ZAC-01-08</p>
                    <p className="mt-1 text-xs">Elevador não inicia a subida</p>
                  </div>
                  <span className="rounded-full bg-amber-400/10 px-2 py-1 text-[10px] text-amber-300">
                    Pendente
                  </span>
                </div>
                <p className="text-right text-[10px] text-muted-foreground">Prévia ilustrativa</p>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section>
          <div className="space-y-6">
            <SectionTitle eyebrow="Antes de ir a campo" title="Dúvidas frequentes" />
            {[
              [
                'Preciso de internet para começar?',
                'Sim. Faça o primeiro acesso com conexão e habilite o trabalho offline antes da visita.',
              ],
              [
                'Quando meus registros são enviados?',
                'Ao abrir ou retomar o app com internet, as pendências são preparadas para sincronização.',
              ],
              [
                'As notificações funcionam com o app fechado?',
                'Podem funcionar com push ativado, conforme o suporte do navegador e do dispositivo.',
              ],
              [
                'Posso instalar no meu dispositivo?',
                'O Wind Report pode ser instalado pelo navegador como PWA em dispositivos compatíveis.',
              ],
            ].map(([question, answer]) => (
              <details className="group border-t border-border py-4" key={question}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {question}
                  <ChevronDown className="size-4 shrink-0 text-brand transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </Section>

        <section className="mb-12 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-6 sm:mb-16 sm:p-9">
          <div className="max-w-3xl space-y-4">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Leve o registro para onde o trabalho acontece.
            </h2>
            <p className="text-sm text-muted-foreground">
              Organize os chamados e mantenha sua equipe no mesmo contexto.
            </p>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <Button asChild>
                <Link to={orphan ? '/sem-workspace' : '/cadastro'}>
                  {orphan ? 'Ver status do acesso' : 'Criar conta'} <ArrowRight />
                </Link>
              </Button>
              {!orphan && (
                <Button asChild variant="link">
                  <Link to="/entrar">Já tenho acesso →</Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-border py-5 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Wind Report · Operação em campo</span>
          <span>Desenvolvido para equipes de manutenção eólica</span>
        </footer>
      </div>
    </main>
  );
}
