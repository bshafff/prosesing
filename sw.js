const CACHE_NAME = 'awb-processing-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './core.js',
  './app.js',
  './home.html',
  './lks.html',
  './dashboard-panen.html',
  './dashboard-mika.html',
  './rekap-panen.html',
  './stok-mika.html',
  './mod-dashboard-panen.js',
  './mod-dashboard-mika.js',
  './mod-lks.js',
  './mod-rekap-panen.js',
  './mod-stok-mika.js',
  './manifest.json',
  './logo-awb.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS).catch(err => console.warn('Cache addAll partial:', err)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/exec')) return; // Apps Script tidak di-cache
  if (url.search && url.search.includes('callback=')) return; // JSONP tidak di-cache

  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
