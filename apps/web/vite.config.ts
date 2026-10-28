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
      const source = `const VERSION = ${version};\nconst SHELL = '/index.html';\nconst ASSETS = ${JSON.stringify(['/', '/index.html', '/manifest.webmanifest', '/windops-pwa.svg', '/windops-192.png', '/windops-512.png', '/apple-touch-icon.png', '/windops-mark.svg', '/windops-mark-dark.svg', '/windops-mark-light.svg', ...assets])};\nconst STATIC_DESTINATIONS = new Set(['script','style','font','image']);\nself.addEventListener('install', event => event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(ASSETS))));\nself.addEventListener('activate', event => event.waitUntil(self.clients.claim()));\nself.addEventListener('message', event => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });\nself.addEventListener('fetch', event => { const request = event.request; const url = new URL(request.url); if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/.well-known/')) return; if (request.mode === 'navigate') { event.respondWith((async () => { try { return await fetch(request); } catch { return (await caches.match(SHELL)) || Response.error(); } })()); return; } if (ASSETS.includes(url.pathname) || STATIC_DESTINATIONS.has(request.destination)) event.respondWith((async () => { const cached = await caches.match(request); if (cached) return cached; const response = await fetch(request); if (response.ok && response.type === 'basic') { const cache = await caches.open(VERSION); await cache.put(request, response.clone()); } return response; })()); });\n`;
      this.emitFile({ type: 'asset', fileName: 'service-worker.js', source });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwind(), offlineShell()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3000' } },
});
