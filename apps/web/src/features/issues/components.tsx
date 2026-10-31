import { Link } from '@tanstack/react-router';
import type { Issue, IssueEvent, Park, Turbine } from '@windops/contracts';
import { CalendarClock, ClipboardList } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { SidebarTrigger } from '../../components/ui/sidebar';
import { WorkspaceSystemActions } from '../../components/workspace-system-actions';
import { getParks, getParkTurbines } from '../../lib/workspace-api';
import type { LocalIssueStore } from '../../offline/local-issue-store';
import {
  eventLabel,
  eventStatusLabel,
  formatDate,
  type IssueListEntry,
  issueListEntry,
  locationKey,
  record,
  statusBadgeClass,
  statusLabel,
  statusVariant,
} from './model';

export function IssueLocationFilters({
  workspaceId,
  store,
  online,
  parkId,
  turbineId,
  onParkChange,
  onTurbineChange,
}: {
  workspaceId: string;
  store?: LocalIssueStore | null | undefined;
  online: boolean;
  parkId: string;
  turbineId: string;
  onParkChange: (value: string) => void;
  onTurbineChange: (value: string) => void;
}) {
  const [parks, setParks] = useState<Park[]>([]);
  const [turbines, setTurbines] = useState<Turbine[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    if (!online && store) {
      setParks(store.listReplica('parks') as unknown as Park[]);
      setLoading(false);
      return () => {
        active = false;
      };
    }
    if (!online || !workspaceId) {
      setParks([]);
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const all: Park[] = [];
        let cursor: string | undefined;
        do {
          const page = await getParks(workspaceId, { limit: 100, ...(cursor ? { cursor } : {}) });
          all.push(...page.items);
          cursor = page.nextCursor ?? undefined;
        } while (cursor);
        if (active) setParks(all);
      } catch {
        if (active) setParks((store?.listReplica('parks') as unknown as Park[]) ?? []);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [online, store, workspaceId]);
  useEffect(() => {
    let active = true;
    if (!parkId) {
      setTurbines([]);
      return () => {
        active = false;
      };
    }
    if (!online && store) {
      setTurbines(
        store
          .listReplica('turbines')
          .filter((row) => row.parkId === parkId) as unknown as Turbine[],
      );
      return () => {
        active = false;
      };
    }
    if (!online) {
      setTurbines([]);
      return () => {
        active = false;
      };
    }
    void (async () => {
      try {
        const all: Turbine[] = [];
        let cursor: string | undefined;
        do {
          const page = await getParkTurbines(workspaceId, parkId, {
            limit: 100,
            ...(cursor ? { cursor } : {}),
          });
          all.push(...page.items);
          cursor = page.nextCursor ?? undefined;
        } while (cursor);
        if (active) setTurbines(all);
      } catch {
        if (active)
          setTurbines(
            (store
              ?.listReplica('turbines')
              .filter((row) => row.parkId === parkId) as unknown as Turbine[]) ?? [],
          );
      }
    })();
    return () => {
      active = false;
    };
  }, [online, parkId, store, workspaceId]);
  return (
    <fieldset aria-label="Filtrar por equipamento" className="flex flex-wrap gap-3 border-0 p-0">
      <div className="min-w-44 flex-1 space-y-1">
        <Label htmlFor="query-park">Parque</Label>
        <Select
          disabled={loading}
          value={parkId || 'all'}
          onValueChange={(value) => onParkChange(value === 'all' ? '' : value)}
        >
          <SelectTrigger id="query-park">
            <SelectValue placeholder="Todos os parques" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os parques</SelectItem>
            {parks.map((park) => (
              <SelectItem key={park.id} value={park.id}>
                Parque {park.code}
                {park.deactivatedAt ? ' · Arquivado' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-44 flex-1 space-y-1">
        <Label htmlFor="query-turbine">Turbina</Label>
        <Select
          disabled={!parkId}
          value={turbineId || 'all'}
          onValueChange={(value) => onTurbineChange(value === 'all' ? '' : value)}
        >
          <SelectTrigger id="query-turbine">
            <SelectValue placeholder="Todas as turbinas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turbinas</SelectItem>
            {turbines.map((turbine) => (
              <SelectItem key={turbine.id} value={turbine.id}>
                Turbina {turbine.code}
                {turbine.deactivatedAt ? ' · Arquivada' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </fieldset>
  );
}

export function IssueListItem({
  issue,
  location,
  action,
}: {
  issue: Issue | IssueListEntry;
  location: { park: string; turbine: string } | undefined;
  action?: ReactNode;
}) {
  const item = 'creator' in issue ? issueListEntry(issue) : issue;
  return (
    <li className="flex flex-col sm:flex-row sm:items-center">
      <Link
        className="flex min-h-24 min-w-0 flex-1 items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5"
        params={{ issueId: item.id }}
        to="/chamados/$issueId"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-muted text-muted-foreground">
          <ClipboardList aria-hidden="true" className="size-5" />
        </span>
        <span className="min-w-0 flex-1 space-y-2">
          <span className="flex w-full flex-wrap items-center gap-2">
            <span className="font-medium">
              {location
                ? `Parque ${location.park} · Turbina ${location.turbine}`
                : 'Equipamento associado'}
            </span>
            <Badge
              className={`ml-auto ${statusBadgeClass(item.status)}`}
              variant={statusVariant(item.status)}
            >
              {statusLabel(item.status)}
            </Badge>
          </span>
          <span className="line-clamp-2 block whitespace-pre-wrap text-sm text-muted-foreground">
            {item.text}
          </span>
          <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{item.creatorLabel}</span>
            <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
            {item.handlerLabel && <span>Atendimento: {item.handlerLabel}</span>}
          </span>
        </span>
      </Link>
      {action && <div className="px-4 pb-4 sm:pb-0 sm:pr-5">{action}</div>}
    </li>
  );
}

export function IssueEventCard({
  event,
  locations,
}: {
  event: IssueEvent;
  locations: Record<string, string>;
}) {
  const before = record(event.before);
  const after = record(event.after);
  const beforeLocation = locationKey(before);
  const afterLocation = locationKey(after);
  const textChanged = before?.text !== after?.text;
  const locationChanged = beforeLocation !== afterLocation;
  const statusChanged = before?.status !== after?.status;
  const handlerChanged = before?.handlerMembershipId !== after?.handlerMembershipId;
  const reportChanged = before?.completionReport !== after?.completionReport;
  const handlerName = (value: unknown) => {
    const user = record(value);
    return typeof user?.name === 'string' ? user.name : 'Sem responsável';
  };

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex items-start gap-3 px-4 py-4">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-muted">
          <CalendarClock aria-hidden="true" className="size-4 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{eventLabel(event.type)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{event.actorLabel}</p>
          <time className="mt-1 block text-xs text-muted-foreground" dateTime={event.occurredAt}>
            {formatDate(event.occurredAt)}
          </time>
          {(textChanged || locationChanged || statusChanged || handlerChanged || reportChanged) && (
            <div className="mt-3 space-y-3 border-t border-border/70 pt-3 text-sm">
              {textChanged && (
                <div className="space-y-2">
                  {typeof before?.text === 'string' && before.text && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Descrição anterior
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{String(before.text)}</p>
                    </div>
                  )}
                  {typeof after?.text === 'string' && after.text && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {before?.text ? 'Nova descrição' : 'Descrição registrada'}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{String(after.text)}</p>
                    </div>
                  )}
                </div>
              )}
              {locationChanged && (
                <div className="space-y-1">
                  {beforeLocation && (
                    <p>Local anterior: {locations[beforeLocation] ?? 'Equipamento associado'}</p>
                  )}
                  {afterLocation && (
                    <p>Nova localização: {locations[afterLocation] ?? 'Equipamento associado'}</p>
                  )}
                </div>
              )}
              {statusChanged && (
                <p>
                  Estado: {eventStatusLabel(before?.status) ?? '—'} →{' '}
                  {eventStatusLabel(after?.status) ?? '—'}
                </p>
              )}
              {handlerChanged && (
                <p>
                  Atendimento: {handlerName(before?.handler)} → {handlerName(after?.handler)}
                </p>
              )}
              {reportChanged && typeof after?.completionReport === 'string' && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Relato de conclusão</p>
                  <p className="mt-1 whitespace-pre-wrap">{after.completionReport}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
export function AppPageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <div className="min-w-0">
          <p className="mb-1 truncate text-sm text-muted-foreground">{eyebrow}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <WorkspaceSystemActions />
    </header>
  );
}
