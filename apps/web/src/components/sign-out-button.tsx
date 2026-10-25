import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { Button } from './ui/button';

export function SignOutButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        aria-label={iconOnly ? 'Sair da conta' : undefined}
        disabled={busy}
        onClick={() => void signOutNow()}
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
    </div>
  );
}
