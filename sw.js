/**
 * Tectonic Plates Map - Progressive Web App Service Worker
 * Fully offline-capable geophysics explorer with Cache-First & Stale-While-Revalidate caching
 */

const CACHE_NAME = 'tectonic-plates-v0.5';
const CORE_ASSETS = [
  './',
  './index.html',
  './plates.html',
  './quiz.html',
  './what-plate-am-i-on.html',
  './worksheets.html',
  './methodology.html',
  './about.html',
  './contact.html',
  './privacy-policy.html',
  './terms-of-service.html',
  './maps/blank-tectonic-plates-map.html',
  './maps/continental-plates-map.html',
  './maps/labeled-tectonic-plates-map.html',
  './maps/plate-boundary-map.html',
  './css/bundle.min.css',
  './css/style.min.css',
  './js/core-ui.min.js',
  './js/data.min.js',
  './js/app.min.js',
  './js/phenomena.min.js',
  './js/earthquakes.min.js',
  './js/search.min.js',
  './js/cross-section.min.js',
  './js/comparison.min.js',
  './js/quiz.min.js',
  './js/what-plate.min.js',
  './js/worksheets.min.js',
  './manifest.json',
  './data/plates.json',
  './data/tectonic_plates.geojson',
  './data/tectonic_boundaries.geojson',
  './data/plate_velocities.geojson',
  './images/logo.svg',
  './images/icon-192.png',
  './images/icon-512.png',
  './images/icon-maskable.png',
  './favicon.svg',
  './favicon.ico',
  './vendor/bulma/bulma.min.css',
  './vendor/maplibre/maplibre-gl.css',
  './vendor/maplibre/maplibre-gl.js',
  './vendor/fontawesome/css/all.min.css',
  './vendor/fontawesome/webfonts/fa-solid-900.woff2',
  './vendor/fontawesome/webfonts/fa-regular-400.woff2',
  './vendor/fontawesome/webfonts/fa-brands-400.woff2'
];

// 1. Install Event: Pre-cache all local core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching core offline assets');
      return cache.addAll(CORE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up legacy caches and claim active clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Intelligent offline caching strategy
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET requests
  if (req.method !== 'GET') return;

  // A. Live Geophysical & Weather Feeds (USGS & /api/): Network-First with Cache fallback
  if (url.hostname.includes('earthquake.usgs.gov') || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match(req).then((cached) => {
            if (cached) return cached;
            // Fallback response if offline and not in cache
            return new Response(JSON.stringify({
              type: 'FeatureCollection',
              features: [],
              lines: { type: 'FeatureCollection', features: [] },
              points: { type: 'FeatureCollection', features: [] },
              polygons: { type: 'FeatureCollection', features: [] }
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // B. Basemap Tiles (Carto / Esri raster tiles): Cache-First with Dynamic Network Caching
  if (
    url.hostname.includes('basemaps.cartocdn.com') ||
    url.hostname.includes('arcgisonline.com') ||
    url.hostname.includes('demotiles.maplibre.org')
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const clone = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
            }
            return networkRes;
          })
          .catch(() => {
            // Return transparent 1x1 png or 404 gracefully if offline and tile not yet cached
            return new Response('', { status: 404, statusText: 'Offline tile unavailable' });
          });
      })
    );
    return;
  }

  // C. HTML Navigation Requests & Clean SPA Routes: Network-First with Cache Fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match(req, { ignoreSearch: true }).then((cached) => {
            if (cached) return cached;
            const path = url.pathname.replace(/\/+$/, '');
            const htmlKey = path ? `${path}.html` : './index.html';
            return caches.match(htmlKey, { ignoreSearch: true })
              .then((subMatch) => subMatch || caches.match('.' + htmlKey, { ignoreSearch: true }))
              .then((subMatch) => subMatch || caches.match('./index.html'));
          });
        })
    );
    return;
  }

  // D. Local App Files & Vendor Assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const fetchPromise = fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkRes;
      }).catch(() => null);

      if (cached) return cached;
      return fetchPromise.then((res) => {
        if (res) return res;
        return caches.match(req, { ignoreSearch: true });
      });
    }).catch(() => {
      // If HTML navigation fails, try resolving clean URL or return cached index.html
      if (req.mode === 'navigate') {
        const path = url.pathname.replace(/\/+$/, '');
        const htmlKey = path ? `${path}.html` : './index.html';
        return caches.match(htmlKey, { ignoreSearch: true })
          .then((subMatch) => subMatch || caches.match('.' + htmlKey, { ignoreSearch: true }))
          .then((subMatch) => subMatch || caches.match('./index.html'));
      }
    })
  );
});
