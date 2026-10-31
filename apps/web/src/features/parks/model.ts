import { ApiRequestError } from '../../lib/auth-api';

export function getApiErrorMessage(error: unknown, action: string) {
  if (error instanceof ApiRequestError && error.status === 401)
    return 'Sua sessão expirou. Entre novamente para continuar.';
  if (error instanceof ApiRequestError && error.status === 403)
    return 'Seu acesso ao workspace mudou. Atualize a sessão e tente novamente.';
  if (error instanceof ApiRequestError && error.status === 404)
    return 'Este parque ou turbina não está mais disponível. Atualize o catálogo.';
  if (error instanceof ApiRequestError && error.status === 409)
    return 'Este código já está em uso neste catálogo.';
  if (error instanceof Error && error.message.startsWith('Não foi possível conectar'))
    return `Não foi possível confirmar se o servidor recebeu a solicitação para ${action}. Confira o catálogo antes de tentar novamente.`;
  return `Não foi possível ${action}. Confira os dados e tente novamente.`;
}

export async function findNextCatalogCode(
  prefix: 'P' | 'T',
  loadPage: (cursor?: string) => Promise<{ items: { code: string }[]; nextCursor: string | null }>,
) {
  let cursor: string | undefined;
  let highestNumber = 0;
  do {
    const page = await loadPage(cursor);
    for (const item of page.items) {
      if (item.code.startsWith(prefix))
        highestNumber = Math.max(highestNumber, Number(item.code.slice(1)) || 0);
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  const nextNumber = highestNumber + 1;
  if (nextNumber > 999999) return null;
  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}
