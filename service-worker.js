// XoNote - Service Worker for PWA functionality

const CACHE_NAME = 'xonote-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/signup.html',
  '/404.html',
  '/faq.html',
  '/blog.html',
  '/about.html',
  '/privacy.html',
  '/terms.html',
  '/cookie-policy.html',
  '/css/index.css',
  '/js/App.js',
  '/js/data.js',
  '/site.webmanifest',
  '/assets/favicon-96x96.png',
  '/assets/favicon.svg',
  '/assets/favicon.ico',
  '/assets/apple-touch-icon.png',
  '/assets/web-app-manifest-192x192.png',
  '/assets/web-app-manifest-512x512.png',
  'https://cdn.jsdelivr.net/npm/boxicons@2.1.4/css/boxicons.min.css',
  'https://cdn.jsdelivr.net/gh/dusfire/icon/css/style.css',
  'https://cdn.tailwindcss.com'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('Removing old cache', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', event => {
  // Skip cross-origin requests or firebase requests
  if (
    event.request.url.includes('firebaseio.com') ||
    event.request.url.includes('googleapis.com')
  ) {
    return;
  }

  // For navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // For other requests - cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        // Make network request and cache the response
        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Open cache and store the response
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // If both cache and network fail, return the offline page for HTML requests
        if (event.request.headers.get('Accept') && event.request.headers.get('Accept').includes('text/html')) {
          return caches.match('/404.html');
        }
      })
  );
}); 