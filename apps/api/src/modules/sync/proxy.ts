import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import type { WorkspaceAuthorizationService } from '../workspaces/index.js';

const shapes = {
  workspace: {
    table: 'public.workspaces',
    columns: ['id', 'name', 'created_at'],
    filter: 'id = $1',
  },
  parks: {
    table: 'public.parks',
    columns: [
      'id',
      'workspace_id',
      'code',
      'created_at',
      'updated_at',
      'revision',
      'deactivated_at',
    ],
    filter: 'workspace_id = $1',
  },
  turbines: {
    table: 'public.turbines',
    columns: [
      'id',
      'workspace_id',
      'park_id',
      'code',
      'created_at',
      'updated_at',
      'revision',
      'deactivated_at',
    ],
    filter: 'workspace_id = $1',
  },
  issues: {
    table: 'public.issue_sync_rows',
    columns: [
      'id',
      'workspace_id',
      'park_id',
      'turbine_id',
      'text',
      'completion_report',
      'status',
      'created_at',
      'updated_at',
      'revision',
    ],
    filter: "workspace_id = $1 AND status IN ('pending', 'in_progress')",
  },
  'issue-events': {
    table: 'public.issue_sync_events',
    columns: [
      'id',
      'workspace_id',
      'issue_id',
      'actor_label',
      'type',
      'occurred_at',
      'before',
      'after',
    ],
    filter:
      "workspace_id = $1 AND issue_id IN (SELECT id FROM public.issue_sync_rows WHERE workspace_id = $1 AND status IN ('pending', 'in_progress'))",
  },
} as const;

const responseHeaders = [
  'content-type',
  'electric-offset',
  'electric-handle',
  'electric-schema',
  'electric-up-to-date',
  'electric-cursor',
  'electric-snapshot',
  'etag',
  'retry-after',
] as const;
const maxResponseBytes = 16 * 1024 * 1024;
const requestTimeoutMs = 15_000;

export type SyncShapeResult =
  | {
      status: 'unauthenticated' | 'forbidden' | 'not_found' | 'invalid_handle' | 'unavailable';
    }
  | {
      status: 'ok';
      statusCode: number;
      headers: Record<string, string | undefined>;
      body: Buffer;
    };

export interface SyncShapeProxy {
  getShape(input: {
    headers: IncomingHttpHeaders;
    collection: string;
    workspaceId: string;
    protocol: ReadonlyMap<string, string>;
    signal: AbortSignal;
  }): Promise<SyncShapeResult>;
}

export function createSyncShapeProxy(options: {
  authorization: Pick<WorkspaceAuthorizationService, 'authorizeWorkspace'>;
  electricUrl: string;
  electricSecret: string;
  fetch?: typeof fetch;
}): SyncShapeProxy {
  const fetcher = options.fetch ?? fetch;
  const origin = new URL(options.electricUrl);
  const upstreamUrl = new URL('/v1/shape', origin);

  async function authorizationStatus(headers: IncomingHttpHeaders, workspaceId: string) {
    const result = await options.authorization.authorizeWorkspace(headers, workspaceId);
    return result.status;
  }

  return {
    async getShape({ headers, collection, workspaceId, protocol, signal }) {
      const authorization = await options.authorization.authorizeWorkspace(headers, workspaceId);
      if (authorization.status !== 'ok') return { status: authorization.status };

      const definition = shapes[collection as keyof typeof shapes];
      if (!definition) return { status: 'not_found' };

      for (const key of ['handle', 'expired_handle'] as const) {
        const scopedHandle = protocol.get(key);
        if (
          scopedHandle &&
          !isHandleForScope(scopedHandle, options.electricSecret, workspaceId, collection)
        ) {
          return { status: 'invalid_handle' };
        }
      }

      const url = new URL(upstreamUrl);
      url.searchParams.set('table', definition.table);
      url.searchParams.set('columns', definition.columns.join(','));
      url.searchParams.set('where', definition.filter);
      url.searchParams.set('params[1]', workspaceId);
      url.searchParams.set('secret', options.electricSecret);
      for (const [key, value] of protocol) {
        url.searchParams.set(
          key,
          key === 'handle' || key === 'expired_handle' ? readElectricHandle(value) : value,
        );
      }

      try {
        const timeout = AbortSignal.timeout(requestTimeoutMs);
        const upstream = await fetcher(url, {
          method: 'GET',
          headers: { accept: 'application/json' },
          signal: AbortSignal.any([signal, timeout]),
          redirect: 'error',
        });

        if (upstream.status >= 500 || upstream.status === 401 || upstream.status === 403)
          return { status: 'unavailable' };
        const body = await readResponse(upstream, maxResponseBytes);
        const currentAuthorization = await authorizationStatus(headers, workspaceId);
        if (currentAuthorization !== 'ok') return { status: currentAuthorization };
        const forwardedHeaders = Object.fromEntries(
          responseHeaders.map((name) => [name, upstream.headers.get(name) ?? undefined]),
        );
        const electricHandle = forwardedHeaders['electric-handle'];
        if (electricHandle) {
          forwardedHeaders['electric-handle'] = signHandle(
            electricHandle,
            options.electricSecret,
            workspaceId,
            collection,
          );
        }
        return {
          status: 'ok',
          statusCode: upstream.status,
          headers: forwardedHeaders,
          body,
        };
      } catch {
        if (signal.aborted) return { status: 'unavailable' };
        const currentAuthorization = await authorizationStatus(headers, workspaceId).catch(
          () => 'unauthenticated' as const,
        );
        if (currentAuthorization === 'unauthenticated') return { status: 'unauthenticated' };
        if (currentAuthorization === 'forbidden') return { status: 'forbidden' };
        return { status: 'unavailable' };
      }
    },
  };
}

function signHandle(handle: string, secret: string, workspaceId: string, collection: string) {
  const payload = Buffer.from(JSON.stringify([workspaceId, collection, handle])).toString(
    'base64url',
  );
  const signed = `v1.${payload}`;
  const signature = createHmac('sha256', secret).update(signed).digest('base64url');
  return `${signed}.${signature}`;
}

function readElectricHandle(token: string) {
  const encodedPayload = token.split('.')[1] ?? '';
  const payload: unknown = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  return Array.isArray(payload) && typeof payload[2] === 'string' ? payload[2] : '';
}

function isHandleForScope(token: string, secret: string, workspaceId: string, collection: string) {
  const [version, payload, signature, ...extra] = token.split('.');
  if (version !== 'v1' || !payload || !signature || extra.length > 0) return false;
  const signed = `${version}.${payload}`;
  const expectedSignature = createHmac('sha256', secret).update(signed).digest();
  let suppliedSignature: Buffer;
  try {
    suppliedSignature = Buffer.from(signature, 'base64url');
  } catch {
    return false;
  }
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    return false;
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Array.isArray(parsed) || parsed.length !== 3) return false;
    const [tokenWorkspaceId, tokenCollection, electricHandle] = parsed;
    return (
      tokenWorkspaceId === workspaceId &&
      tokenCollection === collection &&
      typeof electricHandle === 'string' &&
      /^[A-Za-z0-9._~-]{1,256}$/.test(electricHandle)
    );
  } catch {
    return false;
  }
}

async function readResponse(response: Response, maxBytes: number) {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error('Electric response exceeded the proxy size limit.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(
    chunks.map((chunk) => Buffer.from(chunk)),
    totalBytes,
  );
}
