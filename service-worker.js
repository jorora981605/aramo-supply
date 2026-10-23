const CACHE_NAME = 'aramo-shell-v50-surtido-sucursales';
const CDN_CACHE = 'aramo-cdn-v1';
// Las páginas: al instalar se guardan junto con TODOS los archivos que cargan,
// tal cual los piden (con su ?v=…). Así cada pantalla abre sin esperar a internet.
const PAGINAS = ['./APP.html', './canasta.html', './pos/index.html', './index.html'];
const EXTRAS = ['./manifest.json', './canasta.webmanifest', './icon.png', './pos-vista.jpg', './canasta-fotos.js', './catalogo-productos.js', './supplier-base.js', './privacidad.html', './condiciones.html'];
// Librerías de afuera (nube, QR, letras): se guardan y se renuevan por detrás.
const CDN = /^https:\/\/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|cdn\.sheetjs\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

const fresco = url => new Request(url, { cache: 'reload' });
// src="…" y href="…" de una página que sean de este mismo sitio (sin plantillas ni anclas).
function archivosDe(html, base) {
  const L = new Set();
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const v = m[1];
    if (/[${}'+]|^(#|data:|mailto:|tel:|javascript:)/.test(v)) continue;
    try {
      const u = new URL(v, base);
      if (u.origin === self.location.origin && !u.pathname.endsWith('/')) L.add(u.href.split('#')[0]);
    } catch {}
  }
  return [...L];
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const todos = new Set(EXTRAS.map(u => new URL(u, self.location).href));
    for (const p of PAGINAS) {
      const url = new URL(p, self.location).href;
      const r = await fetch(fresco(url));
      if (!r.ok) throw new Error('No se pudo guardar ' + p);
      await cache.put(url, r.clone());
      archivosDe(await r.text(), url).forEach(u => todos.add(u));
    }
    PAGINAS.forEach(p => todos.delete(new URL(p, self.location).href));
    await Promise.all([...todos].map(async u => {
      const r = await fetch(fresco(u));
      if (r.ok) await cache.put(u, r);
    }));
  })());
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

// Calentar: fotos del Taller y archivos del POS que se cargan después, guardados por
// detrás para que al entrar ya estén. Solo baja lo que falta.
async function calentar() {
  const cache = await caches.open(CACHE_NAME);
  const quiero = new Set();
  const texto = async u => { try { const r = await (await cache.match(u) || fetch(u)); return r.ok ? await r.clone().text() : ''; } catch { return ''; } };
  const fotos = await texto(new URL('./canasta-fotos.js', self.location).href);
  for (const m of fotos.matchAll(/fotos\/[\w-]+\.webp/g)) quiero.add(new URL('./' + m[0], self.location).href);
  const pos = new URL('./pos/index.html', self.location).href;
  for (const u of archivosDe(await texto(pos), pos)) {
    if (!/\/assets\/index-[\w-]+\.js$/.test(u)) continue;
    for (const m of (await texto(u)).matchAll(/"\.\/([\w-]+\.(?:js|css))"/g)) quiero.add(new URL(m[1], u).href);
  }
  quiero.add(new URL('./pos/sql/sql-wasm-browser.wasm', self.location).href);
  for (const u of quiero) {
    if (await cache.match(u)) continue;
    try { const r = await fetch(u); if (r.ok) await cache.put(u, r); } catch {}
  }
}
self.addEventListener('message', event => {
  if (event.data && event.data.tipo === 'calentar') event.waitUntil(calentar());
});

// Avisos cuando el Taller está cerrado. El servidor de notificaciones puede
// mandar {title, body, url, tag}; si todavía no hay push configurado, la app
// sigue usando las notificaciones locales de aramo-nube.js.
self.addEventListener('push', event => {
  let d={};try{d=event.data?.json()||{};}catch{try{d={body:event.data?.text()||''};}catch{}}
  event.waitUntil(self.registration.showNotification(d.title||'ARAMO',{
    body:d.body||'Hay una actualización en tu pedido.',tag:d.tag||'aramo-pedido',renotify:true,icon:'./icon.png',badge:'./icon.png',data:{url:d.url||'./canasta.html'}
  }));
});
// Primero lo guardado (abre al instante); si falta, internet y se guarda.
// Lo nuevo llega con cada versión de este archivo: se instala por detrás y APP.html
// se recarga sola. "↻ Reiniciar" en la portada borra todo lo guardado y baja todo de nuevo.
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    if (CDN.test(request.url)) event.respondWith(deLaCdn(event, request));
    return;
  }

  event.respondWith((async () => {
    const pagina = request.mode === 'navigate';

    // Las páginas principales deben buscar primero la versión publicada. Así
    // una versión antigua del caché no puede ocultar una actualización del sitio.
    if (pagina) {
      try {
        const response = await fetch(new Request(request, { cache: 'no-store' }));
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)));
          return response;
        }
      } catch {}
      const guardado = await caches.match(request, { ignoreSearch: true });
      if (guardado) return guardado;
      return (await caches.match('./APP.html')) || Response.error();
    }

    const guardado = await caches.match(request);
    if (guardado) return guardado;
    try {
      const response = await fetch(request);
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)));
      }
      return response;
    } catch {
      const parecido = await caches.match(request, { ignoreSearch: true });
      if (parecido) return parecido;
      return Response.error();
    }
  })());
});

// Librerías de afuera: lo guardado al instante y se renueva por detrás.
// Se piden con CORS para poder revisar que vinieron bien antes de guardarlas.
async function deLaCdn(event, request) {
  const cache = await caches.open(CDN_CACHE);
  const guardado = await cache.match(request.url);
  const red = fetch(request.url, { mode: 'cors', credentials: 'omit' })
    .then(async r => { if (r.ok) await cache.put(request.url, r.clone()); return r; })
    .catch(() => fetch(request));
  if (guardado) { event.waitUntil(red.catch(() => {})); return guardado; }
  return red;
}

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
