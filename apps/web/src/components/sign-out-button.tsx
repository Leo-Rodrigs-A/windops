import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { openLocalIssueStore } from '../offline/local-issue-store';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

export function SignOutButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const { signOut, snapshot } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const partition =
    snapshot.status === 'authenticated'
      ? { accountId: snapshot.me.user.id, workspaceId: snapshot.context.workspace.id }
      : snapshot.status === 'offline' || snapshot.status === 'revoked'
        ? { accountId: snapshot.accountId, workspaceId: snapshot.workspaceId }
        : null;

  async function signOutNow() {
    setBusy(true);
    setError('');
    try {
      await signOut();
    } catch {
      setError('Não foi possível encerrar a sessão. Verifique a conexão e tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  async function requestSignOut() {
    setError('');
    if (partition) {
      try {
        const store = await openLocalIssueStore(partition);
        const count = store.listPendingCommands().length;
        store.close();
        if (count > 0) {
          setPendingCount(count);
          setDialogOpen(true);
          return;
        }
      } catch {
        // A logout never deletes the local journal, even when its status cannot be read.
      }
    }
    await signOutNow();
  }

  async function preserveAndSignOut(exportPackage: boolean) {
    if (exportPackage && partition) {
      try {
        const store = await openLocalIssueStore(partition);
        store.downloadPendingExport();
        store.close();
      } catch {
        setError(
          'Não foi possível exportar agora. As pendências continuam preservadas nesta conta.',
        );
        return;
      }
    }
    setDialogOpen(false);
    await signOutNow();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        aria-label={iconOnly ? 'Sair da conta' : undefined}
        disabled={busy}
        onClick={() => void requestSignOut()}
        size={iconOnly ? 'icon' : 'default'}
        variant="outline"
      >
        {iconOnly ? <LogOut aria-hidden="true" /> : busy ? 'Saindo…' : 'Sair da conta'}
      </Button>
      {error && (
        <p className="max-w-48 text-right text-xs text-danger" role="alert">
          {error}
        </p>
      )}
      <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preservar trabalho pendente?</DialogTitle>
            <DialogDescription>
              Há {pendingCount} comando(s) ainda não confirmado(s). A fila continuará vinculada a
              esta conta neste aparelho. Você também pode baixar uma cópia legível antes de sair.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDialogOpen(false)} variant="outline">
              Continuar no Wind Ops
            </Button>
            <Button
              disabled={busy}
              onClick={() => void preserveAndSignOut(false)}
              variant="outline"
            >
              {busy ? 'Saindo…' : 'Preservar e sair'}
            </Button>
            <Button disabled={busy} onClick={() => void preserveAndSignOut(true)}>
              Exportar e sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
