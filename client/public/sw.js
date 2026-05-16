/**
 * My-Skoolz Service Worker
 * Strategy:
 *  - Static assets (JS/CSS bundles, fonts, images): Cache-first, update in background
 *  - Navigation requests (HTML pages): Network-first, fallback to /index.html
 *  - API calls (/api/*): Network-only (never cache dynamic data)
 */

const CACHE_VERSION = 'myskoolz-v2';
const OFFLINE_URL   = '/offline.html';

const PRECACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/logo.svg',
];

/* ── Install ─────────────────────────────────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

/* ── Activate (clean up old caches) ─────────────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch ───────────────────────────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin or CDN requests; skip chrome-extension, data URIs, etc.
  if (request.method !== 'GET') return;

  // API calls — always go to network (never serve stale data)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('api.resend') || url.hostname.includes('callmebot')) {
    return;
  }

  // Navigation requests — network first, fall back to cached /index.html (SPA routing)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match('/index.html').then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Static assets — cache first, update in background (stale-while-revalidate)
  event.respondWith(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => null);

        return cached || networkFetch;
      })
    )
  );
});

/* ── Push notifications (future use) ────────────────────────────── */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'My-Skoolz', {
      body:  data.body  || '',
      icon:  '/logo.svg',
      badge: '/logo.svg',
      data:  data.url ? { url: data.url } : {},
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data?.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});
