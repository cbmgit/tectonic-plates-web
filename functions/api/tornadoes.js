/**
 * Cloudflare Pages Function: /api/tornadoes
 * Fetches real-time active Tornado Warnings and Tornado Watches from NOAA / National Weather Service (NWS),
 * extracts warning polygons and centroid points, and caches at Cloudflare edge for 60 seconds.
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

  const NWS_URL = 'https://api.weather.gov/alerts/active?event=Tornado%20Warning,Tornado%20Watch';

  try {
    const nwsRes = await fetch(NWS_URL, {
      headers: {
        'Accept': 'application/geo+json, application/json',
        'User-Agent': 'TectonicPlatesMap/1.0 (Live Tornado Warnings; contact@tectonicplatemap.org)'
      }
    });

    if (!nwsRes.ok) {
      throw new Error(`NOAA NWS HTTP ${nwsRes.status}`);
    }

    const nwsData = await nwsRes.json();
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

      // If polygon geometry is available
      if (feat.geometry && (feat.geometry.type === 'Polygon' || feat.geometry.type === 'MultiPolygon')) {
        polygons.push({
          type: 'Feature',
          properties: normProps,
          geometry: feat.geometry
        });

        // Compute approx centroid
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
        cached_at: Date.now()
      }
    };

    response = new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
        'Access-Control-Allow-Origin': '*'
      }
    });

    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;

  } catch (err) {
    return new Response(JSON.stringify({
      polygons: { type: 'FeatureCollection', features: [] },
      lines: { type: 'FeatureCollection', features: [] },
      points: { type: 'FeatureCollection', features: [] },
      metadata: { error: err.message, active_count: 0, cached_at: Date.now() }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=30',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
