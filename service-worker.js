const CACHE_NAME = 'audyt-eaa-cache-v10';
const urlsToCache = [
  '/',
  '/index.html',
  '/new-audit.html',
  '/audit.html',
  '/summary.html',
  '/css/style.css',
  '/css/pico.min.css',
  '/js/setup.js',
  '/js/landing.js',
  '/js/audit.js',
  '/js/summary.js',
  '/js/utils.js',
  '/js/lucide.min.js',
  '/js/jszip.min.js',
  '/manifest.webmanifest',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
