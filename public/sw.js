const CACHE_NAME = 'wayang-kancil-v12-page-scroll';
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

  // Aset statis: stale-while-revalidate — sajikan cache, perbarui di background
  // supaya CSS/JS versi baru selalu masuk pada load berikutnya.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response && (response.status === 200 || response.type === 'opaque')) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(network);
        return cached;
      }

      const fresh = await network;
      return fresh || new Response('Offline', { status: 504, statusText: 'Offline' });
    })
  );
});
