/**
 * Cloudflare Pages Function: /api/hurricanes
 * Fetches real-time active tropical cyclones and hurricanes from NOAA NHC (National Hurricane Center),
 * normalizes into MapLibre-ready GeoJSON FeatureCollections, and caches at Cloudflare edge for 5 minutes.
 */
export async function onRequest(context) {
  const { request } = context;
  const cacheUrl = new URL(request.url);
  const cacheKey = new Request(cacheUrl.toString(), request);
  const cache = caches.default;

  // 1. Check Cloudflare global edge cache
  let response = await cache.match(cacheKey);
  if (response) {
    return response;
  }

  const NHC_URL = 'https://www.nhc.noaa.gov/CurrentStorms.json';

  try {
    const nhcRes = await fetch(NHC_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TectonicPlatesMap/1.0 (Live Tropical Cyclones; contact@tectonicplatemap.org)'
      }
    });

    if (!nhcRes.ok) {
      throw new Error(`NOAA NHC HTTP ${nhcRes.status}`);
    }

    const nhcData = await nhcRes.json();
    const storms = (nhcData && Array.isArray(nhcData.activeStorms)) ? nhcData.activeStorms : [];

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

      const props = {
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
      };

      points.push({
        type: 'Feature',
        properties: props,
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
        cached_at: Date.now()
      }
    };

    response = new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*'
      }
    });

    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;

  } catch (err) {
    return new Response(JSON.stringify({
      lines: { type: 'FeatureCollection', features: [] },
      points: { type: 'FeatureCollection', features: [] },
      metadata: { error: err.message, cached_at: Date.now() }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
