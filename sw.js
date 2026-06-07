/* Blue Sword Energy — service worker
   Caches the app shell so the site works offline and is installable. */
const CACHE = 'bse-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './icon-apple-180.png',
  './favicon-32.png'
];

// Pre-cache the shell on install
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

// Clean up old caches on activate
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Navigations: network-first (fresh content when online, cached fallback offline)
// Other assets: cache-first
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      // cache same-origin successful responses
      if (res && res.status === 200 && req.url.startsWith(self.location.origin)) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => cached))
  );
});
