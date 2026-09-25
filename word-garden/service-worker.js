const CACHE_NAME = 'word-garden-v2';
const CACHE_PREFIX = 'word-garden-';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './touch.js',
  './engine.js',
  './puzzles.js',
  './storage.js',
  './manifest.json',
  './service-worker.js',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];
const scopedUrls = ASSETS.map(asset => new URL(asset, self.registration.scope));
const knownPaths = new Set(scopedUrls.map(url => url.pathname));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(scopedUrls)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
    return;
  }
  if (event.data?.type !== 'CACHE_READY') return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const missing = [];
    for (const url of scopedUrls) {
      if (!await cache.match(url, { ignoreSearch: true })) missing.push(url.pathname);
    }
    const reply = { type: 'CACHE_READY', ready: missing.length === 0, missing, cacheName: CACHE_NAME };
    if (event.ports[0]) event.ports[0].postMessage(reply);
    else event.source?.postMessage(reply);
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname) || !knownPaths.has(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    return fetch(event.request);
  })());
});
