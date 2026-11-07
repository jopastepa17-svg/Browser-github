/* Nex Browser 0.3 — офлайн-оболочка.
   Кэшируем только локальные файлы прототипа: шрифты Google идут с сети,
   без них интерфейс деградирует на системные Inter/Georgia. */
const CACHE = 'nex-v03-1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/hero-article.jpg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  // навигация: сеть, при офлайне — кэш
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('./index.html').then(r => r || new Response('', { status: 503 })))
    );
    return;
  }

  // локальные ресурсы: cache-first + фоновое обновление
  if (sameOrigin) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // внешние (шрифты): сеть, при ошибке — пустой ответ, чтобы не ломать рендер
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
