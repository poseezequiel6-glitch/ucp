const CACHE_NAME = 'wave-v5.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css?v=5.0',
  './script.js?v=5.0',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) => cache.add(asset))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  // No interceptar peticiones de YouTube, audio preview, ni CDNs externos
  if (
    req.url.includes('youtube.com') ||
    req.url.includes('ytimg.com') ||
    req.url.includes('googlevideo.com') ||
    req.url.includes('invidious') ||
    req.url.includes('apple.com') ||
    req.url.includes('cdnjs') ||
    req.url.includes('fonts.googleapis') ||
    req.url.includes('fonts.gstatic')
  ) {
    return;
  }

  // Network-First para evitar que se rompa el CSS/JS en GitHub Pages
  event.respondWith(
    fetch(req)
      .then((networkResp) => {
        if (networkResp && networkResp.status === 200) {
          const respClone = networkResp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, respClone));
        }
        return networkResp;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === 'navigate') {
          const indexCached = await caches.match('./index.html');
          if (indexCached) return indexCached;
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
  );
});

