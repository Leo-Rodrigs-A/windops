import { Bell, Cloud, CloudOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';

export function WorkspaceSystemActions() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <div className="flex items-center gap-1">
      <Button
        aria-label="Notificações — integração ainda não disponível"
        className="text-muted-foreground"
        disabled
        size="icon"
        title="As notificações serão agrupadas aqui quando a integração estiver disponível."
        variant="ghost"
      >
        <Bell aria-hidden="true" />
      </Button>
      <span
        aria-label={
          online
            ? 'Conexão do dispositivo disponível. Gravações exigem conexão com o servidor.'
            : 'Dispositivo sem conexão. Gravações offline ainda não estão disponíveis.'
        }
        className={
          online
            ? 'grid size-9 place-items-center text-emerald-500'
            : 'grid size-9 place-items-center text-destructive'
        }
        role="status"
        title={
          online
            ? 'Dispositivo conectado à rede; sincronização offline ainda não está disponível.'
            : 'Dispositivo sem conexão; gravações offline ainda não estão disponíveis.'
        }
      >
        {online ? (
          <Cloud aria-hidden="true" className="size-5" />
        ) : (
          <CloudOff aria-hidden="true" className="size-5" />
        )}
      </span>
    </div>
  );
}
