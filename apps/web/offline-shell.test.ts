import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { build } from 'vite';
import { beforeAll, describe, expect, it } from 'vitest';

let source: string;
let buildFiles: string[];
beforeAll(async () => {
  const result = await build({
    root: fileURLToPath(new URL('.', import.meta.url)),
    logLevel: 'silent',
    build: { write: false },
  });
  if (Array.isArray(result) || !('output' in result)) throw new Error('Unexpected build output');
  const worker = result.output.find((entry) => entry.fileName === 'service-worker.js');
  if (worker?.type !== 'asset') throw new Error('Missing service worker');
  source = String(worker.source);
  buildFiles = result.output
    .filter((entry) => entry.fileName !== 'service-worker.js')
    .map((entry) => `/${entry.fileName}`);
}, 30_000);

function offlineWorker() {
  const listeners = new Map<string, (event: unknown) => void>();
  const oldShell = '<script src="/assets/obsolete.js"></script>';
  const currentShell = '<script src="/assets/current.js"></script>';
  const version = JSON.parse(source.match(/const VERSION = (.*);/)?.[1] ?? 'null');
  const cache = {
    match: async (request: string | { url: string }) => {
      const path = typeof request === 'string' ? request : new URL(request.url).pathname;
      return path === '/index.html' ? new Response(currentShell) : undefined;
    },
  };
  runInNewContext(source, {
    URL,
    Response,
    self: {
      location: { origin: 'https://windops.test' },
      addEventListener: (name: string, callback: (event: unknown) => void) =>
        listeners.set(name, callback),
    },
    caches: {
      // Global lookup models an older cache created before the active version.
      match: async () => new Response(oldShell),
      open: async (name: string) => {
        expect(name).toBe(version);
        return cache;
      },
    },
    fetch: async () => {
      throw new TypeError('Network offline');
    },
  });
  return {
    currentShell,
    request: async (path: string, mode: string) => {
      let response: Promise<Response> | undefined;
      listeners.get('fetch')?.({
        request: { url: `https://windops.test${path}`, method: 'GET', mode },
        respondWith: (value: Promise<Response>) => {
          response = value;
        },
      });
      return response;
    },
  };
}

describe('app shell do build com caches de versões anteriores', () => {
  it('inclui todos os arquivos finais do build, inclusive CSS, no precache', () => {
    const assets: string[] = JSON.parse(source.match(/const ASSETS = (.*);/)?.[1] ?? '[]');
    expect(buildFiles.some((path) => path.endsWith('.css'))).toBe(true);
    for (const path of buildFiles) expect(assets).toContain(path);
  });

  it('recarrega uma rota offline usando somente o HTML da versão ativa', async () => {
    const worker = offlineWorker();
    const response = await worker.request('/app', 'navigate');
    expect(await response?.text()).toBe(worker.currentShell);
  });

  it('serve index.html da versão ativa e não intercepta API nem módulos Vite', async () => {
    const worker = offlineWorker();
    expect(await (await worker.request('/index.html', 'cors'))?.text()).toBe(worker.currentShell);
    expect(await worker.request('/api/me', 'cors')).toBeUndefined();
    expect(await worker.request('/src/main.tsx', 'cors')).toBeUndefined();
  });
});
