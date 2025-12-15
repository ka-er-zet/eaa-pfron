const CACHE_NAME = 'audyt-eaa-cache-v13';
// Use explicit versioned assets where available to avoid serving stale files
const urlsToCache = [
  './',
  './index.html',
  './new-audit.html',
  './audit.html',
  './summary.html',
  './css/style.css?v=10',
  './css/pico.min.css',
  './js/setup.js',
  './js/landing.js',
  './js/audit.js?v=4',
  './js/summary.js',
  './js/utils.js',
  './js/lucide.min.js',
  './js/jszip.min.js',
  './manifest.webmanifest',
];

self.addEventListener('install', event => {
  // Activate new service worker immediately
  self.skipWaiting();
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
  // Take control of uncontrolled clients as soon as this SW activates
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
