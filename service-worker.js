const CACHE_NAME = 'aramo-shell-v31';
const APP_SHELL = ['./APP.html', './index.html', './manifest.json', './icon.png', './pos-vista.jpg', './catalogo-productos.js', './supplier-base.js', './express.js', './express.css', './puerta.js', './puerta.css', './portadas.js', './portadas.css', './aramo-nube.js', './canasta-config.js', './canasta.html', './canasta.js', './canasta.css', './canasta.webmanifest'];

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

// Primero internet (siempre lo más nuevo); sin conexión, lo guardado.
// Los archivos se piden con ?v=… y se buscan también sin esa marca. Una página
// que no esté guardada cae en APP.html; un script o estilo nunca recibe HTML.
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request) || await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (request.mode === 'navigate') return (await caches.match('./APP.html')) || Response.error();
        return Response.error();
      })
  );
});

// Tocar una notificación de ARAMO abre la app justo en ese pedido.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './APP.html';
  const ver = url.match(/#ver=(.+)$/);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const base = url.split('#')[0];
      for (const c of list) {
        if (c.url.split('#')[0] === base && 'focus' in c) {
          if (ver) c.postMessage({ tipo: 'abrir', id: ver[1] });
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
