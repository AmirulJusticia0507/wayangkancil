const CACHE_NAME = 'wayang-kancil-v8-ai-dialogue';
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/css/style.css',
  '/js/main.js',
  '/js/episodes.js',
  '/js/gameEngine.js',
  '/js/narrativeEngine.js',
  '/js/sound.js',
  '/js/storyEngine.js',
  '/js/pwa-register.js'
];

// Cache-first untuk aset statis (APP_SHELL), network-first untuk navigasi,
// selalu fallback ke offline.html saat tidak ada jaringan.
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Hindari Socket.io (real-time) dari SW
  if (request.method !== 'GET' || url.pathname.startsWith('/socket.io/')) return;

  // Navigasi (HTML): network-first, fallback cache/offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match('/offline.html'))
    );
    return;
  }

  // Aset statis: cache-first, fallback network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || (response.status !== 200 && response.type !== 'opaque')) return response;
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
        return response;
      });
    })
  );
});
