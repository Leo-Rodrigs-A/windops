import { Link } from '@tanstack/react-router';
import { Wind } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export function AccessLayout({
  eyebrow,
  heading,
  description,
  formTitle = 'Acesso seguro',
  formDescription = 'Preencha os dados para continuar nesta etapa.',
  children,
}: {
  eyebrow: string;
  heading: string;
  description: string;
  formTitle?: string;
  formDescription?: string;
  children: ReactNode;
}) {
  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-background px-5 py-6 text-foreground sm:px-8 lg:py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_20%_15%,rgb(21_93_252_/_0.2),transparent_42%),radial-gradient(ellipse_at_80%_75%,rgb(6_182_212_/_0.08),transparent_36%)]"
      />
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between">
        <Link aria-label="Wind Ops, início" className="inline-flex items-center gap-2" to="/">
          <Wind aria-hidden="true" className="size-6 text-primary" />
          <span className="font-semibold tracking-tight">Wind Ops</span>
        </Link>
        <Button asChild variant="ghost">
          <Link to="/entrar">Entrar</Link>
        </Button>
      </header>
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 py-12 md:min-h-[calc(100dvh-7rem)] md:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)] md:gap-16 md:py-16">
        <section className="mx-auto w-full max-w-xl space-y-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-300">{eyebrow}</p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {heading}
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            {description}
          </p>
          <div className="hidden overflow-hidden rounded-2xl border border-border/80 bg-card/70 p-5 shadow-2xl shadow-blue-950/20 sm:block">
            <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="size-2 rounded-full bg-blue-400" />
                Registro de campo
              </div>
              <span className="text-xs text-muted-foreground">Wind Ops</span>
            </div>
            <div aria-hidden="true" className="grid grid-cols-[0.8fr_1.2fr] gap-3">
              <div className="space-y-3 rounded-lg border border-border bg-background/70 p-3">
                <div className="h-2 w-2/3 rounded bg-muted-foreground/40" />
                <div className="h-2 w-full rounded bg-muted-foreground/20" />
                <div className="h-2 w-4/5 rounded bg-muted-foreground/20" />
                <div className="h-8 rounded-md border border-border bg-blue-500/10" />
              </div>
              <div className="relative min-h-28 overflow-hidden rounded-lg border border-blue-400/20 bg-[radial-gradient(ellipse_at_70%_35%,rgb(37_99_235_/_0.42),transparent_52%),linear-gradient(145deg,rgb(9_9_11),rgb(24_24_27))]">
                <div className="absolute inset-x-4 top-5 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
                <div className="absolute top-4 left-1/2 size-2 rounded-full bg-cyan-200 shadow-[0_0_22px_8px_rgb(34_211_238_/_0.24)]" />
                <div className="absolute inset-x-5 bottom-4 h-9 rounded-md border border-white/10 bg-white/[0.04]" />
              </div>
            </div>
          </div>
        </section>
        <Card className="mx-auto w-full max-w-md border-border/80 bg-card/95 shadow-2xl shadow-black/20 backdrop-blur">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl tracking-tight">{formTitle}</CardTitle>
            <CardDescription className="text-sm leading-relaxed">{formDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}
