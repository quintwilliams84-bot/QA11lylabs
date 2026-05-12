// I Got You demo PWA service worker
// Cache strategy:
//   - Precache the app shell (HTML, manifest, icons) on install.
//   - Network-first for navigation requests, with offline fallback to the shell.
//   - Stale-while-revalidate for built JS/CSS assets so updated builds eventually appear.
//   - Network-first (no cache) for the demo API so we never show stale rides.

const CACHE_VERSION = 'v3-2026-01-19';
const SHELL_CACHE = `igotyou-shell-${CACHE_VERSION}`;
const ASSETS_CACHE = `igotyou-assets-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        cache.addAll(
          SHELL_ASSETS.map((url) => new Request(url, { cache: 'reload' })),
        ),
      )
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key !== SHELL_CACHE && key !== ASSETS_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isApiRequest(url) {
  return url.pathname.includes('/igotyou-demo-api/');
}

function isAssetRequest(request) {
  return (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Never intercept demo API calls — we want fresh dispatch data.
  if (isApiRequest(url)) {
    return;
  }

  // Navigation requests: network-first with offline fallback to the cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('./index.html', copy)).catch(() => {});
          return response;
        })
        .catch(async () => {
          const cached =
            (await caches.match(request)) ||
            (await caches.match('./index.html')) ||
            (await caches.match('./'));
          if (cached) return cached;
          return new Response(
            '<!doctype html><meta charset="utf-8"><title>I Got You — offline</title>' +
              '<style>body{font-family:system-ui,Arial,sans-serif;padding:2rem;background:#061a38;color:#fff;line-height:1.6}h1{color:#FFD43B;font-size:2rem;margin-bottom:1rem}a{color:#FFD43B;font-weight:bold}</style>' +
              '<h1>You\u2019re offline</h1>' +
              '<p>The I Got You demo couldn\u2019t reach the network. Reconnect and reload to continue.</p>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 },
          );
        }),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  if (isAssetRequest(request)) {
    event.respondWith(
      caches.open(ASSETS_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (response && response.status === 200 && response.type !== 'opaque') {
              cache.put(request, response.clone()).catch(() => {});
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkPromise;
      }),
    );
    return;
  }

  // Default: try cache, fall through to network.
  event.respondWith(
    caches
      .match(request)
      .then((cached) => cached || fetch(request).catch(() => cached)),
  );
});
