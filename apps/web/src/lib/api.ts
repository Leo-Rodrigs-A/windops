import { healthSchema } from '@windops/contracts';
export async function getHealth() {
  const response = await fetch('/api/health/live', { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('API indisponível');
  return healthSchema.parse(await response.json());
}
