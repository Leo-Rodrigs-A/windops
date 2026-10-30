// Preview and Vite can share an origin. Release the production worker before
// importing development modules, without touching IndexedDB or pending commands.
async function bootstrap() {
  if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const isAppWorker = (worker: ServiceWorker | null) =>
      worker && new URL(worker.scriptURL).pathname === '/service-worker.js';
    const controlled = isAppWorker(navigator.serviceWorker.controller);
    for (const registration of registrations) {
      if (
        isAppWorker(registration.active) ||
        isAppWorker(registration.waiting) ||
        isAppWorker(registration.installing)
      ) {
        await registration.unregister();
      }
    }
    if (controlled) {
      window.location.reload();
      return;
    }
  }
  await import('./main');
}

void bootstrap();
