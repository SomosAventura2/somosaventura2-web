/**
 * AIRPORT - Service Worker (PWA)
 * Cache de app shell para uso offline en iPhone/Android.
 */

const CACHE_NAME = 'airport-v1';
const ASSETS = [
  './',
  './app.html',
  './login.html',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './css/app.css',
  './js/app.js',
  './js/router.js',
  './js/supabase.js',
  './js/utils.js',
  './js/modules/auth.js',
  './js/ui/toast.js',
  './js/ui/modal.js',
  './js/modules/dashboard.js',
  './js/modules/orders.js',
  './js/modules/payments.js',
  './js/modules/expenses.js',
  './js/services/orders.service.js',
  './js/services/payments.service.js',
  './js/modules/categories.js',
  './js/modules/profile.js',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode !== 'navigate' && !request.url.match(/\.(css|js|json|svg|woff2?)$/)) {
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const clone = response.clone();
        if (response.status === 200 && request.url.startsWith(self.location.origin)) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        if (request.mode === 'navigate') {
          return caches.match('./app.html').then((r) => r || caches.match('./login.html'));
        }
        return null;
      });
    })
  );
});
