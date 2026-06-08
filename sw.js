const CACHE_NAME = 'fitplan-v9';
const URLS = [
  '/glen-fitness-app/',
  '/glen-fitness-app/index.html',
  '/glen-fitness-app/css/app.css',
  '/glen-fitness-app/js/data.js',
  '/glen-fitness-app/js/app.js',
  '/glen-fitness-app/js/cloud.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(URLS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
