const CACHE_NAME = 'mullet-pro-v33';
const ASSETS = [
  '/game.html',
  '/assets/mullet_icon_black_bg.png',
  '/images/14065C15-1E0F-4E93-96B0-A2B4D680271C.png',
  '/images/0B2DF6FF-31C8-449B-8FC4-CE39DDDEB71C.png',
  '/images/B80FFC9A-0F00-4244-9362-1447EEEBB6DB.png',
  '/images/D857460D-8FAD-4AE5-BA5A-D40EE8982533.png',
  '/images/6D40EEED-1471-4782-AFFA-BE9AAF5C1339.png',
  '/images/49EE54BC-BE4A-497F-9A3C-5EF2507899FF.png',
  '/images/5429AEDC-F23D-4E0F-99DB-E365E2AA2585.png',
  '/images/34E823F6-1B0B-4B0D-A747-DE6DB1C5A8BA.png',
  '/images/IMG_0412.png',
  '/images/IMG_0415.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
