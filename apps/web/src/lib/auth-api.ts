import {
  authProvidersSchema,
  errorSchema,
  type Me,
  meSchema,
  type WorkspaceContext,
  workspaceContextSchema,
} from '@windops/contracts';
import { z } from 'zod';

const authStatusSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('anonymous') }),
  z.object({ status: z.literal('pending_email_second_step'), expiresAt: z.iso.datetime() }),
  z.object({
    status: z.literal('authenticated'),
    user: z.object({ id: z.uuid(), email: z.email() }),
  }),
]);

export type AuthStatus = z.infer<typeof authStatusSchema>;

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
  ) {
    super('A solicitação não pôde ser concluída.');
    this.name = 'ApiRequestError';
  }
}

export async function requestJson(path: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      signal: init.signal ?? AbortSignal.timeout(12_000),
    });
  } catch {
    throw new Error(
      'Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.',
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  if (!response.ok) {
    const parsedError = errorSchema.safeParse(body);
    throw new ApiRequestError(
      response.status,
      parsedError.success ? parsedError.data.error.code : undefined,
    );
  }
  return body;
}

export async function getAuthStatus(): Promise<AuthStatus> {
  return authStatusSchema.parse(await requestJson('/api/auth/second-step/status'));
}

export async function getAuthProviders() {
  return authProvidersSchema.parse(await requestJson('/api/auth/providers'));
}

export async function getMe(): Promise<Me> {
  return meSchema.parse(await requestJson('/api/me'));
}

export async function getWorkspaceContext(workspaceId: string): Promise<WorkspaceContext> {
  return workspaceContextSchema.parse(
    await requestJson(`/api/workspaces/${encodeURIComponent(workspaceId)}/context`),
  );
}

export async function authPost(path: string, body: Record<string, unknown> = {}): Promise<unknown> {
  return requestJson(path, { method: 'POST', body: JSON.stringify(body) });
}
