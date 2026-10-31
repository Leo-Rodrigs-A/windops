import { createHash } from 'node:crypto';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]),
  );
}

/** Stable payload fingerprint shared by command receipt producers. */
export function commandHash(value: unknown): Buffer {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest();
}
