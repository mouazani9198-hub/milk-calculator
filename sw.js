const CACHE_NAME = 'milk-calc-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

const isHTML = (req) => req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (isHTML(req)) {
    // Network-first for the app shell so updates show up immediately.
    event.respondWith(
      fetch(req).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return response;
      }).catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for static assets (icons, manifest, etc).
  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          if (req.method === 'GET' && response.ok) {
            cache.put(req, response.clone());
          }
          return response;
        });
      }).catch(() => cached);
    })
  );
});
