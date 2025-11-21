const CACHE_NAME = 'audyt-eaa-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/favicon-eaa.svg',
  '/manifest.webmanifest',
  '/clauses/c1.json',
  '/clauses/c2.json',
  '/clauses/c3.json',
  '/clauses/c4.json',
  '/clauses/c5.json',
  '/clauses/c6.json',
  '/clauses/c7.json',
  '/clauses/c8.json',
  '/clauses/c9.json',
  '/clauses/c10.json',
  '/clauses/c11.json',
  '/clauses/c12.json',
  '/clauses/c13.json',
  '/js/vendor/jszip.min.js',
  // Dodaj inne pliki statyczne jeśli są potrzebne
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
  // Try cache first, then network; update cache dynamically for GET requests
  const request = event.request;
  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request).then(networkResponse => {
        // Update cache for any successful GET responses (allow opaque responses for CDN resources)
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => {
        // If network fails, return cached response or fallback to index
        return cached || caches.match('/index.html');
      });
      // If we have cached response, return it immediately, otherwise wait for network
      return cached || networkFetch;
    })
  );
});
