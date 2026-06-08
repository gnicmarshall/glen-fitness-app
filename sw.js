const CACHE_NAME = 'fitplan-v13';
const URLS = [
  '/glen-fitness-app/',
  '/glen-fitness-app/index.html',
  '/glen-fitness-app/css/app.css',
  '/glen-fitness-app/js/data.js',
  '/glen-fitness-app/js/app.js',
  '/glen-fitness-app/js/cloud.js'
];

// Activate the new worker immediately instead of waiting for old tabs to close.
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(URLS)));
});

// Clean out old caches and take control of open pages right away.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: serve from cache instantly (fast + offline), but
// fetch a fresh copy in the background so the NEXT load reflects new deploys.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(e.request).then(cached => {
        const network = fetch(e.request).then(resp => {
          if (resp && resp.status === 200 && resp.type === 'basic') cache.put(e.request, resp.clone());
          return resp;
        }).catch(() => cached);
        return cached || network;
      })
    )
  );
});
