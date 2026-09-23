const CACHE_NAME = 'awb-processing-v2';

// Sertakan path root DAN path assets/ supaya tahan salah taruh file.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './logo-awb.png',
  './icon-192.png',
  './icon-512.png',
  './assets/logo-awb.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Tambahkan satu per satu. File yang tidak ada JANGAN gagalkan install.
      return Promise.all(
        APP_SHELL.map(url =>
          cache.add(url).catch(err => console.warn('[SW] skip cache', url, err.message))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Abaikan non-GET & lintas origin (termasuk Apps Script).
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Navigasi: network first, fallback ke cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(c => c.put('./index.html', copy));
          return response;
        })
        .catch(() =>
          caches.match('./index.html').then(r => r || caches.match('./'))
        )
    );
    return;
  }

  // Aset statis: cache first, lalu network.
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, copy));
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// Dukung update versi SW dari halaman.
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
