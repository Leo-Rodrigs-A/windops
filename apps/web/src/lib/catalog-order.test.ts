import { describe, expect, it } from 'vitest';
import { sortCatalogByCreation } from './catalog-order';

describe('sortCatalogByCreation', () => {
  it('orders oldest first and uses the ID for equal or invalid timestamps', () => {
    const items = [
      { id: 'b', createdAt: '2026-01-02T00:00:00.000Z' },
      { id: 'd', createdAt: 'invalid' },
      { id: 'a', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'c', createdAt: '2026-01-02T00:00:00.000Z' },
      { id: 'e', createdAt: 'invalid' },
    ];

    expect(sortCatalogByCreation(items).map((item) => item.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});
