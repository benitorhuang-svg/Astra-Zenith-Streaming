const CACHE_NAME = 'astra-zenith-FIX-V3-' + Date.now();
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
];

/**
 * EMERGENCY SW RECOVERY
 * Forced to Network-First for ALL assets to recover from stale cache deadlock.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // EXEMPTION: API calls always go to network
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // FORCE NETWORK-FIRST for everything during emergency recovery
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
