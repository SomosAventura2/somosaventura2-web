const CACHE_NAME = 'airport-manager-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/pedidos.html',
  '/calendario.html',
  '/notas.html',
  '/pagos.html',
  '/estadisticas.html',
  '/css/styles.css',
  '/js/supabase-config.js',
  '/js/pedidos.js',
  '/js/calendario.js',
  '/js/notas.js',
  '/js/pagos.js',
  '/js/estadisticas.js',
  '/manifest.json'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Fetch: network-first con fallback a caché para misma origen (modo offline)
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isNav = request.mode === 'navigate';
  const isStatic = /\.(html|css|js|json|ico)$/i.test(url.pathname) || url.pathname === '/';

  if (!sameOrigin) {
    event.respondWith(fetch(request));
    return;
  }

  if (isNav || isStatic) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});

// Activate event
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
