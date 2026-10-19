const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8088;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.map': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const zlib = require('zlib');

// In-memory caches for USGS Earthquakes by time window
let quakeCaches = {
  30: { data: null, timestamp: 0 },
  60: { data: null, timestamp: 0 },
  90: { data: null, timestamp: 0 },
  365: { data: null, timestamp: 0 }
};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for 30d
const CACHE_TTL_EXTENDED_MS = 15 * 60 * 1000; // 15 minutes for 60d/90d

// In-memory 5-minute cache for NOAA NHC Hurricanes
let hurricaneCache = {
  data: null,
  timestamp: 0
};

// In-memory 1-minute cache for NOAA NWS Tornado Alerts
let tornadoCache = {
  data: null,
  timestamp: 0
};
const TORNADO_CACHE_TTL_MS = 60 * 1000; // 1 minute

async function getEarthquakesData(days = 30) {
  const validDays = [30, 60, 90, 365].includes(days) ? days : 30;
  const cacheObj = quakeCaches[validDays] || { data: null, timestamp: 0 };
  const now = Date.now();
  const ttl = validDays > 30 ? CACHE_TTL_EXTENDED_MS : CACHE_TTL_MS;

  if (cacheObj.data && (now - cacheObj.timestamp < ttl)) {
    return { data: cacheObj.data, stale: false, cachedAt: cacheObj.timestamp };
  }

  let USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson';
  if (validDays > 30) {
    const startIso = new Date(now - validDays * 86400000).toISOString().split('T')[0];
    const minMag = validDays >= 365 ? 4.5 : 2.5;
    USGS_URL = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startIso}&minmagnitude=${minMag}`;
  }

  try {
    const res = await fetch(USGS_URL, {
      headers: { 'Accept': 'application/geo+json, application/json' }
    });
    if (!res.ok) throw new Error(`USGS HTTP ${res.status}`);
    const json = await res.json();

    // Normalize depth to properties.depth
    if (json && Array.isArray(json.features)) {
      for (let i = 0; i < json.features.length; i++) {
        const feat = json.features[i];
        feat.properties = feat.properties || {};
        if (feat.geometry && Array.isArray(feat.geometry.coordinates)) {
          feat.properties.depth = typeof feat.geometry.coordinates[2] === 'number'
            ? feat.geometry.coordinates[2]
            : 0;
        }
      }
    }
    json.metadata = json.metadata || {};
    json.metadata.cached_at = now;
    json.metadata.days = validDays;

    cacheObj.data = json;
    cacheObj.timestamp = now;
    quakeCaches[validDays] = cacheObj;
    return { data: json, stale: false, cachedAt: now };
  } catch (err) {
    console.warn(`[server.js] USGS live fetch (${validDays}d) failed, serving cached/snapshot fallback:`, err.message);
    if (cacheObj.data) {
      return { data: cacheObj.data, stale: true, cachedAt: cacheObj.timestamp };
    }
    const snapshotPath = path.join(__dirname, 'data', 'earthquakes_snapshot.geojson');
    if (fs.existsSync(snapshotPath)) {
      try {
        const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
        if (snapshot.features) {
          for (const f of snapshot.features) {
            if (f.geometry && Array.isArray(f.geometry.coordinates)) {
              f.properties.depth = f.geometry.coordinates[2] ?? 0;
            }
          }
        }
        snapshot.metadata = snapshot.metadata || {};
        snapshot.metadata.cached_at = fs.statSync(snapshotPath).mtimeMs;
        cacheObj.data = snapshot;
        cacheObj.timestamp = snapshot.metadata.cached_at;
        quakeCaches[validDays] = cacheObj;
        return { data: snapshot, stale: true, cachedAt: cacheObj.timestamp };
      } catch (e) {
        console.error('[server.js] Snapshot fallback failed:', e);
      }
    }
    throw err;
  }
}

async function getHurricanesData() {
  const now = Date.now();
  if (hurricaneCache.data && (now - hurricaneCache.timestamp < CACHE_TTL_MS)) {
    return { data: hurricaneCache.data, stale: false, cachedAt: hurricaneCache.timestamp };
  }

  const NHC_URL = 'https://www.nhc.noaa.gov/CurrentStorms.json';
  try {
    const res = await fetch(NHC_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TectonicPlatesMap/1.0 (Live Tropical Cyclones; contact@tectonicplatemap.org)'
      }
    });
    if (!res.ok) throw new Error(`NOAA NHC HTTP ${res.status}`);
    const data = await res.json();
    const storms = (data && Array.isArray(data.activeStorms)) ? data.activeStorms : [];

    const points = [];
    const lines = [];

    for (let i = 0; i < storms.length; i++) {
      const s = storms[i];
      const lng = typeof s.longitudeNumeric === 'number' ? s.longitudeNumeric : parseFloat(s.longitudeNumeric);
      const lat = typeof s.latitudeNumeric === 'number' ? s.latitudeNumeric : parseFloat(s.latitudeNumeric);
      if (isNaN(lng) || isNaN(lat)) continue;

      const knots = parseInt(s.intensity, 10) || 0;
      let cat = 'TS';
      let color = '#00d2d3';
      if (knots >= 137) { cat = 'Cat 5'; color = '#800000'; }
      else if (knots >= 113) { cat = 'Cat 4'; color = '#ff0000'; }
      else if (knots >= 96) { cat = 'Cat 3'; color = '#ff9800'; }
      else if (knots >= 83) { cat = 'Cat 2'; color = '#ffc107'; }
      else if (knots >= 64) { cat = 'Cat 1'; color = '#ffeb3b'; }
      else if (knots >= 34) { cat = 'TS'; color = '#00d2d3'; }
      else { cat = 'TD'; color = '#38bdf8'; }

      const rawName = s.name || s.id || 'Tropical Cyclone';
      const prefix = s.classification === 'HU' ? 'Hurricane ' : (s.classification === 'TS' ? 'Tropical Storm ' : (s.classification === 'TD' ? 'Tropical Depression ' : ''));
      const stormName = rawName.toLowerCase().startsWith('hurricane') || rawName.toLowerCase().startsWith('tropical') ? rawName : `${prefix}${rawName}`.trim();
      const windsMph = Math.round(knots * 1.15078);
      const windsKmh = Math.round(knots * 1.852);

      points.push({
        type: 'Feature',
        properties: {
          id: s.id || `storm_${i}`,
          name: stormName,
          category: cat,
          classification: s.classification,
          color: color,
          max_winds: `${windsMph} mph (${windsKmh} km/h)`,
          winds: `${windsMph} mph (${windsKmh} km/h)`,
          knots: knots,
          pressure: (s.pressure && s.pressure !== 'N/A') ? `${s.pressure} mbar` : 'N/A',
          movement: (s.movementSpeed !== undefined && s.movementSpeed !== null && s.movementSpeed !== '') ? `${s.movementSpeed} mph toward ${s.movementDir || 0}°` : 'Stationary',
          last_update: s.lastUpdate || new Date().toISOString(),
          advisory_url: (s.publicAdvisory && s.publicAdvisory.url) || '',
          graphics_url: (s.forecastGraphics && s.forecastGraphics.url) || '',
          is_live: true
        },
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      });
    }

    const payload = {
      lines: { type: 'FeatureCollection', features: lines },
      points: { type: 'FeatureCollection', features: points },
      metadata: {
        source: 'NOAA National Hurricane Center (NHC)',
        active_count: points.length,
        cached_at: now
      }
    };

    hurricaneCache.data = payload;
    hurricaneCache.timestamp = now;
    return { data: payload, stale: false, cachedAt: now };
  } catch (err) {
    console.warn('[server.js] NOAA NHC fetch failed:', err.message);
    if (hurricaneCache.data) {
      return { data: hurricaneCache.data, stale: true, cachedAt: hurricaneCache.timestamp };
    }
    return {
      data: {
        lines: { type: 'FeatureCollection', features: [] },
        points: { type: 'FeatureCollection', features: [] },
        metadata: { error: err.message, active_count: 0, cached_at: now }
      },
      stale: true,
      cachedAt: now
    };
  }
}

async function getTornadoesData() {
  const now = Date.now();
  if (tornadoCache.data && (now - tornadoCache.timestamp < TORNADO_CACHE_TTL_MS)) {
    return { data: tornadoCache.data, stale: false, cachedAt: tornadoCache.timestamp };
  }

  const NWS_URL = 'https://api.weather.gov/alerts/active?event=Tornado%20Warning,Tornado%20Watch';
  try {
    const res = await fetch(NWS_URL, {
      headers: {
        'Accept': 'application/geo+json, application/json',
        'User-Agent': 'TectonicPlatesMap/1.0 (Live Tornado Warnings; contact@tectonicplatemap.org)'
      }
    });
    if (!res.ok) throw new Error(`NOAA NWS HTTP ${res.status}`);
    const nwsData = await res.json();
    const rawFeatures = (nwsData && Array.isArray(nwsData.features)) ? nwsData.features : [];

    const polygons = [];
    const points = [];
    const lines = [];

    for (let i = 0; i < rawFeatures.length; i++) {
      const feat = rawFeatures[i];
      const p = feat.properties || {};
      const isWarning = (p.event || '').toLowerCase().includes('warning');
      const eventType = isWarning ? 'Tornado Warning' : 'Tornado Watch';
      const color = isWarning ? '#ef4444' : '#f59e0b';

      const normProps = {
        id: feat.id || `torn_${i}`,
        name: p.headline || eventType,
        event: eventType,
        is_warning: isWarning,
        color: color,
        severity: p.severity || 'Severe',
        urgency: p.urgency || 'Immediate',
        certainty: p.certainty || 'Observed',
        area_desc: p.areaDesc || 'Active Alert Area',
        headline: p.headline || `${eventType} in effect`,
        description: p.description || '',
        instruction: p.instruction || 'Take shelter now in a basement or sturdy interior room.',
        effective: p.effective,
        expires: p.expires,
        sender_name: p.senderName || 'National Weather Service',
        is_live: true
      };

      if (feat.geometry && (feat.geometry.type === 'Polygon' || feat.geometry.type === 'MultiPolygon')) {
        polygons.push({
          type: 'Feature',
          properties: normProps,
          geometry: feat.geometry
        });

        let cLng = 0, cLat = 0, ptCount = 0;
        function sumCoords(arr) {
          if (typeof arr[0] === 'number') {
            cLng += arr[0];
            cLat += arr[1];
            ptCount++;
          } else {
            for (let sub of arr) sumCoords(sub);
          }
        }
        sumCoords(feat.geometry.coordinates);

        if (ptCount > 0) {
          points.push({
            type: 'Feature',
            properties: normProps,
            geometry: {
              type: 'Point',
              coordinates: [cLng / ptCount, cLat / ptCount]
            }
          });
        }
      }
    }

    const payload = {
      polygons: { type: 'FeatureCollection', features: polygons },
      lines: { type: 'FeatureCollection', features: lines },
      points: { type: 'FeatureCollection', features: points },
      metadata: {
        source: 'NOAA National Weather Service (NWS)',
        active_count: polygons.length,
        warning_count: polygons.filter(f => f.properties.is_warning).length,
        watch_count: polygons.filter(f => !f.properties.is_warning).length,
        cached_at: now
      }
    };

    tornadoCache.data = payload;
    tornadoCache.timestamp = now;
    return { data: payload, stale: false, cachedAt: now };
  } catch (err) {
    console.warn('[server.js] NOAA NWS fetch failed:', err.message);
    if (tornadoCache.data) {
      return { data: tornadoCache.data, stale: true, cachedAt: tornadoCache.timestamp };
    }
    return {
      data: {
        polygons: { type: 'FeatureCollection', features: [] },
        lines: { type: 'FeatureCollection', features: [] },
        points: { type: 'FeatureCollection', features: [] },
        metadata: { error: err.message, active_count: 0, cached_at: now }
      },
      stale: true,
      cachedAt: now
    };
  }
}

const server = http.createServer(async (req, res) => {
  let reqUrl = req.url.split('?')[0];

  // API Route: Live USGS Earthquakes (5-minute / 15-minute multi-window cache)
  if (reqUrl === '/api/earthquakes' || reqUrl === '/api/earthquakes/') {
    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const daysParam = parseInt(parsedUrl.searchParams.get('days') || '30', 10);
      const validDays = [30, 60, 90, 365].includes(daysParam) ? daysParam : 30;
      const { data, stale, cachedAt } = await getEarthquakesData(validDays);
      sendJsonResponse(req, res, data, stale, cachedAt, validDays > 30 ? 900 : 300);
    } catch (err) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Earthquake data feed unavailable', message: err.message }));
    }
    return;
  }

  // API Route: Live NOAA NHC Hurricanes (5-minute cache)
  if (reqUrl === '/api/hurricanes' || reqUrl === '/api/hurricanes/') {
    try {
      const { data, stale, cachedAt } = await getHurricanesData();
      sendJsonResponse(req, res, data, stale, cachedAt, 300);
    } catch (err) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Hurricane data feed unavailable', message: err.message }));
    }
    return;
  }

  // API Route: Live NOAA NWS Tornado Warnings & Watches (1-minute cache)
  if (reqUrl === '/api/tornadoes' || reqUrl === '/api/tornadoes/') {
    try {
      const { data, stale, cachedAt } = await getTornadoesData();
      sendJsonResponse(req, res, data, stale, cachedAt, 60);
    } catch (err) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Tornado data feed unavailable', message: err.message }));
    }
    return;
  }

  function sendJsonResponse(request, response, data, stale, cachedAt, maxAge) {
    const payload = JSON.stringify(data);
    const acceptEncoding = request.headers['accept-encoding'] || '';

    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    response.setHeader('X-Cache-Status', stale ? 'STALE' : 'HIT_OR_FRESH');
    response.setHeader('X-Cached-At', new Date(cachedAt).toISOString());

    const payloadBuffer = Buffer.from(payload);

    if (acceptEncoding.includes('br')) {
      zlib.brotliCompress(payloadBuffer, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 6,
          [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT
        }
      }, (err, brotlied) => {
        if (!err && brotlied) {
          response.writeHead(200, { 'Content-Encoding': 'br' });
          response.end(brotlied);
        } else {
          response.writeHead(200);
          response.end(payloadBuffer);
        }
      });
    } else if (acceptEncoding.includes('gzip')) {
      zlib.gzip(payloadBuffer, (err, zipped) => {
        if (!err && zipped) {
          response.writeHead(200, { 'Content-Encoding': 'gzip' });
          response.end(zipped);
        } else {
          response.writeHead(200);
          response.end(payloadBuffer);
        }
      });
    } else {
      response.writeHead(200);
      response.end(payloadBuffer);
    }
  }

  if (reqUrl === '/' || reqUrl === '') reqUrl = '/index.html';

  // 301 Redirect direct .html requests to clean URLs
  if (reqUrl.endsWith('.html') && reqUrl !== '/index.html') {
    const cleanPath = reqUrl.replace(/\.html$/, '');
    const qIdx = req.url.indexOf('?');
    const queryString = qIdx !== -1 ? req.url.slice(qIdx) : '';
    res.writeHead(301, { 'Location': cleanPath + queryString });
    res.end();
    return;
  }

  const cleanRoutes = ['/earthquakes', '/volcanoes', '/hurricanes', '/tornadoes', '/northern-lights', '/ocean-trenches', '/impact-craters'];
  const normalizedPath = reqUrl.length > 1 ? reqUrl.replace(/\/+$/, '') : reqUrl;
  if (cleanRoutes.includes(normalizedPath)) {
    reqUrl = '/index.html';
  } else if (!path.extname(normalizedPath) && fs.existsSync(path.join(__dirname, normalizedPath + '.html'))) {
    reqUrl = normalizedPath + '.html';
  }

  const resolvedRoot = path.resolve(__dirname);
  const resolvedPath = path.resolve(path.join(__dirname, reqUrl));

  // Security: Prevent Directory Traversal and access to sensitive server files / dotfiles
  const baseName = path.basename(resolvedPath);
  if (!resolvedPath.startsWith(resolvedRoot) || baseName.startsWith('.') || baseName === 'server.js' || baseName === 'package.json' || baseName === 'package-lock.json') {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  const filePath = resolvedPath;

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    const acceptEncoding = req.headers['accept-encoding'] || '';

    const isCompressible = /\.(html|css|js|json|geojson|svg|xml|txt)$/i.test(ext);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);

    // Cache-control: static vendor and images get long cache, app logic gets must-revalidate
    if (reqUrl.includes('/vendor/') || reqUrl.includes('/images/') || reqUrl.includes('/webfonts/')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }

    // Direct serving of pre-compressed Brotli or Gzip assets
    const brPath = filePath + '.br';
    const gzPath = filePath + '.gz';

    if (isCompressible && acceptEncoding.includes('br') && fs.existsSync(brPath)) {
      res.writeHead(200, { 'Content-Encoding': 'br' });
      fs.createReadStream(brPath).pipe(res);
    } else if (isCompressible && acceptEncoding.includes('gzip') && fs.existsSync(gzPath)) {
      res.writeHead(200, { 'Content-Encoding': 'gzip' });
      fs.createReadStream(gzPath).pipe(res);
    } else if (isCompressible && acceptEncoding.includes('gzip')) {
      res.writeHead(200, { 'Content-Encoding': 'gzip' });
      fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(res);
    } else {
      res.writeHead(200);
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running at http://127.0.0.1:${PORT}/`);
});
