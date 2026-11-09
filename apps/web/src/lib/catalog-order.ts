export function sortCatalogByCreation<T extends { createdAt: string; id: string }>(
  items: readonly T[],
): T[] {
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt);
    const rightTime = Date.parse(right.createdAt);
    const leftValid = Number.isFinite(leftTime);
    const rightValid = Number.isFinite(rightTime);
    if (leftValid && rightValid && leftTime !== rightTime) return leftTime - rightTime;
    if (leftValid !== rightValid) return leftValid ? -1 : 1;
    return left.id.localeCompare(right.id);
  });
}
