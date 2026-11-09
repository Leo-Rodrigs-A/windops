import { ApiRequestError } from '../../lib/auth-api';

export function getApiErrorMessage(error: unknown, action: string) {
  if (error instanceof ApiRequestError && error.code === 'INVALID_CATALOG_CODE')
    return 'O código da turbina precisa incluir o número do parque selecionado.';
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

export async function findNextParkCode(
  loadPage: (cursor?: string) => Promise<{ items: { code: string }[]; nextCursor: string | null }>,
) {
  let cursor: string | undefined;
  let highestNumber = 0;
  do {
    const page = await loadPage(cursor);
    for (const item of page.items) {
      const match = /^P-(\d{2,6})$/.exec(item.code);
      if (match) highestNumber = Math.max(highestNumber, Number(match[1]));
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  const nextNumber = highestNumber + 1;
  if (nextNumber > 999999) return null;
  return `P-${String(nextNumber).padStart(2, '0')}`;
}

export async function findNextTurbineCode(
  parkCode: string,
  loadPage: (cursor?: string) => Promise<{ items: { code: string }[]; nextCursor: string | null }>,
) {
  const parkMatch = /^P-(\d{2,6})$/.exec(parkCode);
  if (!parkMatch) return null;
  const parkNumber = Number(parkMatch[1]);
  let cursor: string | undefined;
  let highestNumber = 0;
  do {
    const page = await loadPage(cursor);
    for (const item of page.items) {
      const match = /^ZAC-(\d{2,6})-(\d{2,6})$/.exec(item.code);
      if (match && Number(match[1]) === parkNumber)
        highestNumber = Math.max(highestNumber, Number(match[2]));
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  const nextNumber = highestNumber + 1;
  if (nextNumber > 999999) return null;
  return `ZAC-${String(parkNumber).padStart(2, '0')}-${String(nextNumber).padStart(2, '0')}`;
}
