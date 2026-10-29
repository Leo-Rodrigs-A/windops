import { fileURLToPath } from 'node:url';
import tailwind from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

function offlineShell(): Plugin {
  return {
    name: 'windops-offline-shell',
    apply: 'build' as const,
    generateBundle(_, bundle) {
      const assets = Object.values(bundle)
        .filter((entry) => entry.type === 'chunk' || entry.type === 'asset')
        .map((entry) => `/${entry.fileName}`);
      const version = JSON.stringify(`windops-shell-${Date.now()}`);
      const source = `const VERSION = ${version};
const SHELL = '/index.html';
const ASSETS = ${JSON.stringify(['/', '/index.html', '/manifest.webmanifest', '/windops-pwa.svg', '/windops-192.png', '/windops-512.png', '/apple-touch-icon.png', '/windops-mark.svg', '/windops-mark-dark.svg', '/windops-mark-light.svg', ...assets])};
const STATIC_DESTINATIONS = new Set(['script','style','font','image']);
const ISSUE_PATH = /^\\/chamados\\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function safeIssueUrl(value) {
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin === self.location.origin && ISSUE_PATH.test(url.pathname) && !url.search && !url.hash) return url.pathname;
  } catch {}
  return '/app';
}
self.addEventListener('install', event => event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => { const request = event.request; const url = new URL(request.url); if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/.well-known/')) return; if (request.mode === 'navigate') { event.respondWith((async () => { try { return await fetch(request); } catch { return (await caches.match(SHELL)) || Response.error(); } })()); return; } if (ASSETS.includes(url.pathname) || STATIC_DESTINATIONS.has(request.destination)) event.respondWith((async () => { const cached = await caches.match(request); if (cached) return cached; const response = await fetch(request); if (response.ok && response.type === 'basic') { const cache = await caches.open(VERSION); await cache.put(request, response.clone()); } return response; })()); });
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch {}
  const title = typeof payload.title === 'string' ? payload.title.slice(0, 80) : 'Wind Ops';
  const body = typeof payload.body === 'string' ? payload.body.slice(0, 180) : 'Você tem um novo aviso.';
  const eventId = typeof payload.eventId === 'string' ? payload.eventId : '';
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/windops-192.png',
    badge: '/windops-192.png',
    tag: eventId ? 'windops-' + eventId : undefined,
    data: { url: safeIssueUrl(payload.url) },
    renotify: false,
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = safeIssueUrl(event.notification.data && event.notification.data.url);
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = clients.find(candidate => {
      try { return new URL(candidate.url).origin === self.location.origin; } catch { return false; }
    });
    if (client) {
      await client.navigate(self.location.origin + target);
      return client.focus();
    }
    return self.clients.openWindow(self.location.origin + target);
  })());
});
`;
      this.emitFile({ type: 'asset', fileName: 'service-worker.js', source });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwind(), offlineShell()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3000' } },
  preview: { port: 5173, strictPort: true },
});
