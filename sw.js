const CACHE_NAME = 'wave-v4.3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css?v=4.3',
  './script.js?v=4.3',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache error (sw.js):', err);
      });
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
  
  // No interceptar peticiones no HTTP/GET o de YouTube iframe
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  if (req.url.includes('youtube.com') || req.url.includes('ytimg.com') || req.url.includes('googlevideo.com')) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedResp) => {
      if (cachedResp) {
        // En segundo plano revalidar recursos estáticos
        fetch(req).then((netResp) => {
          if (netResp && netResp.status === 200 && netResp.type === 'basic') {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, netResp));
          }
        }).catch(() => {});
        return cachedResp;
      }

      return fetch(req).then((netResp) => {
        if (netResp && netResp.status === 200 && (req.url.endsWith('.css') || req.url.endsWith('.js') || req.url.endsWith('.svg') || req.url.endsWith('.png'))) {
          const respClone = netResp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, respClone));
        }
        return netResp;
      }).catch(() => {
        // Si estamos totalmente offline y piden navegación, devolver index.html
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
