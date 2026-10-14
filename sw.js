// Service Worker for Génie Mentor Académie (GMA) PWA / APK
const CACHE_NAME = 'gma-cache-v7';
const OFFLINE_URL = '/';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/logo-192.png',
  '/favicon.ico'
];

// Install event: cache core assets for offline availability and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-caching partial assets warning:', err);
      });
    })
  );
});

// Message event: intercept SKIP_WAITING and INVALIDATE_PWA_CACHE
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'SKIP_WAITING')) {
    self.skipWaiting();
  }

  if (event.data && (event.data.type === 'INVALIDATE_PWA_CACHE' || event.data.type === 'INVALIDATE_ICON_CACHE')) {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cName) => {
            return caches.open(cName).then((cache) => {
              return cache.keys().then((requests) => {
                return Promise.all(
                  requests.map((request) => {
                    const u = request.url.toLowerCase();
                    if (
                      u.includes('manifest') ||
                      u.includes('logo') ||
                      u.includes('icon') ||
                      u.includes('favicon') ||
                      u.includes('pwa')
                    ) {
                      return cache.delete(request);
                    }
                  })
                );
              });
            });
          })
        );
      }).then(async () => {
        const allClients = await self.clients.matchAll({ type: 'window' });
        allClients.forEach((client) => {
          client.postMessage({ type: 'PWA_CACHE_INVALIDATED' });
        });
      })
    );
  }
});

// Activate event: clean up outdated caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
      .then(async () => {
        // Alerte tous les clients actifs (site, PWA, raccourcis installés) pour forcer le rafraîchissement
        const allClients = await self.clients.matchAll({ type: 'window' });
        allClients.forEach((client) => {
          client.postMessage({ type: 'NEW_VERSION_ACTIVATED' });
        });
      })
  );
});

// Fetch event: Network-first for HTML / navigation so updates are instant, Cache-first for images/static
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // STRICT REQUIREMENT: Only handle same-origin requests (static assets, app navigation).
  // NEVER intercept external APIs (Supabase, Firebase, Google, etc.) or cross-origin requests.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Never intercept API routes or authentication callbacks
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) {
    return;
  }

  // 1. NAVIGATION / HTML PAGES: NETWORK-FIRST STRATEGY
  // Crucial for PWA and shortcuts: always download fresh HTML when online so new features are applied immediately!
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => cached || caches.match(OFFLINE_URL));
        })
    );
    return;
  }

  // 2. WEB APP MANIFEST: NETWORK-FIRST STRATEGY
  // Crucial for Android installation dialog: always fetch the latest manifest & dynamic icons!
  if (url.pathname.includes('manifest')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. STATIC ASSETS & IMAGES: Cache first with background update
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          return new Response('', { status: 404, statusText: 'Not Found' });
        });
    })
  );
});
