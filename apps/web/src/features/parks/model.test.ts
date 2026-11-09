import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../lib/auth-api';
import { findNextParkCode, findNextTurbineCode, getApiErrorMessage } from './model';

describe('catalog model', () => {
  it('scans every cursor page and chooses the next code within the prefix', async () => {
    const loadPage = vi
      .fn()
      .mockResolvedValueOnce({
        items: [{ code: 'Parque 02' }, { code: 'OTHER99' }],
        nextCursor: 'next',
      })
      .mockResolvedValueOnce({
        items: [{ code: 'Parque 10' }, { code: 'Parque 04' }],
        nextCursor: null,
      });

    await expect(findNextParkCode(loadPage)).resolves.toBe('Parque 11');
    expect(loadPage).toHaveBeenNthCalledWith(1, undefined);
    expect(loadPage).toHaveBeenNthCalledWith(2, 'next');
  });

  it('preserves the lower bound, minimum padding, and maximum code limit', async () => {
    await expect(
      findNextTurbineCode('Parque 01', async () => ({ items: [], nextCursor: null })),
    ).resolves.toBe('ZAC-01-01');
    await expect(
      findNextTurbineCode('Parque 01', async () => ({
        items: [{ code: 'ZAC-01-999999' }],
        nextCursor: null,
      })),
    ).resolves.toBeNull();
    await expect(
      findNextTurbineCode('Parque 02', async () => ({
        items: [{ code: 'ZAC-01-08' }, { code: 'ZAC-02-03' }],
        nextCursor: null,
      })),
    ).resolves.toBe('ZAC-02-04');
    await expect(
      findNextTurbineCode('invalid', async () => ({ items: [], nextCursor: null })),
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
