import type {
  WorkspaceDirectoryAccount,
  WorkspaceInvitation,
  WorkspaceMember,
} from '@windops/contracts';
import { CircleHelp, Search } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { SidebarTrigger } from '../../components/ui/sidebar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { workspaceNavigationItems } from '../../components/ui/workspace-navigation';
import {
  type WorkspaceNavigationItem,
  WorkspaceSidebarLayout,
} from '../../components/ui/workspace-sidebar';
import { WorkspaceSystemActions } from '../../components/workspace-system-actions';
import { ApiRequestError } from '../../lib/auth-api';
import {
  createWorkspaceInvitation,
  getWorkspaceDirectory,
  getWorkspaceInvitations,
  getWorkspaceMembers,
  resendWorkspaceInvitation,
  revokeWorkspaceMember,
  updateWorkspaceMemberRole,
} from '../../lib/workspace-api';

const teamNavigation: WorkspaceNavigationItem[] = [...workspaceNavigationItems];

function displayRole(role: 'admin' | 'technician') {
  return role === 'admin' ? 'Administrador' : 'Técnico';
}

function inviteStatus(invitation: WorkspaceInvitation) {
  if (invitation.status === 'accepted') return { label: 'Aceito', variant: 'default' as const };
  if (invitation.status === 'expired') return { label: 'Expirado', variant: 'outline' as const };
  if (invitation.status === 'revoked') return { label: 'Revogado', variant: 'outline' as const };
  if (invitation.status === 'superseded')
    return { label: 'Substituído', variant: 'outline' as const };
  if (invitation.deliveryStatus === 'failed')
    return { label: 'Falha no envio', variant: 'destructive' as const };
  if (invitation.deliveryStatus === 'pending')
    return { label: 'Preparando envio', variant: 'secondary' as const };
  return { label: 'Aguardando aceite', variant: 'secondary' as const };
}

function pageErrorMessage(error: unknown, action: string) {
  if (error instanceof ApiRequestError && error.status === 403)
    return 'Seu acesso de administrador mudou. Atualize a sessão e tente novamente.';
  if (error instanceof ApiRequestError && error.status === 409)
    return 'Este registro mudou desde a última consulta. Atualizei a lista; confira antes de tentar novamente.';
  if (error instanceof ApiRequestError && error.status === 429)
    return 'O limite temporário de solicitações foi atingido. Aguarde um pouco e tente novamente.';
  return `Não foi possível ${action}. Confira a conexão e tente novamente.`;
}

async function refreshAfterAuthorizationFailure(error: unknown, refresh: () => Promise<unknown>) {
  if (error instanceof ApiRequestError && [401, 403].includes(error.status)) await refresh();
}

export function TeamManagementPage() {
  const { snapshot, refresh } = useAuth();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [memberCursor, setMemberCursor] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState('');
  const [membersMoreLoading, setMembersMoreLoading] = useState(false);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [invitationCursor, setInvitationCursor] = useState<string | null>(null);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [invitationsError, setInvitationsError] = useState('');
  const [invitationsMoreLoading, setInvitationsMoreLoading] = useState(false);
  const [directory, setDirectory] = useState<WorkspaceDirectoryAccount[]>([]);
  const [directoryCursor, setDirectoryCursor] = useState<string | null>(null);
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState('');
  const [directoryMoreLoading, setDirectoryMoreLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'technician'>('technician');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionTarget, setActionTarget] = useState<WorkspaceMember | null>(null);
  const [memberAction, setMemberAction] = useState<
    'promote' | 'demote' | 'revoke' | 'leave' | null
  >(null);
  const [activeAdminCount, setActiveAdminCount] = useState(0);
  const [busyId, setBusyId] = useState('');
  const [actionError, setActionError] = useState('');

  const workspaceId =
    snapshot.status === 'authenticated' && snapshot.context.role === 'admin'
      ? snapshot.context.workspace.id
      : '';
  const membersRequest = useRef(0);
  const directoryRequest = useRef(0);

  const loadMembers = useCallback(
    async (search: string, cursor?: string, append = false) => {
      if (!workspaceId) return;
      const requestId = ++membersRequest.current;
      append ? setMembersMoreLoading(true) : setMembersLoading(true);
      setMembersError('');
      try {
        const page = await getWorkspaceMembers(workspaceId, {
          limit: 25,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(cursor ? { cursor } : {}),
        });
        if (requestId !== membersRequest.current) return;
        setMembers((previous) => (append ? [...previous, ...page.items] : page.items));
        setMemberCursor(page.nextCursor);
        setActiveAdminCount(page.activeAdminCount);
      } catch (error) {
        if (requestId !== membersRequest.current) return;
        setMembersError(pageErrorMessage(error, 'carregar a equipe'));
        await refreshAfterAuthorizationFailure(error, refresh);
      } finally {
        if (requestId === membersRequest.current) {
          setMembersLoading(false);
          setMembersMoreLoading(false);
        }
      }
    },
    [refresh, workspaceId],
  );

  const loadInvitations = useCallback(
    async (cursor?: string, append = false) => {
      if (!workspaceId) return;
      append ? setInvitationsMoreLoading(true) : setInvitationsLoading(true);
      setInvitationsError('');
      try {
        const page = await getWorkspaceInvitations(workspaceId, {
          limit: 10,
          ...(cursor ? { cursor } : {}),
        });
        setInvitations((previous) => (append ? [...previous, ...page.items] : page.items));
        setInvitationCursor(page.nextCursor);
      } catch (error) {
        setInvitationsError(pageErrorMessage(error, 'carregar os convites'));
        await refreshAfterAuthorizationFailure(error, refresh);
      } finally {
        setInvitationsLoading(false);
        setInvitationsMoreLoading(false);
      }
    },
    [refresh, workspaceId],
  );

  const loadDirectory = useCallback(
    async (search: string, cursor?: string, append = false) => {
      if (!workspaceId) return;
      const requestId = ++directoryRequest.current;
      append ? setDirectoryMoreLoading(true) : setDirectoryLoading(true);
      setDirectoryError('');
      try {
        const page = await getWorkspaceDirectory(workspaceId, {
          limit: 10,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(cursor ? { cursor } : {}),
        });
        if (requestId !== directoryRequest.current) return;
        setDirectory((previous) => (append ? [...previous, ...page.items] : page.items));
        setDirectoryCursor(page.nextCursor);
      } catch (error) {
        if (requestId !== directoryRequest.current) return;
        setDirectoryError(pageErrorMessage(error, 'buscar contas disponíveis'));
        await refreshAfterAuthorizationFailure(error, refresh);
      } finally {
        if (requestId === directoryRequest.current) {
          setDirectoryLoading(false);
          setDirectoryMoreLoading(false);
        }
      }
    },
    [refresh, workspaceId],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void loadMembers(memberSearch), 250);
    return () => window.clearTimeout(timer);
  }, [loadMembers, memberSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDirectory(directorySearch), 250);
    return () => window.clearTimeout(timer);
  }, [directorySearch, loadDirectory]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  async function refreshLists() {
    await Promise.all([loadMembers(memberSearch), loadInvitations()]);
  }

  async function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteError('');
    setNotice('');
    setInviteBusy(true);
    try {
      const invitation = await createWorkspaceInvitation(workspaceId, {
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteEmail('');
      setNotice(
        invitation.deliveryStatus === 'sent'
          ? 'Convite enviado. O sistema não recebe confirmação de leitura.'
          : 'Convite registrado e o envio está sendo processado.',
      );
      await loadInvitations();
    } catch (error) {
      setInviteError(
        error instanceof ApiRequestError && error.status === 502
          ? 'O e-mail não foi enviado. Você pode tentar emitir um novo convite para este endereço.'
          : pageErrorMessage(error, 'enviar o convite'),
      );
      await loadInvitations();
    } finally {
      setInviteBusy(false);
    }
  }

  async function resendInvitation(invitation: WorkspaceInvitation, createNew = false) {
    setBusyId(invitation.id);
    setActionError('');
    setNotice('');
    try {
      if (createNew) {
        await createWorkspaceInvitation(workspaceId, {
          email: invitation.email,
          role: invitation.role,
        });
      } else {
        await resendWorkspaceInvitation(workspaceId, invitation.id);
      }
      setNotice(createNew ? 'Novo convite enviado.' : 'Reenvio solicitado.');
      await loadInvitations();
    } catch (error) {
      setActionError(pageErrorMessage(error, 'enviar o convite'));
      await loadInvitations();
    } finally {
      setBusyId('');
    }
  }

  async function confirmMemberAction() {
    if (!actionTarget || !memberAction) return;
    setBusyId(actionTarget.membershipId);
    setActionError('');
    try {
      if (memberAction === 'promote' || memberAction === 'demote') {
        const role = memberAction === 'promote' ? 'admin' : 'technician';
        await updateWorkspaceMemberRole(
          workspaceId,
          actionTarget.membershipId,
          role,
          actionTarget.revision,
        );
        setNotice(
          memberAction === 'promote'
            ? `${actionTarget.user.name} agora é administrador.`
            : 'Seu cargo foi alterado para Técnico.',
        );
      } else if (memberAction === 'leave') {
        await revokeWorkspaceMember(workspaceId, actionTarget.membershipId, actionTarget.revision);
        setNotice('Você saiu do workspace. Sua conta e seu histórico foram preservados.');
      } else {
        await revokeWorkspaceMember(workspaceId, actionTarget.membershipId, actionTarget.revision);
        setNotice(`O acesso de ${actionTarget.user.name} ao workspace foi revogado.`);
      }
      const isSelfAction = actionTarget.user.id === me.user.id;
      setActionTarget(null);
      setMemberAction(null);
      if (isSelfAction) {
        await refresh();
      } else {
        await refreshLists();
      }
    } catch (error) {
      setActionError(
        error instanceof ApiRequestError &&
          error.status === 409 &&
          (memberAction === 'demote' || memberAction === 'leave')
          ? 'Você precisa promover outro técnico a administrador antes de sair ou se rebaixar.'
          : pageErrorMessage(error, 'alterar o acesso'),
      );
      if (error instanceof ApiRequestError && error.status === 403) await refresh();
      await refreshLists();
    } finally {
      setBusyId('');
    }
  }

  if (snapshot.status !== 'authenticated') {
    return (
      <main className="grid min-h-dvh place-items-center px-5">
        <LoadingState label="Conferindo sua sessão…" />
      </main>
    );
  }

  if (snapshot.context.role !== 'admin') {
    return (
      <main className="mx-auto grid min-h-dvh max-w-xl place-items-center px-5">
        <Feedback
          message="A gestão da equipe está disponível somente para administradores."
          tone="error"
        />
      </main>
    );
  }

  const { me, context } = snapshot;

  return (
    <WorkspaceSidebarLayout
      activeHref="/conta"
      items={teamNavigation}
      workspaceName={context.workspace.name}
    >
      <main className="min-h-dvh bg-background px-5 pt-5 pb-24 text-foreground sm:px-6 md:px-8 md:py-7">
        <div className="mx-auto w-full max-w-7xl space-y-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="md:hidden" />
              <div className="min-w-0">
                <p className="mb-1 text-sm text-muted-foreground">
                  {context.workspace.name} / Administração
                </p>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Equipe</h1>
              </div>
            </div>
            <WorkspaceSystemActions />
          </header>

          {notice && <Feedback message={notice} tone="success" />}
          {actionError && <Feedback message={actionError} tone="error" />}

          <section aria-labelledby="members-heading" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold" id="members-heading">
                  Membros
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pessoas com acesso ativo a este workspace.
                </p>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Label className="sr-only" htmlFor="team-member-search">
                  Buscar membros por nome ou e-mail
                </Label>
                <Search
                  aria-hidden="true"
                  className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  className="pl-9"
                  id="team-member-search"
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder="Buscar por nome ou e-mail"
                  type="search"
                  value={memberSearch}
                />
              </div>
            </div>
            <Card className="gap-0 py-0">
              {membersError ? (
                <CardContent className="p-5">
                  <Feedback message={membersError} tone="error" />
                  <Button
                    className="mt-4"
                    onClick={() => void loadMembers(memberSearch)}
                    variant="outline"
                  >
                    Tentar novamente
                  </Button>
                </CardContent>
              ) : membersLoading ? (
                <CardContent className="p-5">
                  <LoadingState label="Carregando membros…" />
                </CardContent>
              ) : members.length === 0 ? (
                <CardContent className="p-5 text-sm text-muted-foreground">
                  {memberSearch
                    ? 'Nenhum membro corresponde à busca.'
                    : 'Não há membros para exibir.'}
                </CardContent>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>
                          <span className="sr-only">Ações</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.membershipId}>
                          <TableCell className="min-w-40 font-medium">{member.user.name}</TableCell>
                          <TableCell className="min-w-52 text-muted-foreground">
                            {member.user.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                              {displayRole(member.role)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {member.role === 'technician' && member.user.id !== me.user.id && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  disabled={Boolean(busyId)}
                                  onClick={() => {
                                    setActionTarget(member);
                                    setMemberAction('promote');
                                    setActionError('');
                                  }}
                                  size="sm"
                                  variant="outline"
                                >
                                  Promover
                                </Button>
                                <Button
                                  disabled={Boolean(busyId)}
                                  onClick={() => {
                                    setActionTarget(member);
                                    setMemberAction('revoke');
                                    setActionError('');
                                  }}
                                  size="sm"
                                  variant="ghost"
                                >
                                  Revogar
                                </Button>
                              </div>
                            )}
                            {member.role === 'admin' && member.user.id === me.user.id && (
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    disabled={Boolean(busyId) || activeAdminCount <= 1}
                                    onClick={() => {
                                      setActionTarget(member);
                                      setMemberAction('demote');
                                      setActionError('');
                                    }}
                                    size="sm"
                                    variant="outline"
                                  >
                                    Rebaixar
                                  </Button>
                                  <Button
                                    disabled={Boolean(busyId) || activeAdminCount <= 1}
                                    onClick={() => {
                                      setActionTarget(member);
                                      setMemberAction('leave');
                                      setActionError('');
                                    }}
                                    size="sm"
                                    variant="ghost"
                                  >
                                    Sair do workspace
                                  </Button>
                                </div>
                                {activeAdminCount <= 1 && (
                                  <span className="max-w-64 text-right text-xs text-muted-foreground">
                                    Promova um técnico a administrador antes de sair ou se rebaixar.
                                  </span>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {memberCursor && (
                    <div className="flex justify-center border-t border-border p-3">
                      <Button
                        disabled={membersMoreLoading}
                        onClick={() => void loadMembers(memberSearch, memberCursor, true)}
                        variant="ghost"
                      >
                        {membersMoreLoading ? 'Carregando…' : 'Carregar mais membros'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Card>
          </section>

          <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.82fr)]">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Contas disponíveis</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Contas verificadas sem vínculo ativo em nenhum workspace.
                </p>
              </div>
              <div className="relative block">
                <Label className="sr-only" htmlFor="directory-search">
                  Buscar contas disponíveis
                </Label>
                <Search
                  aria-hidden="true"
                  className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  className="pl-9"
                  id="directory-search"
                  onChange={(event) => setDirectorySearch(event.target.value)}
                  placeholder="Buscar por nome ou e-mail"
                  type="search"
                  value={directorySearch}
                />
              </div>
              {directoryError ? (
                <div className="space-y-3">
                  <Feedback message={directoryError} tone="error" />
                  <Button onClick={() => void loadDirectory(directorySearch)} variant="outline">
                    Tentar novamente
                  </Button>
                </div>
              ) : directoryLoading ? (
                <LoadingState label="Buscando contas…" />
              ) : directory.length === 0 ? (
                <Card>
                  <CardContent className="flex items-start gap-3 p-5 text-sm text-muted-foreground">
                    <CircleHelp aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    {directorySearch
                      ? 'Nenhuma conta verificada sem vínculo corresponde à busca.'
                      : 'Não há contas verificadas disponíveis para convidar.'}
                  </CardContent>
                </Card>
              ) : (
                <Card className="gap-0 py-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Conta</TableHead>
                        <TableHead>
                          <span className="sr-only">Ação</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {directory.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell>
                            <p className="font-medium">{account.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{account.email}</p>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              onClick={() => setInviteEmail(account.email)}
                              size="sm"
                              variant="outline"
                            >
                              Preparar convite
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {directoryCursor && (
                    <div className="flex justify-center border-t border-border p-3">
                      <Button
                        disabled={directoryMoreLoading}
                        onClick={() => void loadDirectory(directorySearch, directoryCursor, true)}
                        variant="ghost"
                      >
                        {directoryMoreLoading ? 'Carregando…' : 'Carregar mais contas'}
                      </Button>
                    </div>
                  )}
                </Card>
              )}
            </div>

            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Novo convite</CardTitle>
                  <CardDescription>
                    O link será enviado ao endereço informado e expirará em 48 horas.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {inviteError && <Feedback className="mb-4" message={inviteError} tone="error" />}
                  <form
                    className="flex flex-col gap-4"
                    onSubmit={(event) => void submitInvitation(event)}
                  >
                    <TextField
                      autoComplete="email"
                      label="E-mail de trabalho"
                      onChange={(event) => setInviteEmail(event.target.value)}
                      required
                      type="email"
                      value={inviteEmail}
                    />
                    <div className="grid gap-2 text-sm font-medium">
                      <Label htmlFor="invite-role">Cargo inicial</Label>
                      <Select
                        onValueChange={(value) => setInviteRole(value as 'admin' | 'technician')}
                        value={inviteRole}
                      >
                        <SelectTrigger id="invite-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technician">Técnico</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" disabled={inviteBusy} type="submit">
                      {inviteBusy ? 'Enviando convite…' : 'Enviar convite'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <section aria-labelledby="invitations-heading" className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold" id="invitations-heading">
                    Convites
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">Situação de envio e aceite.</p>
                </div>
                {invitationsError ? (
                  <div className="space-y-3">
                    <Feedback message={invitationsError} tone="error" />
                    <Button onClick={() => void loadInvitations()} variant="outline">
                      Tentar novamente
                    </Button>
                  </div>
                ) : invitationsLoading ? (
                  <LoadingState label="Carregando convites…" />
                ) : invitations.length === 0 ? (
                  <Card>
                    <CardContent className="p-5 text-sm text-muted-foreground">
                      Ainda não há convites registrados.
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="gap-0 py-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Destinatário</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>
                            <span className="sr-only">Ação</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.map((invitation) => {
                          const state = inviteStatus(invitation);
                          const canResend =
                            invitation.status === 'pending' || invitation.status === 'expired';
                          const canCreateNew =
                            invitation.status === 'delivery_failed' ||
                            invitation.status === 'revoked';
                          return (
                            <TableRow key={invitation.id}>
                              <TableCell>
                                <p className="max-w-60 break-all font-medium">{invitation.email}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {displayRole(invitation.role)} · expira{' '}
                                  {new Date(invitation.expiresAt).toLocaleDateString('pt-BR')}
                                </p>
                                {invitation.deliveryStatus === 'sent' &&
                                  invitation.status === 'pending' && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Envio aceito; leitura não confirmada.
                                    </p>
                                  )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={state.variant}>{state.label}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {(canResend || canCreateNew) && (
                                  <Button
                                    disabled={busyId === invitation.id}
                                    onClick={() => void resendInvitation(invitation, canCreateNew)}
                                    size="sm"
                                    variant="outline"
                                  >
                                    {busyId === invitation.id
                                      ? 'Enviando…'
                                      : canCreateNew
                                        ? 'Novo convite'
                                        : 'Reenviar'}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {invitationCursor && (
                      <div className="flex justify-center border-t border-border p-3">
                        <Button
                          disabled={invitationsMoreLoading}
                          onClick={() => void loadInvitations(invitationCursor, true)}
                          variant="ghost"
                        >
                          {invitationsMoreLoading ? 'Carregando…' : 'Carregar mais convites'}
                        </Button>
                      </div>
                    )}
                  </Card>
                )}
              </section>
            </div>
          </section>
        </div>
        <HomeNavigation
          activeHref="/conta"
          className="fixed inset-x-0 bottom-0 md:hidden"
          items={teamNavigation}
        />
      </main>

      <Dialog
        onOpenChange={(open) => {
          if (!open && !busyId) {
            setActionTarget(null);
            setMemberAction(null);
          }
        }}
        open={Boolean(actionTarget && memberAction)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {memberAction === 'promote'
                ? 'Promover administrador?'
                : memberAction === 'demote'
                  ? 'Rebaixar seu cargo?'
                  : memberAction === 'leave'
                    ? 'Sair do workspace?'
                    : 'Revogar acesso?'}
            </DialogTitle>
            <DialogDescription>
              {actionTarget && memberAction === 'promote'
                ? `${actionTarget.user.name} receberá permissões de administrador neste workspace.`
                : memberAction === 'demote'
                  ? 'Você continuará no workspace como Técnico, mas perderá as permissões administrativas.'
                  : memberAction === 'leave'
                    ? 'Você perderá acesso a este workspace. Sua conta e seus dados serão preservados.'
                    : actionTarget
                      ? `${actionTarget.user.name} perderá acesso a este workspace. A conta e o histórico serão preservados.`
                      : ''}
            </DialogDescription>
          </DialogHeader>
          {actionError && <Feedback message={actionError} tone="error" />}
          <DialogFooter>
            <Button
              disabled={Boolean(busyId)}
              onClick={() => {
                setActionTarget(null);
                setMemberAction(null);
              }}
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              disabled={Boolean(busyId)}
              onClick={() => void confirmMemberAction()}
              variant={
                memberAction === 'revoke' || memberAction === 'leave' ? 'destructive' : 'default'
              }
            >
              {busyId
                ? 'Salvando…'
                : memberAction === 'promote'
                  ? 'Confirmar promoção'
                  : memberAction === 'demote'
                    ? 'Confirmar rebaixamento'
                    : memberAction === 'leave'
                      ? 'Sair do workspace'
                      : 'Confirmar revogação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceSidebarLayout>
  );
}
