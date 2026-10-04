const CACHE_NAME = 'aramo-shell-v15';
const APP_SHELL = ['./APP.html', './manifest.json', './icon.png', './catalogo-productos.js', './supplier-base.js', './express.js', './express.css', './puerta.js', './puerta.css', './aramo-nube.js', './canasta-config.js', './canasta.html', './canasta.js', './canasta.css', './canasta.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('aramo-shell-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('./APP.html')))
  );
});
