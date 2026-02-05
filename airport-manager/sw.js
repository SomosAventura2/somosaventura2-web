const CACHE_NAME = 'airport-manager-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/pedidos.html',
  '/calendario.html',
  '/pagos.html',
  '/estadisticas.html',
  '/css/styles.css',
  '/js/supabase-config.js',
  '/js/pedidos.js',
  '/js/calendario.js',
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
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
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
