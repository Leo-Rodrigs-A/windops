import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../lib/auth-api';
import { findNextCatalogCode, getApiErrorMessage } from './model';

describe('catalog model', () => {
  it('scans every cursor page and chooses the next code within the prefix', async () => {
    const loadPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ code: 'P002' }, { code: 'OTHER99' }], nextCursor: 'next' })
      .mockResolvedValueOnce({ items: [{ code: 'P010' }, { code: 'P004' }], nextCursor: null });

    await expect(findNextCatalogCode('P', loadPage)).resolves.toBe('P011');
    expect(loadPage).toHaveBeenNthCalledWith(1, undefined);
    expect(loadPage).toHaveBeenNthCalledWith(2, 'next');
  });

  it('preserves the lower bound, minimum padding, and maximum code limit', async () => {
    await expect(
      findNextCatalogCode('T', async () => ({ items: [], nextCursor: null })),
    ).resolves.toBe('T001');
    await expect(
      findNextCatalogCode('T', async () => ({ items: [{ code: 'T999999' }], nextCursor: null })),
    ).resolves.toBeNull();
  });

  it('keeps catalog action errors actionable and identifies ambiguous network results', () => {
    expect(getApiErrorMessage(new ApiRequestError(409, 'CONFLICT'), 'salvar')).toContain(
      'já está em uso',
    );
    expect(getApiErrorMessage(new Error('Não foi possível conectar'), 'salvar')).toContain(
      'confirmar se o servidor recebeu',
    );
  });
});
