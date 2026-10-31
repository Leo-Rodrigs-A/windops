import type { Park, Turbine } from '@windops/contracts';
import {
  Archive,
  ArrowLeft,
  ChevronRight,
  CircleHelp,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trees,
  Wind,
} from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { useAuth } from '../../auth/auth-context';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Feedback, LoadingState } from '../../components/ui/feedback';
import { TextField } from '../../components/ui/form-field';
import { HomeNavigation } from '../../components/ui/home-navigation';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { SidebarTrigger } from '../../components/ui/sidebar';
import { workspaceNavigationItems } from '../../components/ui/workspace-navigation';
import {
  type WorkspaceNavigationItem,
  WorkspaceSidebarLayout,
} from '../../components/ui/workspace-sidebar';
import { WorkspaceSystemActions } from '../../components/workspace-system-actions';
import { ApiRequestError } from '../../lib/auth-api';
import {
  createPark,
  createTurbine,
  deletePark,
  deleteTurbine,
  getPark,
  getParks,
  getParkTurbines,
  getTurbine,
  restorePark,
  restoreTurbine,
  updatePark,
  updateTurbine,
} from '../../lib/workspace-api';
import { useOfflineWorkspace } from '../../offline/offline-workspace-context';
import { findNextCatalogCode, getApiErrorMessage } from './model';
import { useParksCatalog } from './use-parks-catalog';

const catalogNavigation: WorkspaceNavigationItem[] = [...workspaceNavigationItems];

type CatalogForm =
  | { kind: 'create-park'; nextCode: string | null }
  | { kind: 'create-turbine'; park: Park; nextCode: string | null }
  | { kind: 'edit-park'; park: Park; latest?: Park }
  | { kind: 'edit-turbine'; park: Park; turbine: Turbine; latest?: Turbine }
  | null;

type LifecycleTarget =
  | { kind: 'park'; action: 'remove' | 'restore'; park: Park; commandId: string }
  | {
      kind: 'turbine';
      action: 'remove' | 'restore';
      park: Park;
      turbine: Turbine;
      commandId: string;
    };

export function ParksCatalogPage() {
  const { snapshot, refresh } = useAuth();
  const offlineWorkspace = useOfflineWorkspace();
  const [form, setForm] = useState<CatalogForm>(null);
  const [code, setCode] = useState('');
  const [formError, setFormError] = useState('');
  const [formNotice, setFormNotice] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [lifecycleTarget, setLifecycleTarget] = useState<LifecycleTarget | null>(null);
  const [lifecycleError, setLifecycleError] = useState('');
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [ambiguousCreate, setAmbiguousCreate] = useState(false);
  const formGeneration = useRef(0);

  const workspaceId = offlineWorkspace.workspaceId ?? '';
  const isAdmin =
    snapshot.status === 'authenticated' &&
    snapshot.context.role === 'admin' &&
    offlineWorkspace.online;
  const workspaceName = offlineWorkspace.workspaceName ?? 'Workspace';
  const catalog = useParksCatalog({
    workspaceId,
    online: offlineWorkspace.online,
    authenticated: snapshot.status === 'authenticated',
    store: offlineWorkspace.store,
    refresh,
  });
  const {
    parks,
    parkCursor,
    parksSearch,
    setParksSearch,
    parksLoading,
    parksMoreLoading,
    parksError,
    selectedParkId,
    setSelectedParkId,
    selectedPark,
    turbines,
    turbineCursor,
    turbinesSearch,
    setTurbinesSearch,
    turbinesLoading,
    turbinesMoreLoading,
    turbinesError,
    loadParks,
    loadParkDetail,
  } = catalog;

  function askParkLifecycle(park: Park, action: 'remove' | 'restore') {
    setLifecycleError('');
    setLifecycleTarget({ kind: 'park', action, park, commandId: crypto.randomUUID() });
  }

  function askTurbineLifecycle(park: Park, turbine: Turbine, action: 'remove' | 'restore') {
    setLifecycleError('');
    setLifecycleTarget({ kind: 'turbine', action, park, turbine, commandId: crypto.randomUUID() });
  }

  async function confirmLifecycle() {
    if (!lifecycleTarget || !workspaceId) return;
    setLifecycleBusy(true);
    setLifecycleError('');
    let reloadSelectedPark = lifecycleTarget.kind === 'turbine';
    try {
      const { park, action, commandId } = lifecycleTarget;
      const command = {
        commandId,
        expectedRevision:
          lifecycleTarget.kind === 'park' ? park.revision : lifecycleTarget.turbine.revision,
      };
      if (lifecycleTarget.kind === 'park') {
        const result =
          action === 'remove'
            ? await deletePark(workspaceId, park.id, command)
            : await restorePark(workspaceId, park.id, command);
        setNotice(
          result.result === 'deleted'
            ? `Parque ${result.code} excluído definitivamente.`
            : result.result === 'archived'
              ? `Parque ${result.park.code} arquivado. As turbinas continuam vinculadas.`
              : `Parque ${result.park.code} restaurado. Turbinas arquivadas individualmente continuam desativadas.`,
        );
        if (result.result === 'deleted' && selectedParkId === park.id) setSelectedParkId('');
        else if (selectedParkId === park.id) reloadSelectedPark = true;
      } else {
        const { turbine } = lifecycleTarget;
        const result =
          action === 'remove'
            ? await deleteTurbine(workspaceId, park.id, turbine.id, command)
            : await restoreTurbine(workspaceId, park.id, turbine.id, command);
        setNotice(
          result.result === 'deleted'
            ? `Turbina ${result.code} excluída definitivamente.`
            : result.result === 'archived'
              ? `Turbina ${result.turbine.code} arquivada.`
              : `Turbina ${result.turbine.code} restaurada.`,
        );
      }
      setLifecycleTarget(null);
      await loadParks(parksSearch);
      if (reloadSelectedPark) await loadParkDetail(park.id, turbinesSearch);
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'EQUIPMENT_HAS_OPEN_ISSUES') {
        setLifecycleError(
          'Há chamados abertos localizados neste equipamento. Resolva ou mova esses chamados antes de arquivar.',
        );
      } else if (error instanceof ApiRequestError && error.code === 'EQUIPMENT_NOT_ARCHIVED') {
        setLifecycleError(
          'O equipamento já está ativo. Atualize o catálogo antes de tentar novamente.',
        );
      } else if (error instanceof ApiRequestError && error.code === 'REVISION_CONFLICT') {
        setLifecycleTarget(null);
        setNotice(
          'O equipamento mudou desde a abertura desta confirmação. O catálogo foi atualizado; confira o estado antes de tentar novamente.',
        );
        await loadParks(parksSearch);
        if (lifecycleTarget.kind === 'turbine')
          await loadParkDetail(lifecycleTarget.park.id, turbinesSearch);
      } else if (error instanceof ApiRequestError && error.status === 401) {
        setLifecycleError('Sua sessão expirou. Entre novamente para continuar.');
        await refresh();
      } else if (error instanceof ApiRequestError && error.status === 403) {
        setLifecycleError('Seu acesso administrativo mudou. Atualize a sessão antes de continuar.');
        await refresh();
      } else {
        setLifecycleError(
          'Não foi possível confirmar a operação. Tente novamente; a mesma chave será usada para evitar duplicidade.',
        );
      }
    } finally {
      setLifecycleBusy(false);
    }
  }

  async function suggestParkCode() {
    return findNextCatalogCode('P', (cursor) =>
      getParks(workspaceId, { limit: 100, ...(cursor ? { cursor } : {}) }),
    );
  }

  async function suggestTurbineCode(parkId: string) {
    return findNextCatalogCode('T', (cursor) =>
      getParkTurbines(workspaceId, parkId, { limit: 100, ...(cursor ? { cursor } : {}) }),
    );
  }

  function openForm(nextForm: Exclude<CatalogForm, null>, initialCode = '') {
    formGeneration.current += 1;
    setForm(nextForm);
    setCode(initialCode);
    setFormError('');
    setFormNotice('');
    setAmbiguousCreate(false);
  }

  async function openCreatePark() {
    openForm({ kind: 'create-park', nextCode: null });
    const generation = formGeneration.current;
    setFormBusy(true);
    try {
      const nextCode = await suggestParkCode();
      if (generation !== formGeneration.current) return;
      setForm((current) => (current?.kind === 'create-park' ? { ...current, nextCode } : current));
      if (!nextCode) setFormError('O limite de códigos de parque foi atingido.');
    } catch (error) {
      if (generation === formGeneration.current)
        setFormError(getApiErrorMessage(error, 'calcular o próximo código de parque'));
    } finally {
      if (generation === formGeneration.current) setFormBusy(false);
    }
  }

  async function openCreateTurbine(park: Park) {
    openForm({ kind: 'create-turbine', park, nextCode: null });
    const generation = formGeneration.current;
    setFormBusy(true);
    try {
      const nextCode = await suggestTurbineCode(park.id);
      if (generation !== formGeneration.current) return;
      setForm((current) =>
        current?.kind === 'create-turbine' && current.park.id === park.id
          ? { ...current, nextCode }
          : current,
      );
      if (!nextCode) setFormError('O limite de códigos de turbina foi atingido.');
    } catch (error) {
      if (generation === formGeneration.current)
        setFormError(getApiErrorMessage(error, 'calcular o próximo código de turbina'));
    } finally {
      if (generation === formGeneration.current) setFormBusy(false);
    }
  }

  function closeForm() {
    if (formBusy) return;
    formGeneration.current += 1;
    setForm(null);
    setFormError('');
    setFormNotice('');
    setAmbiguousCreate(false);
  }

  async function checkAmbiguousCreate() {
    if (!form || !workspaceId) return;
    setFormBusy(true);
    setFormError('');
    try {
      if (form.kind === 'create-park') {
        const normalizedCode = form.nextCode;
        if (!normalizedCode) return;
        let cursor: string | undefined;
        let existing: Park | undefined;
        do {
          const page = await getParks(workspaceId, {
            limit: 100,
            search: normalizedCode,
            ...(cursor ? { cursor } : {}),
          });
          existing = page.items.find((park) => park.code === normalizedCode);
          cursor = page.nextCursor ?? undefined;
        } while (cursor && !existing);
        if (existing) {
          setSelectedParkId(existing.id);
          setForm(null);
          setAmbiguousCreate(false);
          await loadParks(parksSearch);
          setNotice(`O parque ${existing.code} já consta no catálogo.`);
        } else {
          setFormNotice('O código ainda não aparece. Você pode tentar enviar novamente.');
        }
      } else if (form.kind === 'create-turbine') {
        const normalizedCode = form.nextCode;
        if (!normalizedCode) return;
        let cursor: string | undefined;
        let existing: Turbine | undefined;
        do {
          const page = await getParkTurbines(workspaceId, form.park.id, {
            limit: 100,
            search: normalizedCode,
            ...(cursor ? { cursor } : {}),
          });
          existing = page.items.find((turbine) => turbine.code === normalizedCode);
          cursor = page.nextCursor ?? undefined;
        } while (cursor && !existing);
        if (existing) {
          setForm(null);
          setAmbiguousCreate(false);
          await loadParkDetail(form.park.id, turbinesSearch);
          setNotice(`A turbina ${existing.code} já consta no catálogo.`);
        } else {
          setFormNotice('O código ainda não aparece. Você pode tentar enviar novamente.');
        }
      }
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'conferir o catálogo'));
    } finally {
      setFormBusy(false);
    }
  }

  async function loadLatestForConflict() {
    if (!form || !workspaceId) return;
    try {
      if (form.kind === 'edit-park') {
        const latest = await getPark(workspaceId, form.park.id);
        setForm({ ...form, latest });
      } else if (form.kind === 'edit-turbine') {
        const latest = await getTurbine(workspaceId, form.park.id, form.turbine.id);
        setForm({ ...form, latest });
      }
      setFormError(
        'Esta versão atualiza o controle de conflito, mantendo o código que você digitou.',
      );
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'consultar a versão atual'));
    }
  }

  function acceptLatestRevision() {
    if (!form) return;
    if (form.kind === 'edit-park' && form.latest) {
      const { latest, ...edit } = form;
      setForm({ ...edit, park: latest });
    }
    if (form.kind === 'edit-turbine' && form.latest) {
      const { latest, ...edit } = form;
      setForm({ ...edit, turbine: latest });
    }
    setFormError('Sua alteração foi preservada. Revise o código e salve novamente.');
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || !workspaceId) return;
    setFormBusy(true);
    setFormError('');
    setFormNotice('');
    try {
      if (form.kind === 'create-park') {
        if (!form.nextCode) return;
        const created = await createPark(workspaceId, { code: form.nextCode });
        setForm(null);
        setSelectedParkId(created.id);
        setNotice(`Parque ${created.code} cadastrado.`);
        await loadParks(parksSearch);
      } else if (form.kind === 'create-turbine') {
        if (!form.nextCode) return;
        const created = await createTurbine(workspaceId, form.park.id, { code: form.nextCode });
        setForm(null);
        setNotice(`Turbina ${created.code} cadastrada.`);
        await loadParkDetail(form.park.id, turbinesSearch);
      } else if (form.kind === 'edit-park') {
        const updated = await updatePark(workspaceId, form.park.id, {
          code: code.trim().toUpperCase(),
          expectedRevision: form.park.revision,
        });
        setForm(null);
        setNotice(`Parque atualizado para ${updated.code}.`);
        await Promise.all([loadParks(parksSearch), loadParkDetail(updated.id, turbinesSearch)]);
      } else {
        const updated = await updateTurbine(workspaceId, form.park.id, form.turbine.id, {
          code: code.trim().toUpperCase(),
          expectedRevision: form.turbine.revision,
        });
        setForm(null);
        setNotice(`Turbina atualizada para ${updated.code}.`);
        await loadParkDetail(form.park.id, turbinesSearch);
      }
      setAmbiguousCreate(false);
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        error.status === 409 &&
        error.code === 'REVISION_CONFLICT' &&
        (form.kind === 'edit-park' || form.kind === 'edit-turbine')
      ) {
        setFormError('O registro mudou em outra sessão. Consulte a versão atual antes de salvar.');
        void loadLatestForConflict();
      } else {
        const action = form.kind.startsWith('create') ? 'o cadastro' : 'a alteração';
        if (
          error instanceof ApiRequestError &&
          error.status === 409 &&
          error.code === 'CATALOG_CODE_TAKEN' &&
          (form.kind === 'create-park' || form.kind === 'create-turbine')
        ) {
          setFormError(
            'Outro cadastro usou este código enquanto você confirmava. Atualizei a sugestão; confirme novamente.',
          );
          try {
            const nextCode =
              form.kind === 'create-park'
                ? await suggestParkCode()
                : await suggestTurbineCode(form.park.id);
            setForm((current) =>
              current?.kind === form.kind ? { ...current, nextCode } : current,
            );
            if (!nextCode) setFormError('O limite de códigos deste catálogo foi atingido.');
          } catch (suggestionError) {
            setFormError(getApiErrorMessage(suggestionError, 'atualizar o código sugerido'));
          }
        } else {
          setFormError(getApiErrorMessage(error, action));
        }
        if (
          form.kind.startsWith('create') &&
          error instanceof Error &&
          error.message.startsWith('Não foi possível conectar')
        )
          setAmbiguousCreate(true);
        if (error instanceof ApiRequestError && [401, 403].includes(error.status)) await refresh();
      }
    } finally {
      setFormBusy(false);
    }
  }

  if (snapshot.status !== 'authenticated' && snapshot.status !== 'offline') {
    return (
      <main className="grid min-h-dvh place-items-center px-5">
        <LoadingState label="Conferindo sua sessão…" />
      </main>
    );
  }

  const isMobileDetail = Boolean(selectedParkId);
  const currentFormLabel =
    form?.kind === 'create-park' || form?.kind === 'create-turbine'
      ? 'Confirmar cadastro'
      : form?.kind === 'edit-park'
        ? 'Editar parque'
        : form?.kind === 'edit-turbine'
          ? 'Editar turbina'
          : '';
  const inputPrefix = form?.kind.endsWith('park') ? 'P' : 'T';
  const isEditing = form?.kind.startsWith('edit') ?? false;
  const proposedCode =
    form?.kind === 'create-park' || form?.kind === 'create-turbine' ? form.nextCode : null;
  const remoteCode =
    form?.kind === 'edit-park'
      ? form.latest?.code
      : form?.kind === 'edit-turbine'
        ? form.latest?.code
        : undefined;

  return (
    <WorkspaceSidebarLayout
      activeHref="/parques"
      items={
        isAdmin ? catalogNavigation : catalogNavigation.filter((item) => item.href !== '/equipe')
      }
      workspaceName={workspaceName}
    >
      <main className="min-h-dvh bg-background px-4 pt-4 pb-24 text-foreground sm:px-6 md:px-8 md:py-7">
        <div className="mx-auto w-full max-w-6xl space-y-7">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="md:hidden" />
              <div className="min-w-0">
                <p className="mb-1 text-sm text-muted-foreground">{workspaceName} / Operação</p>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Parques</h1>
              </div>
            </div>
            <WorkspaceSystemActions />
          </header>

          {notice && <Feedback message={notice} tone="success" />}

          <section
            aria-label="Catálogo de parques e turbinas"
            className="grid gap-5 lg:grid-cols-[minmax(17rem,0.82fr)_minmax(0,1.5fr)]"
          >
            <Card
              className={`${isMobileDetail ? 'hidden lg:flex' : 'flex'} min-w-0 flex-col gap-0 py-0`}
            >
              <CardHeader className="gap-4 border-b border-border/70 px-4 py-4 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">Parques cadastrados</CardTitle>
                    <CardDescription className="mt-1">
                      Selecione um parque para ver suas turbinas.
                    </CardDescription>
                  </div>
                  {isAdmin && (
                    <Button
                      aria-label="Cadastrar parque"
                      onClick={() => void openCreatePark()}
                      size="icon"
                      variant="outline"
                    >
                      <Plus aria-hidden="true" />
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <Label className="sr-only" htmlFor="parks-search">
                    Buscar parques
                  </Label>
                  <Search
                    aria-hidden="true"
                    className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    className="pl-9"
                    id="parks-search"
                    onChange={(event) => setParksSearch(event.target.value)}
                    placeholder="Buscar código do parque"
                    type="search"
                    value={parksSearch}
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-3 sm:p-4">
                {parksError ? (
                  <div className="space-y-3">
                    <Feedback message={parksError} tone="error" />
                    <Button onClick={() => void loadParks(parksSearch)} variant="outline">
                      <RefreshCw aria-hidden="true" />
                      Tentar novamente
                    </Button>
                  </div>
                ) : parksLoading ? (
                  <div className="p-3">
                    <LoadingState label="Carregando parques…" />
                  </div>
                ) : parks.length === 0 ? (
                  <div className="grid min-h-44 place-items-center rounded-lg border border-dashed border-border/80 px-5 text-center">
                    <div className="space-y-3">
                      <Trees aria-hidden="true" className="mx-auto size-6 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {parksSearch
                          ? 'Nenhum parque corresponde à busca.'
                          : 'Nenhum parque cadastrado neste workspace.'}
                      </p>
                      {isAdmin && !parksSearch && (
                        <Button onClick={() => void openCreatePark()} size="sm">
                          <Plus aria-hidden="true" />
                          Cadastrar primeiro parque
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {parks.map((park) => (
                      <Button
                        aria-pressed={park.id === selectedParkId}
                        className={`h-auto min-h-16 w-full justify-start gap-3 rounded-lg px-3 py-3 text-left whitespace-normal ${park.id === selectedParkId ? 'bg-accent text-accent-foreground hover:bg-accent' : 'hover:bg-muted/60'}`}
                        key={park.id}
                        onClick={() => setSelectedParkId(park.id)}
                        type="button"
                        variant="ghost"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <Trees aria-hidden="true" className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">Parque {park.code}</span>
                          <span className="block text-xs text-muted-foreground">
                            {park.deactivatedAt ? 'Arquivado' : 'Ativo'}
                          </span>
                        </span>
                        <ChevronRight
                          aria-hidden="true"
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                      </Button>
                    ))}
                    {parkCursor && (
                      <div className="pt-2 text-center">
                        <Button
                          disabled={parksMoreLoading}
                          onClick={() => void loadParks(parksSearch, parkCursor, true)}
                          variant="ghost"
                        >
                          {parksMoreLoading ? 'Carregando…' : 'Carregar mais parques'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <section
              aria-labelledby="park-detail-heading"
              className={`${isMobileDetail ? 'block' : 'hidden lg:block'} min-w-0`}
            >
              {selectedParkId && !selectedPark && turbinesError ? (
                <div className="space-y-3">
                  <Feedback message={turbinesError} tone="error" />
                  <Button
                    onClick={() => void loadParkDetail(selectedParkId, turbinesSearch)}
                    variant="outline"
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : selectedParkId && !selectedPark && turbinesLoading ? (
                <Card className="flex min-h-56 items-center justify-center">
                  <LoadingState label="Carregando parque…" />
                </Card>
              ) : selectedPark ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Button
                        aria-label="Voltar à lista de parques"
                        className="lg:hidden"
                        onClick={() => setSelectedParkId('')}
                        size="icon"
                        variant="ghost"
                      >
                        <ArrowLeft aria-hidden="true" />
                      </Button>
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/10 bg-primary/10 text-primary">
                        <Trees aria-hidden="true" className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2
                            className="truncate text-xl font-semibold tracking-tight"
                            id="park-detail-heading"
                          >
                            Parque {selectedPark.code}
                          </h2>
                          <Badge variant={selectedPark.deactivatedAt ? 'secondary' : 'outline'}>
                            {selectedPark.deactivatedAt ? 'Arquivado' : 'Ativo'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {turbines.length}
                          {turbineCursor ? '+' : ''} turbinas nesta página
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedPark.deactivatedAt ? (
                          <Button
                            onClick={() => askParkLifecycle(selectedPark, 'restore')}
                            size="sm"
                            variant="outline"
                          >
                            <RotateCcw aria-hidden="true" />
                            Restaurar parque
                          </Button>
                        ) : (
                          <>
                            <Button
                              onClick={() =>
                                openForm(
                                  { kind: 'edit-park', park: selectedPark },
                                  selectedPark.code,
                                )
                              }
                              size="sm"
                              variant="outline"
                            >
                              <Pencil aria-hidden="true" />
                              Editar parque
                            </Button>
                            <Button
                              onClick={() => askParkLifecycle(selectedPark, 'remove')}
                              size="sm"
                              variant="outline"
                            >
                              <Archive aria-hidden="true" />
                              Excluir ou arquivar
                            </Button>
                            <Button
                              aria-label="Cadastrar turbina"
                              onClick={() => void openCreateTurbine(selectedPark)}
                              size="icon"
                            >
                              <Plus aria-hidden="true" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedPark.deactivatedAt && (
                    <Feedback
                      message="Este parque está arquivado; suas turbinas permanecem vinculadas e indisponíveis para novos chamados."
                      tone="info"
                    />
                  )}

                  <Card className="gap-0 py-0">
                    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-4 sm:px-5">
                      <div>
                        <CardTitle className="text-base">Turbinas</CardTitle>
                        <CardDescription className="mt-1">
                          Equipamentos vinculados a este parque.
                        </CardDescription>
                      </div>
                      <div className="relative w-full sm:max-w-xs">
                        <Label className="sr-only" htmlFor="turbines-search">
                          Buscar turbinas
                        </Label>
                        <Search
                          aria-hidden="true"
                          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                          className="pl-9"
                          id="turbines-search"
                          onChange={(event) => setTurbinesSearch(event.target.value)}
                          placeholder="Buscar turbina"
                          type="search"
                          value={turbinesSearch}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5">
                      {turbinesError ? (
                        <div className="space-y-3">
                          <Feedback message={turbinesError} tone="error" />
                          <Button
                            onClick={() => void loadParkDetail(selectedPark.id, turbinesSearch)}
                            variant="outline"
                          >
                            Tentar novamente
                          </Button>
                        </div>
                      ) : turbinesLoading ? (
                        <div className="py-5">
                          <LoadingState label="Carregando turbinas…" />
                        </div>
                      ) : turbines.length === 0 ? (
                        <div className="grid min-h-44 place-items-center rounded-lg border border-dashed border-border/80 px-5 text-center">
                          <div className="space-y-3">
                            <Wind
                              aria-hidden="true"
                              className="mx-auto size-6 text-muted-foreground"
                            />
                            <p className="text-sm text-muted-foreground">
                              {turbinesSearch
                                ? 'Nenhuma turbina corresponde à busca.'
                                : 'Este parque ainda não tem turbinas cadastradas.'}
                            </p>
                            {isAdmin && !selectedPark.deactivatedAt && !turbinesSearch && (
                              <Button
                                onClick={() => void openCreateTurbine(selectedPark)}
                                size="sm"
                              >
                                <Plus aria-hidden="true" />
                                Cadastrar primeira turbina
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="divide-y divide-border/70">
                          {turbines.map((turbine) => (
                            <div
                              className="flex min-h-[68px] items-center gap-3 py-3 first:pt-0 last:pb-0"
                              key={turbine.id}
                            >
                              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                                <Wind aria-hidden="true" className="size-5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">Turbina {turbine.code}</p>
                                <p className="text-xs text-muted-foreground">
                                  {selectedPark.deactivatedAt
                                    ? 'Indisponível com o parque arquivado'
                                    : turbine.deactivatedAt
                                      ? 'Arquivada individualmente'
                                      : 'Ativa'}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  selectedPark.deactivatedAt || turbine.deactivatedAt
                                    ? 'secondary'
                                    : 'outline'
                                }
                              >
                                {selectedPark.deactivatedAt
                                  ? 'Indisponível'
                                  : turbine.deactivatedAt
                                    ? 'Arquivada'
                                    : 'Ativa'}
                              </Badge>
                              {isAdmin &&
                                !selectedPark.deactivatedAt &&
                                (turbine.deactivatedAt ? (
                                  <Button
                                    aria-label={`Restaurar turbina ${turbine.code}`}
                                    onClick={() =>
                                      askTurbineLifecycle(selectedPark, turbine, 'restore')
                                    }
                                    size="icon"
                                    variant="ghost"
                                  >
                                    <RotateCcw aria-hidden="true" />
                                  </Button>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      aria-label={`Editar turbina ${turbine.code}`}
                                      onClick={() =>
                                        openForm(
                                          { kind: 'edit-turbine', park: selectedPark, turbine },
                                          turbine.code,
                                        )
                                      }
                                      size="icon"
                                      variant="ghost"
                                    >
                                      <Pencil aria-hidden="true" />
                                    </Button>
                                    <Button
                                      aria-label={`Excluir ou arquivar turbina ${turbine.code}`}
                                      onClick={() =>
                                        askTurbineLifecycle(selectedPark, turbine, 'remove')
                                      }
                                      size="icon"
                                      variant="ghost"
                                    >
                                      <Archive aria-hidden="true" />
                                    </Button>
                                  </div>
                                ))}
                            </div>
                          ))}
                          {turbineCursor && (
                            <div className="pt-3 text-center">
                              <Button
                                disabled={turbinesMoreLoading}
                                onClick={() =>
                                  void loadParkDetail(
                                    selectedPark.id,
                                    turbinesSearch,
                                    turbineCursor,
                                    true,
                                  )
                                }
                                variant="ghost"
                              >
                                {turbinesMoreLoading ? 'Carregando…' : 'Carregar mais turbinas'}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : parksLoading ? (
                <Card className="hidden min-h-72 items-center justify-center lg:flex">
                  <LoadingState label="Carregando detalhes…" />
                </Card>
              ) : (
                <Card className="hidden min-h-72 items-center justify-center lg:flex">
                  <div className="max-w-sm space-y-3 px-6 text-center">
                    <CircleHelp
                      aria-hidden="true"
                      className="mx-auto size-6 text-muted-foreground"
                    />
                    <h2 className="font-semibold" id="park-detail-heading">
                      Selecione um parque
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      O catálogo mostrará aqui as turbinas vinculadas ao parque escolhido.
                    </p>
                  </div>
                </Card>
              )}
            </section>
          </section>
        </div>
        <HomeNavigation
          activeHref="/parques"
          className="fixed inset-x-0 bottom-0 md:hidden"
          items={catalogNavigation.filter((item) => isAdmin || item.href !== '/equipe')}
        />
      </main>

      <Dialog
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        open={Boolean(form)}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentFormLabel}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'A alteração será salva no workspace quando o servidor confirmar.'
                : form?.kind === 'create-park'
                  ? `O parque receberá o código ${proposedCode ?? 'calculando…'}. Confirme para continuar.`
                  : form?.kind === 'create-turbine'
                    ? `A turbina receberá o código ${proposedCode ?? 'calculando…'} no Parque ${form.park.code}. Confirme para continuar.`
                    : ''}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-5" onSubmit={(event) => void submitForm(event)}>
            {isEditing ? (
              <TextField
                autoComplete="off"
                autoFocus
                className="gap-2"
                description={`Formato: ${inputPrefix}01 até ${inputPrefix}999999.`}
                label={form?.kind === 'edit-park' ? 'Código do parque' : 'Código da turbina'}
                maxLength={7}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                pattern={`${inputPrefix}[0-9]{2,6}`}
                placeholder={inputPrefix === 'P' ? 'P01' : 'T01'}
                required
                value={code}
              />
            ) : (
              <div
                aria-live="polite"
                className="flex min-h-20 items-center justify-center rounded-lg border border-border/70 bg-muted/40 p-4 text-center"
                role="status"
              >
                {formBusy && !proposedCode ? (
                  <LoadingState label="Calculando próximo código…" />
                ) : proposedCode ? (
                  <p className="text-lg font-semibold">
                    {form?.kind === 'create-park' ? 'Parque' : 'Turbina'} {proposedCode}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum código disponível para cadastro.
                  </p>
                )}
              </div>
            )}
            {formError && <Feedback message={formError} tone="error" />}
            {formNotice && <Feedback message={formNotice} tone="info" />}
            {remoteCode && (
              <div className="space-y-3 rounded-lg border border-border/70 bg-muted/40 p-3">
                <p className="text-sm">
                  Código na versão atual do servidor: <strong>{remoteCode}</strong>
                </p>
                <Button onClick={acceptLatestRevision} type="button" variant="outline">
                  Revisar e manter meu código
                </Button>
              </div>
            )}
            {ambiguousCreate && (
              <Button
                disabled={formBusy}
                onClick={() => void checkAmbiguousCreate()}
                type="button"
                variant="outline"
              >
                {formBusy ? 'Conferindo…' : 'Conferir catálogo antes de reenviar'}
              </Button>
            )}
            <DialogFooter>
              <Button disabled={formBusy} onClick={closeForm} type="button" variant="outline">
                Cancelar
              </Button>
              <Button
                disabled={formBusy || Boolean(remoteCode) || (!isEditing && !proposedCode)}
                type="submit"
              >
                {formBusy ? 'Salvando…' : isEditing ? 'Salvar alteração' : 'Confirmar cadastro'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open && !lifecycleBusy) {
            setLifecycleTarget(null);
            setLifecycleError('');
          }
        }}
        open={Boolean(lifecycleTarget)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {lifecycleTarget?.action === 'restore'
                ? `Restaurar ${lifecycleTarget.kind === 'park' ? 'parque' : 'turbina'}?`
                : `Excluir ou arquivar ${lifecycleTarget?.kind === 'park' ? 'parque' : 'turbina'}?`}
            </DialogTitle>
            <DialogDescription>
              {lifecycleTarget?.action === 'restore'
                ? 'O equipamento voltará a ficar disponível conforme seu estado individual. Turbinas arquivadas separadamente continuam desativadas.'
                : 'Sem referências de chamados, o equipamento será excluído definitivamente. Com referências atuais ou históricas, será arquivado e preservado. Uma issue aberta atualmente localizada nele bloqueia a operação.'}
            </DialogDescription>
          </DialogHeader>
          {lifecycleError && <Feedback message={lifecycleError} tone="error" />}
          <DialogFooter>
            <Button
              disabled={lifecycleBusy}
              onClick={() => setLifecycleTarget(null)}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button disabled={lifecycleBusy} onClick={() => void confirmLifecycle()} type="button">
              {lifecycleBusy
                ? 'Aguardando confirmação…'
                : lifecycleTarget?.action === 'restore'
                  ? 'Confirmar restauração'
                  : 'Confirmar exclusão/arquivo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceSidebarLayout>
  );
}
