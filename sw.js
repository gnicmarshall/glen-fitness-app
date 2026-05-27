const CACHE_NAME = 'fitplan-v1';
const URLS = ['/', '/index.html', '/css/app.css', '/js/data.js', '/js/app.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(URLS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
