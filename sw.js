/* ============================================================
   F.I.G. — Service Worker v2.0
   Cache-first, offline-capable, GitHub Pages compatible
   ============================================================ */

const CACHE_NAME = 'fig-v2';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './icon-72.png',
  './icon-96.png',
  './icon-128.png',
  './icon-144.png',
  './icon-152.png',
  './icon-192.png',
  './icon-384.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

// ── INSTALL: pre-cache all assets ────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.allSettled(
          ASSETS.map(url =>
            cache.add(new Request(url, { cache: 'reload' }))
              .catch(err => console.warn('[SW] Could not cache:', url, err))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: delete old caches ──────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: cache-first, network fallback ─────────────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Only handle http/https
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        // Return cached version immediately if available
        if (cached) return cached;

        // Otherwise fetch from network
        return fetch(event.request)
          .then(response => {
            // Cache valid responses
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => {
            // Offline fallback — return index.html for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            // Return empty response for other failed requests
            return new Response('', { status: 408, statusText: 'Offline' });
          });
      })
  );
});

// ── MESSAGES ─────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
