const CACHE_NAME = 'audyt-eaa-cache-v13';
// Use explicit versioned assets where available to avoid serving stale files
const urlsToCache = [
  './',
  './index.html',
  './new-audit.html',
  './audit.html',
  './summary.html',
  './css/style.css?v=13',
  './css/pico.min.css',
  './js/setup.js?v=13',
  './js/landing.js?v=13',
  './js/audit.js?v=13',
  './js/summary.js?v=13',
  './js/utils.js?v=13',
  './js/messages.pl.js?v=13',
  './js/messages.en.js?v=13',
  './js/lucide.min.js',
  './js/jszip.min.js',
  './manifest.webmanifest',
];

self.addEventListener('install', event => {
  // Activate new service worker immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Attempt to pre-cache assets but don't fail the install if some fail
      await Promise.all(urlsToCache.map(async (url) => {
        try {
          const res = await fetch(url);
          if (!res || !res.ok) throw new Error(`Bad response for ${url}: ${res && res.status}`);
          await cache.put(url, res);
        } catch (err) {
          console.warn('Service Worker: could not cache', url, err);
          // continue without rejecting the whole install
        }
      }));
    })
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
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then(response => {
        // If response is invalid, throw to trigger fallback
        if (!response || response.status >= 400) {
          throw new Error('Network response was not ok');
        }
        return response;
      }).catch(err => {
        console.warn('Service Worker fetch failed:', event.request.url, err);
        // For navigations, return cached index.html if available
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        // Generic fallback for other requests
        return new Response('Network error', { status: 504, statusText: 'Gateway Timeout' });
      });
    })
  );
});
