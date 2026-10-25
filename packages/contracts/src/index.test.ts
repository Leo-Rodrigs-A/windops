import { expect, it } from 'vitest';
import { errorSchema, healthSchema } from './index.js';

it('rejects false-positive health', () => {
  expect(healthSchema.safeParse({ status: 'down', service: 'windops-api' }).success).toBe(false);
});
it('requires traceable errors', () => {
  expect(errorSchema.safeParse({ error: { code: 'FAIL', message: 'failure' } }).success).toBe(
    false,
  );
});
