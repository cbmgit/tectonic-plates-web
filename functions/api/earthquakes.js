/**
 * Cloudflare Pages Function: /api/earthquakes
 * Fetches USGS 30-day feed (M2.5+), normalizes depth into properties,
 * and caches at Cloudflare edge for 5 minutes (300 seconds).
 */
export async function onRequest(context) {
  const { request } = context;
  const cacheUrl = new URL(request.url);
  const cacheKey = new Request(cacheUrl.toString(), request);
  const cache = caches.default;

  // 1. Check Cloudflare global edge cache first
  let response = await cache.match(cacheKey);
  if (response) {
    return response;
  }

  const daysParam = parseInt(cacheUrl.searchParams.get('days') || '30', 10);
  const days = [30, 60, 90, 365].includes(daysParam) ? daysParam : 30;

  let USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson';
  if (days > 30) {
    const startIso = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const minMag = days >= 365 ? 4.5 : 2.5;
    USGS_URL = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startIso}&minmagnitude=${minMag}`;
  }

  try {
    const usgsRes = await fetch(USGS_URL, {
      headers: { 'Accept': 'application/geo+json, application/json' }
    });

    if (!usgsRes.ok) {
      throw new Error(`USGS HTTP ${usgsRes.status}`);
    }

    const geojson = await usgsRes.json();

    // 2. Preprocess: normalize coordinates[2] to properties.depth for MapLibre GL expressions
    if (geojson && Array.isArray(geojson.features)) {
      for (let i = 0; i < geojson.features.length; i++) {
        const feat = geojson.features[i];
        feat.properties = feat.properties || {};
        if (feat.geometry && Array.isArray(feat.geometry.coordinates)) {
          feat.properties.depth = typeof feat.geometry.coordinates[2] === 'number'
            ? feat.geometry.coordinates[2]
            : 0;
        }
      }
    }

    geojson.metadata = geojson.metadata || {};
    geojson.metadata.cached_at = Date.now();

    // 3. Construct response with 5-minute CDN edge cache
    response = new Response(JSON.stringify(geojson), {
      status: 200,
      headers: {
        'Content-Type': 'application/geo+json; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*'
      }
    });

    // 4. Save to Cloudflare edge cache asynchronously
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;

  } catch (err) {
    return new Response(JSON.stringify({
      error: 'USGS feed unavailable',
      fallback: true,
      message: err.message
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
