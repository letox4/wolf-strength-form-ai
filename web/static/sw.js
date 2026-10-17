// Service worker de limpieza (sin recargar, para NO crear bucles).
// Borra cachés previas y se desinstala. No intercepta nada.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) await caches.delete(k);
    await self.clients.claim();
    await self.registration.unregister();   // se quita solo; SIN recargar
  })());
});
// Sin handler de 'fetch': todo va directo a la red.
