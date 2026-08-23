const CACHE_NAME = 'mullet-pro-v88';

// The game itself. Kept out of PRECACHE deliberately — see the fetch handler.
const PAGE = '/game.html';

// Static art. These only ever change when the file itself is replaced, so
// serving them straight from the cache is free and correct.
const PRECACHE = [
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
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
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

// The game is served NETWORK FIRST; everything else stays cache first.
//
// This used to be cache-first for everything, game.html included, and that
// made every deploy take TWO reloads to become visible. The sequence was:
//
//   reload 1  the old worker answers the navigation out of its cache, so the
//             OLD game renders. Only afterwards does the browser notice
//             service-worker.js changed, install the new one, and claim.
//   reload 2  the new worker answers, and the new game finally renders.
//
// So anyone who reloaded once and looked was always seeing the previous
// build. Bumping CACHE_NAME did not help: the bump is what triggers the
// install, and the install happens after the page it was meant to update has
// already been served.
//
// Network first for the page fixes it — one reload, current build — and the
// cached copy is kept up to date behind it so the game still opens offline.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isPage = req.mode === 'navigate' ||
                 (url.origin === self.location.origin && url.pathname === PAGE);

  if (isPage) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(PAGE, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(PAGE).then(c => c || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
