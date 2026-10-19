/**
 * Tectonic Plates Map - Earth Phenomena Explorer Subsystem (Lazy-Loaded Module)
 * Handles Volcanoes, Hurricanes, Northern/Southern Lights, Ocean Trenches,
 * Impact Craters, Canvas Symbol Rasterization, Mode Legends, and Filter UI.
 */
(function () {
  'use strict';

  const TPM = window.TPM;
  if (!TPM) {
    console.error('[TPM_Phenomena] Core TPM namespace not found');
    return;
  }

  // --- Filter Data Extractors ---
  function getVolcanoesDataByFilter(filterKey) {
    if (!window.TECTONIC_DATA || !window.TECTONIC_DATA.volcanoes) {
      return { type: 'FeatureCollection', features: [] };
    }
    const all = window.TECTONIC_DATA.volcanoes.features;
    const currentYear = new Date().getFullYear();
    if (filterKey === 'last_year') {
      return { type: 'FeatureCollection', features: all.filter(f => f.properties.last_eruption_year >= currentYear - 1) };
    } else if (filterKey === 'last_100') {
      return { type: 'FeatureCollection', features: all.filter(f => f.properties.last_eruption_year >= currentYear - 100) };
    }
    return { type: 'FeatureCollection', features: all };
  }

  let isFetchingLiveHurricanes = false;
  function fetchLiveHurricanes(force = false) {
    if (isFetchingLiveHurricanes && !force && window.TECTONIC_DATA?.hurricaneSeasons?.active) {
      return Promise.resolve(window.TECTONIC_DATA.hurricaneSeasons.active);
    }
    isFetchingLiveHurricanes = true;
    const cacheBuster = force ? `?_t=${Date.now()}` : '';

    return fetch(`/api/hurricanes${cacheBuster}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .catch(() => {
        return fetch(`https://www.nhc.noaa.gov/CurrentStorms.json${cacheBuster}`, {
          headers: { 'Accept': 'application/json' }
        })
          .then(r => r.json())
          .then(data => {
            const storms = (data && Array.isArray(data.activeStorms)) ? data.activeStorms : [];
            const points = [];
            for (let s of storms) {
              const lng = typeof s.longitudeNumeric === 'number' ? s.longitudeNumeric : parseFloat(s.longitudeNumeric);
              const lat = typeof s.latitudeNumeric === 'number' ? s.latitudeNumeric : parseFloat(s.latitudeNumeric);
              if (isNaN(lng) || isNaN(lat)) continue;

              const knots = parseInt(s.intensity, 10) || 0;
              let cat = 'TS', color = '#00d2d3';
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
                  id: s.id,
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
                geometry: { type: 'Point', coordinates: [lng, lat] }
              });
            }
            return {
              lines: { type: 'FeatureCollection', features: [] },
              points: { type: 'FeatureCollection', features: points },
              metadata: { active_count: points.length }
            };
          });
      })
      .then(result => {
        isFetchingLiveHurricanes = false;
        if (!window.TECTONIC_DATA) window.TECTONIC_DATA = {};
        if (!window.TECTONIC_DATA.hurricaneSeasons) window.TECTONIC_DATA.hurricaneSeasons = {};
        window.TECTONIC_DATA.hurricaneSeasons.active = {
          lines: result.lines || { type: 'FeatureCollection', features: [] },
          points: result.points || { type: 'FeatureCollection', features: [] },
          metadata: result.metadata || {}
        };
        if (TPM.state.currentHurricaneFilter === 'active' || !window.TECTONIC_DATA.hurricanePoints) {
          window.TECTONIC_DATA.hurricanePoints = window.TECTONIC_DATA.hurricaneSeasons.active.points;
          window.TECTONIC_DATA.hurricanes = window.TECTONIC_DATA.hurricaneSeasons.active.lines;
        }
        return window.TECTONIC_DATA.hurricaneSeasons.active;
      })
      .catch(err => {
        isFetchingLiveHurricanes = false;
        console.warn('[LiveHurricanes] Fetch error:', err);
        return {
          lines: { type: 'FeatureCollection', features: [] },
          points: { type: 'FeatureCollection', features: [] }
        };
      });
  }

  function getHurricanesDataByFilter(seasonKey) {
    const seasons = (window.TECTONIC_DATA && window.TECTONIC_DATA.hurricaneSeasons) || {};
    const s = seasons[seasonKey] || seasons['2024'] || {
      lines: { type: 'FeatureCollection', features: [] },
      points: { type: 'FeatureCollection', features: [] }
    };
    return s;
  }

  let isFetchingLiveTornadoes = false;
  function fetchLiveTornadoes(force = false) {
    if (isFetchingLiveTornadoes && !force && window.TECTONIC_DATA?.tornadoesSeasons?.active) {
      return Promise.resolve(window.TECTONIC_DATA.tornadoesSeasons.active);
    }
    isFetchingLiveTornadoes = true;
    const cacheBuster = force ? `?_t=${Date.now()}` : '';

    return fetch(`/api/tornadoes${cacheBuster}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .catch(() => {
        return fetch(`https://api.weather.gov/alerts/active?event=Tornado%20Warning,Tornado%20Watch`, {
          headers: {
            'Accept': 'application/geo+json, application/json',
            'User-Agent': 'TectonicPlatesMap/1.0 (Live Tornado Warnings; contact@tectonicplatemap.org)'
          }
        })
          .then(r => r.json())
          .then(nwsData => {
            const rawFeatures = (nwsData && Array.isArray(nwsData.features)) ? nwsData.features : [];
            const polygons = [];
            const points = [];
            for (let feat of rawFeatures) {
              const p = feat.properties || {};
              const isWarning = (p.event || '').toLowerCase().includes('warning');
              const eventType = isWarning ? 'Tornado Warning' : 'Tornado Watch';
              const normProps = {
                id: feat.id,
                name: p.headline || eventType,
                event: eventType,
                is_warning: isWarning,
                color: isWarning ? '#ef4444' : '#f59e0b',
                severity: p.severity || 'Severe',
                urgency: p.urgency || 'Immediate',
                area_desc: p.areaDesc || 'Active Alert Area',
                headline: p.headline || `${eventType} in effect`,
                description: p.description || '',
                instruction: p.instruction || 'Take shelter immediately in a sturdy interior room or basement.',
                effective: p.effective,
                expires: p.expires,
                is_live: true
              };
              if (feat.geometry && (feat.geometry.type === 'Polygon' || feat.geometry.type === 'MultiPolygon')) {
                polygons.push({ type: 'Feature', properties: normProps, geometry: feat.geometry });
                let cLng = 0, cLat = 0, ptCount = 0;
                function sumCoords(arr) {
                  if (typeof arr[0] === 'number') { cLng += arr[0]; cLat += arr[1]; ptCount++; }
                  else { for (let sub of arr) sumCoords(sub); }
                }
                sumCoords(feat.geometry.coordinates);
                if (ptCount > 0) {
                  points.push({ type: 'Feature', properties: normProps, geometry: { type: 'Point', coordinates: [cLng / ptCount, cLat / ptCount] } });
                }
              }
            }
            return {
              polygons: { type: 'FeatureCollection', features: polygons },
              points: { type: 'FeatureCollection', features: points },
              lines: { type: 'FeatureCollection', features: [] },
              metadata: { active_count: polygons.length }
            };
          });
      })
      .then(result => {
        isFetchingLiveTornadoes = false;
        if (!window.TECTONIC_DATA) window.TECTONIC_DATA = {};
        if (!window.TECTONIC_DATA.tornadoesSeasons) window.TECTONIC_DATA.tornadoesSeasons = {};
        window.TECTONIC_DATA.tornadoesSeasons.active = {
          polygons: result.polygons || { type: 'FeatureCollection', features: [] },
          points: result.points || { type: 'FeatureCollection', features: [] },
          lines: result.lines || { type: 'FeatureCollection', features: [] },
          metadata: result.metadata || {}
        };
        if (TPM.state.currentTornadoFilter === 'active' || !window.TECTONIC_DATA.tornadoesPoints) {
          window.TECTONIC_DATA.tornadoesPolygons = window.TECTONIC_DATA.tornadoesSeasons.active.polygons;
          window.TECTONIC_DATA.tornadoesPoints = window.TECTONIC_DATA.tornadoesSeasons.active.points;
          window.TECTONIC_DATA.tornadoesTracks = window.TECTONIC_DATA.tornadoesSeasons.active.lines;
        }
        return window.TECTONIC_DATA.tornadoesSeasons.active;
      })
      .catch(err => {
        isFetchingLiveTornadoes = false;
        console.warn('[LiveTornadoes] Fetch error:', err);
        return {
          polygons: { type: 'FeatureCollection', features: [] },
          points: { type: 'FeatureCollection', features: [] },
          lines: { type: 'FeatureCollection', features: [] }
        };
      });
  }

  function getTornadoesDataByFilter(filterKey) {
    const seasons = (window.TECTONIC_DATA && window.TECTONIC_DATA.tornadoesSeasons) || {};
    const s = seasons[filterKey] || seasons['legends'] || {
      polygons: { type: 'FeatureCollection', features: [] },
      lines: { type: 'FeatureCollection', features: [] },
      points: { type: 'FeatureCollection', features: [] }
    };
    return s;
  }

  // --- Procedural Canvas Volcano Icon Generator ---
  function initVolcanoIcons(map) {
    if (!map) return;
    const size = 56;

    // 1. Modern Active Volcano Icon
    if (!map.hasImage('volcano-active')) {
      try {
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, size, size);

          const glow = ctx.createRadialGradient(28, 28, 4, 28, 28, 25);
          glow.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
          glow.addColorStop(0.6, 'rgba(249, 115, 22, 0.15)');
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(28, 28, 25, 0, Math.PI * 2);
          ctx.fill();

          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
          ctx.shadowBlur = 5;
          ctx.shadowOffsetY = 2;
          ctx.beginPath();
          ctx.moveTo(12, 52);
          ctx.lineTo(22, 28);
          ctx.lineTo(34, 28);
          ctx.lineTo(44, 52);
          ctx.closePath();

          const coneGrad = ctx.createLinearGradient(28, 28, 28, 52);
          coneGrad.addColorStop(0, '#ef4444');
          coneGrad.addColorStop(0.35, '#b91c1c');
          coneGrad.addColorStop(0.75, '#450a0a');
          coneGrad.addColorStop(1, '#1c1917');
          ctx.fillStyle = coneGrad;
          ctx.fill();
          ctx.restore();

          ctx.lineWidth = 1.3;
          ctx.strokeStyle = '#fca5a5';
          ctx.lineJoin = 'round';
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(28, 29);
          ctx.quadraticCurveTo(33, 40, 26, 51);
          ctx.lineWidth = 3.0;
          ctx.strokeStyle = '#ea580c';
          ctx.lineCap = 'round';
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(28, 29);
          ctx.quadraticCurveTo(33, 40, 26, 51);
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = '#fef08a';
          ctx.lineCap = 'round';
          ctx.stroke();

          ctx.beginPath();
          ctx.ellipse(28, 28, 6.5, 3.2, 0, 0, Math.PI * 2);
          const calderaGrad = ctx.createRadialGradient(28, 28, 1, 28, 28, 6.5);
          calderaGrad.addColorStop(0, '#ffffff');
          calderaGrad.addColorStop(0.4, '#fef08a');
          calderaGrad.addColorStop(0.8, '#f97316');
          calderaGrad.addColorStop(1, '#dc2626');
          ctx.fillStyle = calderaGrad;
          ctx.fill();
          ctx.lineWidth = 1.1;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(28, 19, 3.8, 0, Math.PI * 2);
          ctx.fillStyle = '#fef08a';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(22, 16, 2.0, 0, Math.PI * 2);
          ctx.arc(34, 15, 2.0, 0, Math.PI * 2);
          ctx.fillStyle = '#ffedd5';
          ctx.fill();

          const imgData = ctx.getImageData(0, 0, size, size);
          map.addImage('volcano-active', imgData);
        }
      } catch (e) {
        console.warn('[VolcanoIcon] active generation skipped:', e);
      }
    }

    // 2. Recent Dormant Volcano Icon
    if (!map.hasImage('volcano-dormant-recent')) {
      try {
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, size, size);

          const glow = ctx.createRadialGradient(28, 28, 3, 28, 28, 24);
          glow.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
          glow.addColorStop(0.6, 'rgba(217, 119, 6, 0.12)');
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(28, 28, 24, 0, Math.PI * 2);
          ctx.fill();

          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 2;
          ctx.beginPath();
          ctx.moveTo(13, 52);
          ctx.lineTo(23, 28);
          ctx.lineTo(33, 28);
          ctx.lineTo(43, 52);
          ctx.closePath();

          const coneGrad = ctx.createLinearGradient(28, 28, 28, 52);
          coneGrad.addColorStop(0, '#d97706');
          coneGrad.addColorStop(0.45, '#78350f');
          coneGrad.addColorStop(1, '#292524');
          ctx.fillStyle = coneGrad;
          ctx.fill();
          ctx.restore();

          ctx.lineWidth = 1.2;
          ctx.strokeStyle = '#fde68a';
          ctx.lineJoin = 'round';
          ctx.stroke();

          ctx.beginPath();
          ctx.ellipse(28, 28, 6.2, 3.2, 0, 0, Math.PI * 2);
          const calderaGrad = ctx.createRadialGradient(28, 28, 1, 28, 28, 6.2);
          calderaGrad.addColorStop(0, '#fbbf24');
          calderaGrad.addColorStop(0.65, '#b45309');
          calderaGrad.addColorStop(1, '#451a03');
          ctx.fillStyle = calderaGrad;
          ctx.fill();
          ctx.lineWidth = 1.0;
          ctx.strokeStyle = '#fde68a';
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(28, 30);
          ctx.lineTo(28, 51);
          ctx.strokeStyle = 'rgba(69, 26, 3, 0.65)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          const imgData = ctx.getImageData(0, 0, size, size);
          map.addImage('volcano-dormant-recent', imgData);
        }
      } catch (e) {
        console.warn('[VolcanoIcon] recent dormant skipped:', e);
      }
    }

    // 3. Ancient Dormant Volcano Icon
    if (!map.hasImage('volcano-dormant-ancient')) {
      try {
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, size, size);

          const glow = ctx.createRadialGradient(28, 28, 3, 28, 28, 23);
          glow.addColorStop(0, 'rgba(148, 163, 184, 0.3)');
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(28, 28, 23, 0, Math.PI * 2);
          ctx.fill();

          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 2;
          ctx.beginPath();
          ctx.moveTo(14, 52);
          ctx.lineTo(24, 28);
          ctx.lineTo(32, 28);
          ctx.lineTo(42, 52);
          ctx.closePath();

          const coneGrad = ctx.createLinearGradient(28, 28, 28, 52);
          coneGrad.addColorStop(0, '#64748b');
          coneGrad.addColorStop(0.5, '#334155');
          coneGrad.addColorStop(1, '#0f172a');
          ctx.fillStyle = coneGrad;
          ctx.fill();
          ctx.restore();

          ctx.lineWidth = 1.1;
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineJoin = 'round';
          ctx.stroke();

          ctx.beginPath();
          ctx.ellipse(28, 28, 5.5, 2.6, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#0f172a';
          ctx.fill();
          ctx.lineWidth = 1.0;
          ctx.strokeStyle = '#94a3b8';
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(28, 28, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = '#38bdf8';
          ctx.fill();

          const imgData = ctx.getImageData(0, 0, size, size);
          map.addImage('volcano-dormant-ancient', imgData);
        }
      } catch (e) {
        console.warn('[VolcanoIcon] ancient dormant skipped:', e);
      }
    }
  }

  // --- Procedural Canvas Tornado Funnel Icon Generator ---
  function initTornadoIcons(map) {
    if (!map || map.hasImage('tornado-vortex')) return;
    const size = 56;
    try {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, size, size);

        const glow = ctx.createRadialGradient(28, 28, 4, 28, 28, 26);
        glow.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
        glow.addColorStop(0.6, 'rgba(239, 68, 68, 0.2)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(28, 28, 26, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(10, 12);
        ctx.lineTo(46, 12);
        ctx.quadraticCurveTo(38, 28, 31, 46);
        ctx.lineTo(25, 46);
        ctx.quadraticCurveTo(18, 28, 10, 12);
        ctx.closePath();
        const funnelGrad = ctx.createLinearGradient(28, 12, 28, 46);
        funnelGrad.addColorStop(0, '#64748b');
        funnelGrad.addColorStop(0.4, '#334155');
        funnelGrad.addColorStop(0.8, '#1e1b4b');
        funnelGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = funnelGrad;
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = '#e0e7ff';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.ellipse(28, 14, 15, 4.5, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.ellipse(28, 24, 10, 3.2, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(28, 34, 6, 2.2, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.ellipse(28, 47, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        const imgData = ctx.getImageData(0, 0, size, size);
        map.addImage('tornado-vortex', imgData);
      }
    } catch (e) {
      console.warn('[TornadoIcon] generation skipped:', e);
    }
  }

  // --- Procedural Canvas Tropical Cyclone Vortex Icon Generator ---
  function initHurricaneIcons(map) {
    if (!map) return;
    const size = 64;
    const cx = size / 2;
    const cy = size / 2;

    const iconDefs = [
      { id: 'cyclone-icon-ts', primary: '#00d2d3', core: '#67e8f9', glowRgba: 'rgba(0, 210, 211, 0.45)' },
      { id: 'cyclone-icon-cat1', primary: '#facc15', core: '#fef08a', glowRgba: 'rgba(250, 204, 21, 0.45)' },
      { id: 'cyclone-icon-cat2', primary: '#f59e0b', core: '#fde68a', glowRgba: 'rgba(245, 158, 11, 0.5)' },
      { id: 'cyclone-icon-cat3', primary: '#ea580c', core: '#fed7aa', glowRgba: 'rgba(234, 88, 12, 0.55)' },
      { id: 'cyclone-icon-cat4', primary: '#dc2626', core: '#fecaca', glowRgba: 'rgba(220, 38, 38, 0.6)' },
      { id: 'cyclone-icon-cat5', primary: '#991b1b', core: '#fecdd3', glowRgba: 'rgba(153, 27, 27, 0.65)' },
      { id: 'cyclone-icon-td', primary: '#38bdf8', core: '#bae6fd', glowRgba: 'rgba(56, 189, 248, 0.4)' }
    ];

    iconDefs.forEach(def => {
      if (map.hasImage(def.id)) return;
      try {
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, size, size);

        // 1. Atmospheric Outer Wind Field Circulation Glow
        const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 30);
        glow.addColorStop(0, def.glowRgba);
        glow.addColorStop(0.65, def.glowRgba.replace(/[\d\.]+\)$/, '0.12)'));
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, 30, 0, Math.PI * 2);
        ctx.fill();

        // 2. Gale-force Wind Radius (dashed circulation guide)
        ctx.save();
        ctx.strokeStyle = def.primary;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(cx, cy, 24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 3. Meteorological Tropical Cyclone Spiral Arms (2 counter-clockwise logarithmic arms)
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetY = 1;

        for (let rot = 0; rot < 2; rot++) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(rot * Math.PI);

          ctx.beginPath();
          ctx.moveTo(0, -7);
          ctx.bezierCurveTo(12, -21, 26, -17, 27, -3);
          ctx.quadraticCurveTo(27, 2, 22, 0);
          ctx.bezierCurveTo(19, -9, 10, -11, 0, -4);
          ctx.closePath();

          const armGrad = ctx.createLinearGradient(0, -21, 26, 0);
          armGrad.addColorStop(0, def.core);
          armGrad.addColorStop(0.5, def.primary);
          armGrad.addColorStop(1, def.core);
          ctx.fillStyle = armGrad;
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.1;
          ctx.lineJoin = 'round';
          ctx.stroke();

          ctx.restore();
        }
        ctx.restore();

        // 4. Eyewall Cloud Mass Ring
        ctx.beginPath();
        ctx.arc(cx, cy, 8.5, 0, Math.PI * 2);
        const wallGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 8.5);
        wallGrad.addColorStop(0, '#ffffff');
        wallGrad.addColorStop(0.4, def.core);
        wallGrad.addColorStop(0.8, def.primary);
        wallGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = wallGrad;
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // 5. Calm Eye of the Storm (Center Void)
        ctx.beginPath();
        ctx.arc(cx, cy, 3.8, 0, Math.PI * 2);
        ctx.fillStyle = '#070b14';
        ctx.fill();
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = def.core;
        ctx.stroke();

        const imgData = ctx.getImageData(0, 0, size, size);
        map.addImage(def.id, imgData);
      } catch (err) {
        console.warn('[HurricaneIcon] Generation skipped for', def.id, err);
      }
    });
  }

  const PhenomenaModule = {
    initLayers: function (map) {
      if (!map) return;
      const state = TPM.state;
      const data = window.TECTONIC_DATA;
      if (!data) return;

      initVolcanoIcons(map);
      initTornadoIcons(map);
      initHurricaneIcons(map);

      // 1. Volcanoes Layers
      const volcanoData = getVolcanoesDataByFilter(state.currentVolcanoFilter);
      if (!map.getSource('volcanoes')) {
        map.addSource('volcanoes', {
          type: 'geojson',
          data: volcanoData,
          cluster: false
        });
      }

      if (!map.getLayer('volcanoes-active')) {
        map.addLayer({
          id: 'volcanoes-active',
          type: 'symbol',
          source: 'volcanoes',
          filter: ['>=', ['get', 'last_eruption_year'], 1950],
          layout: {
            visibility: state.layersVisibility.volcanoes ? 'visible' : 'none',
            'icon-image': 'volcano-active',
            'icon-anchor': 'center',
            'icon-offset': [0, 0],
            'icon-size': ['interpolate', ['linear'], ['zoom'], 1.5, 0.42, 6, 0.70, 12, 1.20],
            'icon-padding': ['interpolate', ['linear'], ['zoom'], 2, 4, 8, 1, 12, 0],
            'icon-allow-overlap': false,
            'icon-ignore-placement': false,
            'symbol-sort-key': ['*', -1, ['coalesce', ['get', 'last_eruption_year'], 1950]]
          }
        });
      }

      if (!map.getLayer('volcanoes-recent-dormant')) {
        map.addLayer({
          id: 'volcanoes-recent-dormant',
          type: 'symbol',
          source: 'volcanoes',
          filter: ['all', ['>=', ['get', 'last_eruption_year'], 0], ['<', ['get', 'last_eruption_year'], 1950]],
          layout: {
            visibility: state.layersVisibility.volcanoes ? 'visible' : 'none',
            'icon-image': 'volcano-dormant-recent',
            'icon-anchor': 'center',
            'icon-offset': [0, 0],
            'icon-size': ['interpolate', ['linear'], ['zoom'], 1.5, 0.36, 6, 0.60, 12, 1.05],
            'icon-padding': ['interpolate', ['linear'], ['zoom'], 2, 4, 8, 1, 12, 0],
            'icon-allow-overlap': false,
            'icon-ignore-placement': false,
            'symbol-sort-key': ['-', 5000, ['coalesce', ['get', 'last_eruption_year'], 0]]
          }
        });
      }

      if (!map.getLayer('volcanoes-ancient-dormant')) {
        map.addLayer({
          id: 'volcanoes-ancient-dormant',
          type: 'symbol',
          source: 'volcanoes',
          filter: ['<', ['get', 'last_eruption_year'], 0],
          layout: {
            visibility: state.layersVisibility.volcanoes ? 'visible' : 'none',
            'icon-image': 'volcano-dormant-ancient',
            'icon-anchor': 'center',
            'icon-offset': [0, 0],
            'icon-size': ['interpolate', ['linear'], ['zoom'], 1.5, 0.30, 6, 0.50, 12, 0.90],
            'icon-padding': ['interpolate', ['linear'], ['zoom'], 2, 4, 8, 1, 12, 0],
            'icon-allow-overlap': false,
            'icon-ignore-placement': false,
            'symbol-sort-key': 10000
          }
        });
      }

      if (!map.getLayer('volcanoes-summit-point')) {
        map.addLayer({
          id: 'volcanoes-summit-point',
          type: 'circle',
          source: 'volcanoes',
          minzoom: 7,
          layout: {
            visibility: state.layersVisibility.volcanoes ? 'visible' : 'none'
          },
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 3.0, 12, 6.0, 16, 11.0],
            'circle-color': [
              'case',
              ['>=', ['get', 'last_eruption_year'], 1950], '#dc2626',
              ['>=', ['get', 'last_eruption_year'], 0], '#d97706',
              '#475569'
            ],
            'circle-opacity': 0.9,
            'circle-stroke-width': 2.0,
            'circle-stroke-color': '#ffffff'
          }
        }, 'volcanoes-ancient-dormant');
      }

      // 2. Hurricanes Layers
      const hurricaneData = getHurricanesDataByFilter(state.currentHurricaneFilter);
      if (!map.getSource('hurricanes')) {
        map.addSource('hurricanes', {
          type: 'geojson',
          data: hurricaneData.lines
        });
      }
      if (!map.getSource('hurricane-points')) {
        map.addSource('hurricane-points', {
          type: 'geojson',
          data: hurricaneData.points
        });
      }

      if (map.getSource('hurricanes') && !map.getLayer('hurricanes-glow')) {
        map.addLayer({
          id: 'hurricanes-glow',
          type: 'line',
          source: 'hurricanes',
          layout: {
            visibility: state.layersVisibility.hurricanes ? 'visible' : 'none',
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#38bdf8',
            'line-width': 7.0,
            'line-opacity': 0.45,
            'line-blur': 4.0
          }
        });
      }

      if (map.getSource('hurricanes') && !map.getLayer('hurricanes-line')) {
        map.addLayer({
          id: 'hurricanes-line',
          type: 'line',
          source: 'hurricanes',
          layout: {
            visibility: state.layersVisibility.hurricanes ? 'visible' : 'none',
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': [
              'match', ['get', 'category'],
              'TS', '#00d2d3',
              'Cat 1', '#ffeb3b',
              'Cat 2', '#ffc107',
              'Cat 3', '#ff9800',
              'Cat 4', '#ff0000',
              'Cat 5', '#800000',
              '#0ea5e9'
            ],
            'line-width': 2.8,
            'line-opacity': 0.95
          }
        });
      }

      if (map.getSource('hurricane-points') && !map.getLayer('hurricanes-radar-pulse')) {
        map.addLayer({
          id: 'hurricanes-radar-pulse',
          type: 'circle',
          source: 'hurricane-points',
          layout: {
            visibility: state.layersVisibility.hurricanes ? 'visible' : 'none'
          },
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              1.5, 12.0,
              6, 24.0,
              10, 38.0
            ],
            'circle-color': [
              'match', ['get', 'category'],
              'TS', '#00d2d3',
              'Cat 1', '#facc15',
              'Cat 2', '#f59e0b',
              'Cat 3', '#ea580c',
              'Cat 4', '#dc2626',
              'Cat 5', '#991b1b',
              '#38bdf8'
            ],
            'circle-opacity': 0.2,
            'circle-stroke-width': 1.2,
            'circle-stroke-color': [
              'match', ['get', 'category'],
              'TS', '#00d2d3',
              'Cat 1', '#facc15',
              'Cat 2', '#f59e0b',
              'Cat 3', '#ea580c',
              'Cat 4', '#dc2626',
              'Cat 5', '#991b1b',
              '#38bdf8'
            ],
            'circle-stroke-opacity': 0.6
          }
        });
      }

      if (map.getSource('hurricane-points') && !map.getLayer('hurricanes-symbol')) {
        map.addLayer({
          id: 'hurricanes-symbol',
          type: 'symbol',
          source: 'hurricane-points',
          layout: {
            visibility: state.layersVisibility.hurricanes ? 'visible' : 'none',
            'icon-image': [
              'match', ['get', 'category'],
              'TS', 'cyclone-icon-ts',
              'Cat 1', 'cyclone-icon-cat1',
              'Cat 2', 'cyclone-icon-cat2',
              'Cat 3', 'cyclone-icon-cat3',
              'Cat 4', 'cyclone-icon-cat4',
              'Cat 5', 'cyclone-icon-cat5',
              'TD', 'cyclone-icon-td',
              'cyclone-icon-ts'
            ],
            'icon-anchor': 'center',
            'icon-size': [
              'interpolate', ['linear'], ['zoom'],
              1.5, 0.55,
              5, 0.85,
              10, 1.25
            ],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'text-field': ['get', 'name'],
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-size': [
              'interpolate', ['linear'], ['zoom'],
              2, 10.5,
              6, 12.0,
              10, 14.0
            ],
            'text-offset': [0, 1.6],
            'text-anchor': 'top',
            'text-optional': true
          },
          paint: {
            'text-color': '#f8fafc',
            'text-halo-color': '#020617',
            'text-halo-width': 2.2
          }
        });
      }

      if (map.getSource('hurricane-points') && !map.getLayer('hurricanes-points')) {
        map.addLayer({
          id: 'hurricanes-points',
          type: 'circle',
          source: 'hurricane-points',
          layout: {
            visibility: state.layersVisibility.hurricanes ? 'visible' : 'none'
          },
          paint: {
            'circle-radius': 4.5,
            'circle-color': '#ffffff',
            'circle-opacity': 0.75,
            'circle-stroke-width': 1.0,
            'circle-stroke-color': '#090d16'
          }
        });
      }

      // 3. Northern / Southern Lights Aurora Layers
      if (data.aurora && !map.getSource('aurora')) {
        map.addSource('aurora', { type: 'geojson', data: data.aurora });
      }
      if (map.getSource('aurora') && !map.getLayer('aurora-glow')) {
        map.addLayer({
          id: 'aurora-glow',
          type: 'line',
          source: 'aurora',
          filter: ['==', '$type', 'LineString'],
          layout: {
            visibility: state.layersVisibility.aurora ? 'visible' : 'none',
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#10b981',
            'line-width': 9.0,
            'line-opacity': 0.50,
            'line-blur': 5.0
          }
        });
      }
      if (map.getSource('aurora') && !map.getLayer('aurora-line')) {
        map.addLayer({
          id: 'aurora-line',
          type: 'line',
          source: 'aurora',
          filter: ['==', '$type', 'LineString'],
          layout: {
            visibility: state.layersVisibility.aurora ? 'visible' : 'none',
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#4ade80',
            'line-width': 3.0,
            'line-opacity': 0.95
          }
        });
      }
      if (map.getSource('aurora') && !map.getLayer('aurora-label')) {
        map.addLayer({
          id: 'aurora-label',
          type: 'symbol',
          source: 'aurora',
          filter: ['==', '$type', 'LineString'],
          layout: {
            visibility: state.layersVisibility.aurora ? 'visible' : 'none',
            'symbol-placement': 'line',
            'text-field': ['get', 'label'],
            'text-size': 11.5,
            'text-letter-spacing': 0.08,
            'text-offset': [0, -1.2],
            'text-anchor': 'bottom',
            'text-keep-upright': true,
            'symbol-spacing': 350
          },
          paint: {
            'text-color': '#4ade80',
            'text-halo-color': '#070b14',
            'text-halo-width': 2.5
          }
        });
      }
      if (map.getSource('aurora') && !map.getLayer('aurora-stations')) {
        map.addLayer({
          id: 'aurora-stations',
          type: 'circle',
          source: 'aurora',
          filter: ['==', '$type', 'Point'],
          layout: {
            visibility: state.layersVisibility.aurora ? 'visible' : 'none'
          },
          paint: {
            'circle-radius': 6.5,
            'circle-color': '#10b981',
            'circle-stroke-width': 2.0,
            'circle-stroke-color': '#facc15',
            'circle-opacity': 0.95
          }
        });
      }

      // 4. Ocean Trenches Layers
      if (data.trenches && !map.getSource('trenches')) {
        map.addSource('trenches', { type: 'geojson', data: data.trenches });
      }
      if (map.getSource('trenches') && !map.getLayer('trenches-points')) {
        map.addLayer({
          id: 'trenches-points',
          type: 'circle',
          source: 'trenches',
          layout: {
            visibility: state.layersVisibility.trenches ? 'visible' : 'none'
          },
          paint: {
            'circle-radius': 7.0,
            'circle-color': '#6366f1',
            'circle-stroke-width': 2.0,
            'circle-stroke-color': '#c7d2fe',
            'circle-opacity': 0.95
          }
        });
      }

      // 5. Impact Craters Layers
      if (data.craters && !map.getSource('craters')) {
        map.addSource('craters', { type: 'geojson', data: data.craters });
      }
      if (map.getSource('craters') && !map.getLayer('craters-points')) {
        map.addLayer({
          id: 'craters-points',
          type: 'circle',
          source: 'craters',
          layout: {
            visibility: state.layersVisibility.craters ? 'visible' : 'none'
          },
          paint: {
            'circle-radius': 7.0,
            'circle-color': '#f59e0b',
            'circle-stroke-width': 2.0,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.95
          }
        });
      }

      // 6. Tornadoes Layers
      const tornadoData = getTornadoesDataByFilter(state.currentTornadoFilter || 'legends');
      if (!map.getSource('tornadoes-polygons')) {
        map.addSource('tornadoes-polygons', {
          type: 'geojson',
          data: tornadoData.polygons || { type: 'FeatureCollection', features: [] }
        });
      }
      if (!map.getSource('tornadoes-lines')) {
        map.addSource('tornadoes-lines', {
          type: 'geojson',
          data: tornadoData.lines || { type: 'FeatureCollection', features: [] }
        });
      }
      if (!map.getSource('tornadoes-points')) {
        map.addSource('tornadoes-points', {
          type: 'geojson',
          data: tornadoData.points || { type: 'FeatureCollection', features: [] }
        });
      }

      if (map.getSource('tornadoes-polygons') && !map.getLayer('tornadoes-polygon-fill')) {
        map.addLayer({
          id: 'tornadoes-polygon-fill',
          type: 'fill',
          source: 'tornadoes-polygons',
          layout: {
            visibility: state.layersVisibility.tornadoes ? 'visible' : 'none'
          },
          paint: {
            'fill-color': [
              'case',
              ['get', 'is_warning'], 'rgba(239, 68, 68, 0.35)',
              'rgba(245, 158, 11, 0.25)'
            ],
            'fill-opacity': 0.85
          }
        });
      }

      if (map.getSource('tornadoes-polygons') && !map.getLayer('tornadoes-polygon-line')) {
        map.addLayer({
          id: 'tornadoes-polygon-line',
          type: 'line',
          source: 'tornadoes-polygons',
          layout: {
            visibility: state.layersVisibility.tornadoes ? 'visible' : 'none',
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': [
              'case',
              ['get', 'is_warning'], '#ef4444',
              '#f59e0b'
            ],
            'line-width': 2.8,
            'line-opacity': 0.95
          }
        });
      }

      if (map.getSource('tornadoes-lines') && !map.getLayer('tornadoes-track-line')) {
        map.addLayer({
          id: 'tornadoes-track-line',
          type: 'line',
          source: 'tornadoes-lines',
          layout: {
            visibility: state.layersVisibility.tornadoes ? 'visible' : 'none',
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': [
              'match', ['get', 'ef_scale'],
              'EF5', '#a855f7',
              'EF4', '#ef4444',
              'EF3', '#f97316',
              'EF2', '#facc15',
              'EF1', '#00d2d3',
              '#38bdf8'
            ],
            'line-width': 4.0,
            'line-opacity': 0.9
          }
        });
      }

      if (map.getSource('tornadoes-points') && !map.getLayer('tornadoes-points')) {
        map.addLayer({
          id: 'tornadoes-points',
          type: 'circle',
          source: 'tornadoes-points',
          layout: {
            visibility: state.layersVisibility.tornadoes ? 'visible' : 'none'
          },
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              2, 7.0,
              8, 12.0
            ],
            'circle-color': [
              'match', ['get', 'ef_scale'],
              'EF5', '#a855f7',
              'EF4', '#ef4444',
              'EF3', '#f97316',
              'EF2', '#facc15',
              'EF1', '#00d2d3',
              '#ef4444'
            ],
            'circle-stroke-width': 2.5,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.95
          }
        });
      }
    },

    updateHurricaneLayers: function (data) {
      const state = TPM.state;
      if (state.map) {
        if (state.map.getSource('hurricanes')) state.map.getSource('hurricanes').setData(data.lines || { type: 'FeatureCollection', features: [] });
        if (state.map.getSource('hurricane-points')) state.map.getSource('hurricane-points').setData(data.points || { type: 'FeatureCollection', features: [] });
      }
      const badge = document.getElementById('mode-filter-badge');
      const cardBadge = document.getElementById('card-badge-hurricanes');
      const count = (data.points && data.points.features) ? data.points.features.length : 0;
      if (badge) {
        if (state.currentHurricaneFilter === 'active') {
          badge.textContent = count > 0 ? `${count} Active (Live)` : '0 Active (Quiet)';
          badge.className = `mode-filter-badge ${count > 0 ? 'badge-alert-active' : 'badge-alert-zero'}`;
        } else {
          badge.textContent = `${count.toLocaleString()} Storms`;
          badge.className = 'mode-filter-badge badge-alert-volcanoes';
        }
      }
      if (cardBadge) {
        cardBadge.textContent = count;
        cardBadge.classList.toggle('is-zero', count === 0);
      }
      // Always store current points so category counting and filtering work across all seasons
      window.TECTONIC_DATA.hurricanePoints = data.points || { type: 'FeatureCollection', features: [] };
      window.TECTONIC_DATA.hurricanes = data.lines || { type: 'FeatureCollection', features: [] };

      PhenomenaModule.applyHurricaneCategoryFilter();
      PhenomenaModule.renderLegend('hurricanes');
    },

    updateTornadoLayers: function (data) {
      const state = TPM.state;
      if (state.map) {
        if (state.map.getSource('tornadoes-polygons')) state.map.getSource('tornadoes-polygons').setData(data.polygons || { type: 'FeatureCollection', features: [] });
        if (state.map.getSource('tornadoes-lines')) state.map.getSource('tornadoes-lines').setData(data.lines || { type: 'FeatureCollection', features: [] });
        if (state.map.getSource('tornadoes-points')) state.map.getSource('tornadoes-points').setData(data.points || { type: 'FeatureCollection', features: [] });
      }
      const badge = document.getElementById('mode-filter-badge');
      const cardBadge = document.getElementById('card-badge-tornadoes');
      const count = (data.polygons && data.polygons.features && data.polygons.features.length > 0)
        ? data.polygons.features.length
        : (data.points && data.points.features ? data.points.features.length : 0);
      if (badge) {
        if (state.currentTornadoFilter === 'active') {
          badge.textContent = count > 0 ? `${count} Active Alerts` : '0 Active (Stable)';
          badge.className = `mode-filter-badge ${count > 0 ? 'badge-alert-active' : 'badge-alert-zero'}`;
        } else {
          badge.textContent = `${count.toLocaleString()} Outbreak Events`;
          badge.className = 'mode-filter-badge badge-alert-volcanoes';
        }
      }
      if (cardBadge) {
        cardBadge.textContent = count;
        cardBadge.classList.toggle('is-zero', count === 0);
      }
      if (state.currentTornadoFilter === 'active') {
        window.TECTONIC_DATA.tornadoesPolygons = data.polygons || { type: 'FeatureCollection', features: [] };
        window.TECTONIC_DATA.tornadoesPoints = data.points || { type: 'FeatureCollection', features: [] };
        window.TECTONIC_DATA.tornadoesTracks = data.lines || { type: 'FeatureCollection', features: [] };
      }
    },

    updateAuroraFilter: function (filterVal) {
      const state = TPM.state;
      state.currentAuroraFilter = filterVal;
      const map = state.map;
      if (!map) return;

      let pointFilter = ['==', '$type', 'Point'];
      let lineFilter = ['==', '$type', 'LineString'];
      let countText = '25 Stations';
      let cardCount = '25';

      if (filterVal === 'borealis') {
        pointFilter = ['all', ['==', '$type', 'Point'], ['!=', ['get', 'region'], 'Aurora Australis']];
        lineFilter = ['all', ['==', '$type', 'LineString'], ['!=', ['get', 'name'], 'Aurora Australis Main Oval']];
        countText = '20 Borealis Stations';
        cardCount = '20';
      } else if (filterVal === 'australis') {
        pointFilter = ['all', ['==', '$type', 'Point'], ['==', ['get', 'region'], 'Aurora Australis']];
        lineFilter = ['all', ['==', '$type', 'LineString'], ['==', ['get', 'name'], 'Aurora Australis Main Oval']];
        countText = '5 Australis Stations';
        cardCount = '5';
      }

      ['aurora-glow', 'aurora-line', 'aurora-label'].forEach(id => {
        if (map.getLayer(id)) map.setFilter(id, lineFilter);
      });
      if (map.getLayer('aurora-stations')) {
        map.setFilter('aurora-stations', pointFilter);
      }

      const badge = document.getElementById('mode-filter-badge');
      if (badge) {
        badge.textContent = countText;
        badge.className = 'mode-filter-badge badge-alert-aurora';
      }
      const cardBadge = document.getElementById('card-badge-aurora');
      if (cardBadge) cardBadge.textContent = cardCount;
    },

    updateFilterUI: function () {
      const state = TPM.state;
      const filterBar = document.getElementById('mode-filter-bar');
      if (!filterBar) return;

      // Trigger Alert Flash Micro-Animation on Mode Switch
      filterBar.classList.remove('alert-flash');
      void filterBar.offsetWidth;
      filterBar.classList.add('alert-flash');

      if (state.currentMode === 'volcanoes') {
        filterBar.classList.remove('is-hidden');
        filterBar.style.display = 'flex';
        filterBar.innerHTML = `
          <div class="mode-filter-select-wrap">
            <select id="mode-filter-select" onchange="window.onModeFilterChange(this.value)" aria-label="Filter events by time or season">
              <option value="all_holocene" ${state.currentVolcanoFilter === 'all_holocene' ? 'selected' : ''}>All Holocene Volcanoes</option>
              <option value="last_100" ${state.currentVolcanoFilter === 'last_100' ? 'selected' : ''}>Last 100 Years</option>
              <option value="last_year" ${state.currentVolcanoFilter === 'last_year' ? 'selected' : ''}>Last Year</option>
            </select>
          </div>
          <span id="mode-filter-badge" class="mode-filter-badge badge-alert-volcanoes">0</span>
        `;
        const data = getVolcanoesDataByFilter(state.currentVolcanoFilter);
        const badge = document.getElementById('mode-filter-badge');
        const cardBadge = document.getElementById('card-badge-volcanoes');
        const count = data.features ? data.features.length : 0;
        if (badge) {
          badge.textContent = `${count.toLocaleString()} Volcanoes`;
          badge.className = 'mode-filter-badge badge-alert-volcanoes';
        }
        if (cardBadge) cardBadge.textContent = count >= 1000 ? (count / 1000).toFixed(1) + 'k' : count;
      } else if (state.currentMode === 'hurricanes') {
        filterBar.classList.remove('is-hidden');
        filterBar.style.display = 'flex';
        filterBar.innerHTML = `
          <div class="mode-filter-select-wrap">
            <select id="mode-filter-select" onchange="window.onModeFilterChange(this.value)" aria-label="Filter hurricane events by time or season">
              <option value="active" ${state.currentHurricaneFilter === 'active' ? 'selected' : ''}>Active Now (Live NOAA NHC)</option>
              <option value="2024" ${state.currentHurricaneFilter === '2024' ? 'selected' : ''}>2024 Season (Milton, Beryl, Helene)</option>
              <option value="2023" ${state.currentHurricaneFilter === '2023' ? 'selected' : ''}>2023 Season (Otis, Idalia, Lee)</option>
              <option value="2005" ${state.currentHurricaneFilter === '2005' ? 'selected' : ''}>2005 Legend Season (Katrina, Wilma)</option>
              <option value="legends" ${state.currentHurricaneFilter === 'legends' ? 'selected' : ''}>All-Time Cat 5 Legends</option>
            </select>
          </div>
          <span id="mode-filter-badge" class="mode-filter-badge badge-alert-zero">0 Active (Quiet)</span>
        `;
        if (state.currentHurricaneFilter === 'active') {
          const badge = document.getElementById('mode-filter-badge');
          if (badge) badge.textContent = 'Syncing...';
          fetchLiveHurricanes().then(liveData => PhenomenaModule.updateHurricaneLayers(liveData));
        } else {
          const data = getHurricanesDataByFilter(state.currentHurricaneFilter);
          PhenomenaModule.updateHurricaneLayers(data);
        }
      } else if (state.currentMode === 'tornadoes') {
        filterBar.classList.remove('is-hidden');
        filterBar.style.display = 'flex';
        filterBar.innerHTML = `
          <div class="mode-filter-select-wrap">
            <select id="mode-filter-select" onchange="window.onModeFilterChange(this.value)" aria-label="Filter tornadoes by alert or outbreak">
              <option value="active" ${state.currentTornadoFilter === 'active' ? 'selected' : ''}>Active Warnings & Watches (Live NOAA NWS)</option>
              <option value="2024" ${state.currentTornadoFilter === '2024' ? 'selected' : ''}>2024 Outbreaks (Greenfield, Barnsdall, Elkhorn)</option>
              <option value="legends" ${(!state.currentTornadoFilter || state.currentTornadoFilter === 'legends') ? 'selected' : ''}>All-Time EF5 Legends (Joplin, Moore, El Reno)</option>
            </select>
          </div>
          <span id="mode-filter-badge" class="mode-filter-badge badge-alert-zero">0 Active (Stable)</span>
        `;
        if (state.currentTornadoFilter === 'active') {
          const badge = document.getElementById('mode-filter-badge');
          if (badge) badge.textContent = 'Syncing...';
          fetchLiveTornadoes().then(liveData => PhenomenaModule.updateTornadoLayers(liveData));
        } else {
          const data = getTornadoesDataByFilter(state.currentTornadoFilter || 'legends');
          PhenomenaModule.updateTornadoLayers(data);
        }
      } else if (state.currentMode === 'aurora') {
        filterBar.classList.remove('is-hidden');
        filterBar.style.display = 'flex';
        filterBar.innerHTML = `
          <div class="mode-filter-select-wrap">
            <select id="mode-filter-select" onchange="window.onAuroraFilterChange(this.value)" aria-label="Filter aurora observatories by zone">
              <option value="all" ${(!state.currentAuroraFilter || state.currentAuroraFilter === 'all') ? 'selected' : ''}>All 25 Observatories & Oval Belts</option>
              <option value="borealis" ${state.currentAuroraFilter === 'borealis' ? 'selected' : ''}>Aurora Borealis (20 Northern Lights Stations)</option>
              <option value="australis" ${state.currentAuroraFilter === 'australis' ? 'selected' : ''}>Aurora Australis (5 Southern Lights Stations)</option>
            </select>
          </div>
          <span id="mode-filter-badge" class="mode-filter-badge badge-alert-aurora">25 Stations</span>
        `;
        PhenomenaModule.updateAuroraFilter(state.currentAuroraFilter || 'all');
      } else if (state.currentMode === 'trenches') {
        filterBar.classList.remove('is-hidden');
        filterBar.style.display = 'flex';
        filterBar.innerHTML = `
          <div style="font-size:0.82rem; font-weight:600; color:#f1f5f9; display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-water" style="color:#818cf8;"></i> Deep Ocean Trenches (&gt;6,000m)
          </div>
          <span id="mode-filter-badge" class="mode-filter-badge badge-alert-trenches">7 Deep Trenches</span>
        `;
        const cardBadge = document.getElementById('card-badge-trenches');
        if (cardBadge) cardBadge.textContent = '7';
      } else if (state.currentMode === 'craters') {
        filterBar.classList.remove('is-hidden');
        filterBar.style.display = 'flex';
        filterBar.innerHTML = `
          <div style="font-size:0.82rem; font-weight:600; color:#f1f5f9; display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-meteor" style="color:#f59e0b;"></i> Major Asteroid Impact Craters
          </div>
          <span id="mode-filter-badge" class="mode-filter-badge badge-alert-craters">5 Impact Sites</span>
        `;
        const cardBadge = document.getElementById('card-badge-craters');
        if (cardBadge) cardBadge.textContent = '5';
      } else if (state.currentMode !== 'earthquakes' && state.currentMode !== 'tectonic-plates') {
        filterBar.classList.add('is-hidden');
        filterBar.style.display = 'none';
      }
    },

    onFilterChange: function (filterVal) {
      const state = TPM.state;
      if (state.currentMode === 'volcanoes') {
        state.currentVolcanoFilter = filterVal;
        TPM.loadDataset('volcanoes').then(() => {
          const data = getVolcanoesDataByFilter(filterVal);
          if (state.map && state.map.getSource('volcanoes')) {
            state.map.getSource('volcanoes').setData(data);
          }
          PhenomenaModule.updateVolcanoCountsUI();
          PhenomenaModule.applyVolcanoCategoryVisibility();
          PhenomenaModule.updateVolcanoLegendUI();
        });
      } else if (state.currentMode === 'hurricanes') {
        state.currentHurricaneFilter = filterVal;
        if (filterVal === 'active') {
          const badge = document.getElementById('mode-filter-badge');
          if (badge) badge.textContent = 'Syncing...';
          fetchLiveHurricanes(true).then(liveData => PhenomenaModule.updateHurricaneLayers(liveData));
        } else {
          TPM.loadDataset('hurricanes').then(() => {
            const data = getHurricanesDataByFilter(filterVal);
            PhenomenaModule.updateHurricaneLayers(data);
          });
        }
      } else if (state.currentMode === 'tornadoes') {
        state.currentTornadoFilter = filterVal;
        if (filterVal === 'active') {
          const badge = document.getElementById('mode-filter-badge');
          if (badge) badge.textContent = 'Syncing...';
          fetchLiveTornadoes(true).then(liveData => PhenomenaModule.updateTornadoLayers(liveData));
        } else {
          TPM.loadDataset('tornadoes').then(() => {
            const data = getTornadoesDataByFilter(filterVal);
            PhenomenaModule.updateTornadoLayers(data);
          });
        }
      } else if (state.currentMode === 'aurora') {
        PhenomenaModule.updateAuroraFilter(filterVal);
      }
    },

    renderLegend: function (mode) {
      const el = document.getElementById('dynamic-mode-legend');
      if (!el) return;

      if (mode === 'hurricanes') {
        const counts = PhenomenaModule.getHurricaneCategoryCounts();
        const activeFilter = TPM.state.hurricaneCategoryFilter || null;

        const CAT_CONFIG = [
          { id: 'TD', label: 'TD', fullName: 'Tropical Depression (<39 mph / <63 km/h)', color: '#38bdf8', badgeClass: 'alert-neutral', tipKey: 'cyclone-td' },
          { id: 'TS', label: 'TS', fullName: 'Tropical Storm (39–73 mph / 63–118 km/h)', color: '#00d2d3', badgeClass: 'alert-neutral', tipKey: 'cyclone-ts' },
          { id: 'Cat 1', label: 'Cat 1', fullName: 'Category 1 (74–95 mph / 119–153 km/h)', color: '#facc15', badgeClass: 'alert-neutral', tipKey: 'cyclone-cat1' },
          { id: 'Cat 2', label: 'Cat 2', fullName: 'Category 2 (96–110 mph / 154–177 km/h)', color: '#f59e0b', badgeClass: 'alert-amber', tipKey: 'cyclone-cat2' },
          { id: 'Cat 3', label: 'Cat 3', fullName: 'Category 3 (111–129 mph / 178–208 km/h)', color: '#ea580c', badgeClass: 'alert-amber', tipKey: 'cyclone-cat3' },
          { id: 'Cat 4', label: 'Cat 4', fullName: 'Category 4 (130–156 mph / 209–251 km/h)', color: '#dc2626', badgeClass: 'alert-red', tipKey: 'cyclone-cat4' },
          { id: 'Cat 5', label: 'Cat 5', fullName: 'Category 5 (157+ mph / 252+ km/h)', color: '#800000', badgeClass: 'alert-red', tipKey: 'cyclone-cat5' }
        ];

        // Filter only categories present in current dataset to eliminate phantom categories
        const presentCats = CAT_CONFIG.filter(c => counts[c.id] > 0);

        if (counts.total === 0) {
          el.innerHTML = `
            <div class="legend-scale-row" role="group" aria-label="Hurricane Activity">
              <span class="legend-filter-btn is-active" style="cursor:default;">
                <span class="cyclone-dot" style="color:#38bdf8;">🌀</span> 0 Active Tropical Cyclones
                <span class="legend-alert-badge alert-catalog">Quiet Season</span>
              </span>
              <span class="legend-filter-btn legend-source-btn is-active" style="cursor:default; color:#94a3b8; font-weight:500;">NOAA NHC</span>
            </div>
          `;
          return;
        }

        let buttonsHtml = '';
        presentCats.forEach(c => {
          const count = counts[c.id];
          const isSelected = activeFilter === null || activeFilter === c.id;
          const isMuted = activeFilter !== null && activeFilter !== c.id;
          buttonsHtml += `
            <button type="button" 
                    id="btn-filter-cyclone-${c.id.replace(/\\s+/g, '').toLowerCase()}" 
                    class="legend-filter-btn ${isSelected ? 'is-active' : ''} ${isMuted ? 'is-muted' : ''}" 
                    data-category="${c.id}" 
                    onclick="window.TPM_Phenomena.toggleHurricaneCategory('${c.id}')"
                    onmouseenter="window.showGlobalLegendTooltip(this, '${c.tipKey}', event)"
                    onmouseleave="window.hideGlobalLegendTooltip()"
                    onfocus="window.showGlobalLegendTooltip(this, '${c.tipKey}', event)"
                    onblur="window.hideGlobalLegendTooltip()"
                    aria-pressed="${isSelected}"
                    title="Click to isolate & filter ${c.fullName} (${count})">
              <span class="cyclone-dot" style="color:${c.color};">🌀</span>
              <span class="legend-filter-label">${c.label}</span>
              <span class="legend-alert-badge ${c.badgeClass}">${count}</span>
            </button>
          `;
        });

        const isFiltered = activeFilter !== null;
        buttonsHtml += `
          <button type="button" 
                  id="btn-filter-cyclone-all" 
                  class="legend-filter-btn legend-source-btn is-active" 
                  data-category="all" 
                  onclick="window.TPM_Phenomena.resetHurricaneFilters()"
                  onmouseenter="window.showGlobalLegendTooltip(this, 'cyclone-all', event)"
                  onmouseleave="window.hideGlobalLegendTooltip()"
                  onfocus="window.showGlobalLegendTooltip(this, 'cyclone-all', event)"
                  onblur="window.hideGlobalLegendTooltip()"
                  aria-label="NOAA NHC Feed - Click to reset filters"
                  title="NOAA National Hurricane Center - Click to reset filters">
            <span class="legend-filter-label" style="color:#94a3b8; font-weight:600;">
              ${isFiltered ? '<i class="fa-solid fa-rotate-left mr-1" style="color:#38bdf8;"></i>Reset' : 'NOAA NHC'}
            </span>
            <span class="legend-alert-badge alert-catalog">${counts.total}</span>
          </button>
        `;

        el.innerHTML = `
          <div class="legend-scale-row" role="group" aria-label="Hurricane Category Filters">
            ${buttonsHtml}
          </div>
        `;
      } else if (mode === 'tornadoes') {
        const polyFeatures = (window.TECTONIC_DATA && window.TECTONIC_DATA.tornadoesPolygons && window.TECTONIC_DATA.tornadoesPolygons.features) || [];
        const warnCount = polyFeatures.filter(f => f.properties && f.properties.is_warning).length;
        const watchCount = polyFeatures.filter(f => f.properties && !f.properties.is_warning).length;
        const warnBadge = warnCount > 0 ? `<span class="legend-alert-badge alert-red">${warnCount} Live</span>` : `<span class="legend-alert-badge alert-catalog">0 Active</span>`;
        const watchBadge = watchCount > 0 ? `<span class="legend-alert-badge alert-amber">${watchCount} Watch</span>` : `<span class="legend-alert-badge alert-catalog">0</span>`;

        el.innerHTML = `
          <div class="legend-scale-row" role="group" aria-label="Tornado Severity Scale">
            <span class="legend-scale-item"><span class="legend-line" style="width:14px; height:4px; background:#ef4444; display:inline-block; border-radius:2px;"></span> Warning ${warnBadge}</span>
            <span class="legend-scale-item"><span class="legend-line" style="width:14px; height:4px; background:#f59e0b; display:inline-block; border-radius:2px;"></span> Watch ${watchBadge}</span>
            <span class="legend-scale-item"><span class="legend-circle" style="background:#00d2d3; border:1px solid #fff;"></span> EF0-1</span>
            <span class="legend-scale-item"><span class="legend-circle" style="background:#facc15; border:1px solid #fff;"></span> EF2</span>
            <span class="legend-scale-item"><span class="legend-circle" style="background:#f97316; border:1px solid #fff;"></span> EF3</span>
            <span class="legend-scale-item"><span class="legend-circle" style="background:#ef4444; border:1px solid #fff;"></span> EF4</span>
            <span class="legend-scale-item"><span class="legend-circle" style="background:#a855f7; border:1px solid #fff;"></span> EF5</span>
            <span class="legend-scale-item" style="color:#94a3b8; font-weight:500;">NOAA NWS</span>
          </div>
        `;
      } else if (mode === 'volcanoes') {
        const counts = PhenomenaModule.getVolcanoCategoryCounts();
        const cats = TPM.state.volcanoCategories || { active: true, recent: true, ancient: true, magmaArc: true };
        const allOn = cats.active && cats.recent && cats.ancient;

        el.innerHTML = `
          <div class="legend-scale-row" role="group" aria-label="Volcano Category Filters">
            <!-- 1. Active -->
            <button type="button" 
                    id="btn-filter-volcano-active" 
                    class="legend-filter-btn ${cats.active ? 'is-active' : ''} ${(!cats.active && !allOn) ? 'is-muted' : ''}" 
                    data-category="active" 
                    onclick="window.TPM_Phenomena.toggleVolcanoCategory('active')"
                    onmouseenter="window.showGlobalLegendTooltip(this, 'volcano-active', event)"
                    onmouseleave="window.hideGlobalLegendTooltip()"
                    onfocus="window.showGlobalLegendTooltip(this, 'volcano-active', event)"
                    onblur="window.hideGlobalLegendTooltip()"
                    aria-pressed="${cats.active}"
                    title="Click to isolate & narrow down Active Volcanoes (359)">
              <span class="volcano-triangle" style="color:#ef4444; font-size:1.05rem;">▲</span>
              <span class="legend-filter-label">Active (≥1950)</span>
              <span class="legend-alert-badge alert-red" id="badge-volcano-count-active">${counts.active}</span>
            </button>

            <!-- 2. Recent Dormant -->
            <button type="button" 
                    id="btn-filter-volcano-recent" 
                    class="legend-filter-btn ${cats.recent ? 'is-active' : ''} ${(!cats.recent && !allOn) ? 'is-muted' : ''}" 
                    data-category="recent" 
                    onclick="window.TPM_Phenomena.toggleVolcanoCategory('recent')"
                    onmouseenter="window.showGlobalLegendTooltip(this, 'volcano-recent', event)"
                    onmouseleave="window.hideGlobalLegendTooltip()"
                    onfocus="window.showGlobalLegendTooltip(this, 'volcano-recent', event)"
                    onblur="window.hideGlobalLegendTooltip()"
                    aria-pressed="${cats.recent}"
                    title="Click to isolate & narrow down Recent Dormant Volcanoes (319)">
              <span class="volcano-triangle" style="color:#f59e0b; font-size:0.95rem;">▲</span>
              <span class="legend-filter-label">Recent Dormant (Historic)</span>
              <span class="legend-alert-badge alert-amber" id="badge-volcano-count-recent">${counts.recent}</span>
            </button>

            <!-- 3. Ancient Dormant -->
            <button type="button" 
                    id="btn-filter-volcano-ancient" 
                    class="legend-filter-btn ${cats.ancient ? 'is-active' : ''} ${(!cats.ancient && !allOn) ? 'is-muted' : ''}" 
                    data-category="ancient" 
                    onclick="window.TPM_Phenomena.toggleVolcanoCategory('ancient')"
                    onmouseenter="window.showGlobalLegendTooltip(this, 'volcano-ancient', event)"
                    onmouseleave="window.hideGlobalLegendTooltip()"
                    onfocus="window.showGlobalLegendTooltip(this, 'volcano-ancient', event)"
                    onblur="window.hideGlobalLegendTooltip()"
                    aria-pressed="${cats.ancient}"
                    title="Click to isolate & narrow down Ancient Dormant Volcanoes (539)">
              <span class="volcano-triangle" style="color:#94a3b8; font-size:0.85rem;">▲</span>
              <span class="legend-filter-label">Ancient Dormant (&lt;0 CE)</span>
              <span class="legend-alert-badge alert-slate" id="badge-volcano-count-ancient">${counts.ancient}</span>
            </button>

            <!-- 4. Magma Arc -->
            <button type="button" 
                    id="btn-filter-volcano-magma" 
                    class="legend-filter-btn ${cats.magmaArc ? 'is-active' : ''} ${!cats.magmaArc ? 'is-muted' : ''}" 
                    data-category="magmaArc" 
                    onclick="window.TPM_Phenomena.toggleVolcanoCategory('magmaArc')"
                    onmouseenter="window.showGlobalLegendTooltip(this, 'volcano-magma', event)"
                    onmouseleave="window.hideGlobalLegendTooltip()"
                    onfocus="window.showGlobalLegendTooltip(this, 'volcano-magma', event)"
                    onblur="window.hideGlobalLegendTooltip()"
                    aria-pressed="${cats.magmaArc}"
                    title="Click to toggle Magma Arc Plate Boundaries (52)">
              <span class="legend-line" style="width:14px; height:4px; background:linear-gradient(90deg, #dc2626, #f97316, #fef08a); display:inline-block; border-radius:2px;"></span>
              <span class="legend-filter-label">Magma Arc</span>
              <span class="legend-alert-badge alert-magma" id="badge-volcano-count-magma">52</span>
            </button>

            <!-- 5. Smithsonian GVP / Reset All -->
            <button type="button" 
                    id="btn-filter-volcano-all" 
                    class="legend-filter-btn legend-source-btn is-active" 
                    data-category="all" 
                    onclick="window.TPM_Phenomena.resetVolcanoFilters()"
                    onmouseenter="window.showGlobalLegendTooltip(this, 'volcano-all', event)"
                    onmouseleave="window.hideGlobalLegendTooltip()"
                    onfocus="window.showGlobalLegendTooltip(this, 'volcano-all', event)"
                    onblur="window.hideGlobalLegendTooltip()"
                    aria-label="Smithsonian GVP Catalog - Click to show all / reset filters"
                    title="Smithsonian Institution GVP Catalog - Click to show all / reset filters">
              <span class="legend-filter-label" id="volcano-all-label" style="color:#94a3b8; font-weight:600;">${allOn ? 'Smithsonian GVP' : '<i class="fa-solid fa-rotate-left mr-1" style="color:#38bdf8;"></i>Reset'}</span>
              <span class="legend-alert-badge alert-catalog" id="badge-volcano-count-all">${counts.total >= 1000 ? (counts.total / 1000).toFixed(1) + 'k' : counts.total}</span>
            </button>
          </div>
        `;
      } else if (mode === 'aurora') {
        el.innerHTML = `
          <div class="legend-scale-row" role="group" aria-label="Geomagnetic Aurora Stations">
            <span class="legend-filter-btn is-active" style="cursor:default;"><span class="legend-line" style="width:14px; height:3px; background:#10b981; display:inline-block; border-radius:2px;"></span> Geomagnetic Oval (~67°)</span>
            <span class="legend-filter-btn is-active" style="cursor:default;"><span class="legend-circle" style="background:#10b981; border:1.5px solid #facc15;"></span> Observatory <span class="legend-alert-badge alert-catalog">25 Stations</span></span>
          </div>
        `;
      } else if (mode === 'trenches') {
        el.innerHTML = `
          <div class="legend-scale-row" role="group" aria-label="Deep Ocean Trenches">
            <span class="legend-filter-btn is-active" style="cursor:default;"><span class="legend-circle" style="background:#6366f1; border:1.5px solid #c7d2fe;"></span> Deep Ocean Trench (&gt;6,000m) <span class="legend-alert-badge alert-catalog">7</span></span>
            <span class="legend-filter-btn legend-source-btn is-active" style="cursor:default; color:#64748b; font-weight:500;">Challenger Deep 10,994m</span>
          </div>
        `;
      } else if (mode === 'craters') {
        el.innerHTML = `
          <div class="legend-scale-row" role="group" aria-label="Major Impact Craters">
            <span class="legend-filter-btn is-active" style="cursor:default;"><span class="legend-circle" style="background:#f59e0b; border:1.5px solid #ffffff;"></span> Impact Crater <span class="legend-alert-badge alert-amber">5 Sites</span></span>
            <span class="legend-filter-btn legend-source-btn is-active" style="cursor:default; color:#64748b; font-weight:500;">Chicxulub ~66 Ma</span>
          </div>
        `;
      }
    },

    handlePopup: function (features, e, map) {
      // 1. Volcanoes
      const volcano = features.find(f => f.layer.id === 'volcanoes-active' || f.layer.id === 'volcanoes-recent-dormant' || f.layer.id === 'volcanoes-ancient-dormant' || f.layer.id === 'volcanoes-summit-point');
      if (volcano) {
        const p = volcano.properties;
        const yr = p.last_eruption_year;
        const coords = volcano.geometry && volcano.geometry.coordinates ? volcano.geometry.coordinates : [e.lngLat.lng, e.lngLat.lat];
        let statusBadge = '';
        const isUndated = yr === -99999 || yr === null || yr === undefined || p.last_eruption === 'Unknown';
        if (yr >= 1950) {
          statusBadge = '<span style="background:#dc2626; color:#ffffff; font-size:0.7rem; padding:2.5px 8px; border-radius:4px; font-weight:700; letter-spacing:0.04em;">ACTIVE (MODERN ERA)</span>';
        } else if (yr >= 0) {
          statusBadge = '<span style="background:#b45309; color:#fef3c7; font-size:0.7rem; padding:2.5px 8px; border-radius:4px; font-weight:700; letter-spacing:0.04em;">RECENT DORMANT</span>';
        } else if (isUndated) {
          statusBadge = '<span style="background:#475569; color:#f1f5f9; font-size:0.7rem; padding:2.5px 8px; border-radius:4px; font-weight:600; letter-spacing:0.04em;">UNDATED HOLOCENE</span>';
        } else {
          statusBadge = '<span style="background:#334155; color:#cbd5e1; font-size:0.7rem; padding:2.5px 8px; border-radius:4px; font-weight:600; letter-spacing:0.04em;">ANCIENT DORMANT</span>';
        }

        TPM.showSmartPopup(coords, `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:6px;">
            <span class="popup-title" style="color:#f97316; font-size:1.05rem; margin:0; font-weight:700;">🌋 ${p.name}</span>
            ${statusBadge}
          </div>
          <div style="font-size:0.75rem; color:#38bdf8; font-family:var(--font-mono); margin-bottom:5px; display:flex; align-items:center; gap:5px; background:rgba(56,189,248,0.1); padding:3px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.2);">
            <i class="fa-solid fa-location-crosshairs" style="color:#38bdf8;"></i>
            <span style="letter-spacing:0.02em;">${TPM.formatGeodeticCoords(coords[1], coords[0])}</span>
            <span style="color:#64748b; margin:0 2px;">&bull;</span>
            <span style="color:#e2e8f0;">Elev: <strong style="color:#fef08a;">${p.elevation || 'N/A'}</strong></span>
          </div>
          <div class="popup-meta" style="color:#cbd5e1; font-weight:500; margin-bottom:5px;">
            Region: <strong>${p.country}</strong>
          </div>
          <div style="font-size:0.83rem; color:#94a3b8; margin-bottom:4px;">
            Type: <strong style="color:#f8fafc;">${p.type || 'Volcano'}</strong>
          </div>
          <div style="font-size:0.78rem; color:#94a3b8; margin-bottom:6px; line-height:1.35;">
            Tectonic Context: <span style="color:#38bdf8; font-weight:600;">${p.tectonic_setting || 'Subduction Zone / Hotspot'}</span>
          </div>
          <div style="font-size:0.8rem; color:#fbbf24; background:rgba(249, 115, 22, 0.12); border-left:3px solid #f97316; padding:5px 8px; border-radius:3px; margin-bottom:6px;">
            Last Eruption: <strong>${isUndated ? 'Undated Holocene (past ~11,700 yr)' : (p.last_eruption || 'Holocene')}</strong>
          </div>
          ${TPM.getGoogleMapsButton(coords[1], coords[0], 'Open in Google Maps')}
        `, { className: 'custom-popup volcano-popup', estimatedHeight: 280 });
        return true;
      }

      // 2. Hurricanes Landfall Points & Live Storms
      const hurricane = features.find(f => f.layer.id === 'hurricanes-points' || f.layer.id === 'hurricanes-symbol');
      if (hurricane) {
        const p = hurricane.properties;
        const coords = hurricane.geometry && hurricane.geometry.coordinates ? hurricane.geometry.coordinates : [e.lngLat.lng, e.lngLat.lat];
        const isLive = p.is_live || false;
        TPM.showSmartPopup(coords, `
          <div class="popup-title" style="color:#38bdf8; font-weight:700; display:flex; align-items:center; justify-content:space-between;">
            <span>🌀 ${p.name || 'Tropical Cyclone'}</span>
            ${isLive ? '<span style="background:#ef4444; color:#fff; font-size:0.68rem; font-weight:800; padding:2px 6px; border-radius:4px; text-transform:uppercase; letter-spacing:0.04em;">LIVE NOAA</span>' : ''}
          </div>
          <div class="popup-meta" style="color:#cbd5e1; margin-bottom:5px;">
            ${p.year ? `Year: ${p.year} &bull; ` : ''}<strong style="color:${p.color || '#f87171'}; font-weight:700;">${p.category || 'Cat 5'}</strong>
            ${p.classification ? ` &bull; <span style="color:#94a3b8;">${p.classification}</span>` : ''}
          </div>
          <div style="font-size:0.75rem; color:#38bdf8; font-family:var(--font-mono); margin-bottom:6px; display:flex; align-items:center; gap:5px; background:rgba(56,189,248,0.1); padding:3px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.2);">
            <i class="fa-solid fa-location-crosshairs" style="color:#38bdf8;"></i>
            <span>${TPM.formatGeodeticCoords(coords[1], coords[0])}</span>
          </div>
          <div style="font-size:0.83rem; color:#cbd5e1; margin-bottom:4px;">
            Sustained Winds: <strong style="color:#f87171;">${p.max_winds || p.winds || '160+ mph'}</strong>
          </div>
          ${p.pressure ? `<div style="font-size:0.8rem; color:#94a3b8; margin-bottom:4px;">Min Central Pressure: <strong style="color:#38bdf8;">${p.pressure}</strong></div>` : ''}
          ${p.movement ? `<div style="font-size:0.8rem; color:#94a3b8; margin-bottom:6px;">Current Movement: <strong style="color:#facc15;">${p.movement}</strong></div>` : ''}
          <div style="font-size:0.78rem; color:#94a3b8; margin-bottom:6px; line-height:1.35;">
            ${isLive ? 'Real-time tropical cyclone tracking feed powered by NOAA National Hurricane Center (NHC) Automated Tropical Cyclone Forecasting (ATCF).' : 'Historical monster tropical cyclone track showing atmospheric and oceanic energy transfer.'}
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">
            ${p.advisory_url ? `<a href="${p.advisory_url}" target="_blank" rel="noopener noreferrer" class="btn-clean" style="flex:1; text-align:center; padding:5px 8px; font-size:0.75rem; background:rgba(56,189,248,0.15); border:1px solid #38bdf8; color:#38bdf8; border-radius:4px; text-decoration:none;"><i class="fa-solid fa-file-lines"></i> NOAA Advisory</a>` : ''}
            ${TPM.getGoogleMapsButton(coords[1], coords[0], 'Open in Google Maps')}
          </div>
        `, { className: 'custom-popup hurricane-popup', estimatedHeight: isLive ? 320 : 260 });
        return true;
      }

      // 2b. Tornadoes & Severe Storms (Points, Polygons, Tracks)
      const tornadoFeat = features.find(f => f.layer.id === 'tornadoes-points' || f.layer.id === 'tornadoes-polygon-fill' || f.layer.id === 'tornadoes-track-line');
      if (tornadoFeat) {
        const p = tornadoFeat.properties;
        const coords = [e.lngLat.lng, e.lngLat.lat];
        const isLive = p.is_live || false;
        const isWarning = p.is_warning || (p.event || '').toLowerCase().includes('warning');

        if (isLive) {
          TPM.showSmartPopup(coords, `
            <div class="popup-title" style="color:${isWarning ? '#ef4444' : '#f59e0b'}; font-weight:700; display:flex; align-items:center; justify-content:space-between;">
              <span>🌪️ ${p.event || 'Tornado Alert'}</span>
              <span style="background:${isWarning ? '#ef4444' : '#f59e0b'}; color:#fff; font-size:0.68rem; font-weight:800; padding:2px 6px; border-radius:4px; text-transform:uppercase;">${isWarning ? 'WARNING' : 'WATCH'}</span>
            </div>
            <div class="popup-meta" style="color:#cbd5e1; margin-bottom:5px; font-size:0.82rem; font-weight:600;">
              ${p.headline || p.name || 'NOAA NWS Severe Alert'}
            </div>
            <div style="font-size:0.75rem; color:#38bdf8; font-family:var(--font-mono); margin-bottom:6px; display:flex; align-items:center; gap:5px; background:rgba(56,189,248,0.1); padding:3px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.2);">
              <i class="fa-solid fa-location-crosshairs" style="color:#38bdf8;"></i>
              <span>${TPM.formatGeodeticCoords(coords[1], coords[0])}</span>
            </div>
            <div style="font-size:0.8rem; color:#cbd5e1; margin-bottom:4px;">
              <strong>Affected Area:</strong> <span style="color:#94a3b8;">${p.area_desc || 'See radar polygon'}</span>
            </div>
            <div style="font-size:0.78rem; color:#ef4444; background:rgba(239,68,68,0.1); border-left:3px solid #ef4444; padding:5px 8px; border-radius:3px; margin-bottom:6px; line-height:1.35;">
              <strong>Action:</strong> ${p.instruction || 'Take shelter immediately in a sturdy interior room on the lowest floor.'}
            </div>
            <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:6px;">
              Urgency: <strong style="color:#f8fafc;">${p.urgency || 'Immediate'}</strong> &bull; Severity: <strong style="color:#f8fafc;">${p.severity || 'Extreme'}</strong>
            </div>
            ${TPM.getGoogleMapsButton(coords[1], coords[0], 'Open in Google Maps')}
          `, { className: 'custom-popup tornado-popup', estimatedHeight: 330 });
        } else {
          TPM.showSmartPopup(coords, `
            <div class="popup-title" style="color:#ef4444; font-weight:700; display:flex; align-items:center; justify-content:space-between;">
              <span>🌪️ ${p.name || 'Historic Tornado'}</span>
              <span style="background:${p.color || '#ef4444'}; color:#fff; font-size:0.75rem; font-weight:800; padding:2px 7px; border-radius:4px;">${p.ef_scale || 'EF5'}</span>
            </div>
            <div class="popup-meta" style="color:#cbd5e1; margin-bottom:5px;">
              ${p.date || ''}${p.state ? ` &bull; <strong>${p.state}</strong>` : ''}
            </div>
            <div style="font-size:0.75rem; color:#38bdf8; font-family:var(--font-mono); margin-bottom:6px; display:flex; align-items:center; gap:5px; background:rgba(56,189,248,0.1); padding:3px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.2);">
              <i class="fa-solid fa-location-crosshairs" style="color:#38bdf8;"></i>
              <span>${TPM.formatGeodeticCoords(coords[1], coords[0])}</span>
            </div>
            <div style="font-size:0.83rem; color:#cbd5e1; margin-bottom:4px;">
              Peak Wind Speeds: <strong style="color:#ef4444;">${p.winds || '200+ mph'}</strong>
            </div>
            ${p.official_winds ? `<div style="font-size:0.78rem; color:#94a3b8; margin-bottom:3px;">Official 3s Gust: <strong>${p.official_winds}</strong></div>` : ''}
            <div style="font-size:0.8rem; color:#94a3b8; margin-bottom:4px; display:flex; gap:12px;">
              ${p.path_length ? `<span>Path: <strong style="color:#f8fafc;">${p.path_length}</strong></span>` : ''}
              ${p.max_width ? `<span>Width: <strong style="color:#f8fafc;">${p.max_width}</strong></span>` : ''}
            </div>
            ${p.deaths !== undefined ? `<div style="font-size:0.8rem; color:#f87171; margin-bottom:5px;">Fatalities: <strong>${p.deaths}</strong></div>` : ''}
            <div style="font-size:0.78rem; color:#94a3b8; margin-bottom:6px; line-height:1.35;">
              ${p.desc || 'Historic violent tornado outbreak record.'}
            </div>
            ${TPM.getGoogleMapsButton(coords[1], coords[0], 'Open in Google Maps')}
          `, { className: 'custom-popup tornado-popup', estimatedHeight: 310 });
        }
        return true;
      }

      // 3. Northern Lights Stations
      const auroraStation = features.find(f => f.layer.id === 'aurora-stations');
      if (auroraStation) {
        const p = auroraStation.properties;
        const coords = auroraStation.geometry && auroraStation.geometry.coordinates ? auroraStation.geometry.coordinates : [e.lngLat.lng, e.lngLat.lat];
        TPM.showSmartPopup(coords, `
          <div class="popup-title" style="color:#4ade80; font-weight:700;">✨ ${p.name} Aurora Station</div>
          <div class="popup-meta" style="color:#cbd5e1; margin-bottom:5px;">${p.country || ''} &bull; <strong style="color:#a7f3d0;">${p.region || 'Auroral Oval'}</strong></div>
          <div style="font-size:0.75rem; color:#38bdf8; font-family:var(--font-mono); margin-bottom:6px; display:flex; align-items:center; gap:5px; background:rgba(56,189,248,0.1); padding:3px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.2);">
            <i class="fa-solid fa-location-crosshairs" style="color:#38bdf8;"></i>
            <span>${TPM.formatGeodeticCoords(coords[1], coords[0])}</span>
          </div>
          <div style="font-size:0.83rem; color:#cbd5e1; margin-bottom:6px;">Required Storm Activity: <strong style="color:#facc15;">${p.kp_threshold || 'Kp 2+'}</strong></div>
          <div style="font-size:0.78rem; color:#94a3b8; margin-bottom:6px; line-height:1.35;">Prime polar geomagnetic observatory where Earth magnetic field channels solar wind ions into the upper atmosphere.</div>
          ${TPM.getGoogleMapsButton(coords[1], coords[0], 'Open in Google Maps')}
        `, { className: 'custom-popup aurora-popup', estimatedHeight: 260 });
        return true;
      }

      // 3b. Auroral Oval Belt
      const auroraLine = features.find(f => f.layer.id === 'aurora-line');
      if (auroraLine) {
        const p = auroraLine.properties;
        TPM.showSmartPopup(e.lngLat, `
          <div class="popup-title" style="color:#4ade80; font-weight:700;">✨ ${p.name || 'Auroral Oval'}</div>
          <div class="popup-meta" style="color:#a7f3d0; margin-bottom:5px;">${p.zone || 'Polar Auroral Belt'}</div>
          <div style="font-size:0.82rem; color:#cbd5e1; margin-bottom:6px; line-height:1.35;">${p.desc || ''}</div>
          ${TPM.getGoogleMapsButton(e.lngLat.lat, e.lngLat.lng, 'Open in Google Maps')}
        `, { className: 'custom-popup aurora-popup', estimatedHeight: 210 });
        return true;
      }

      // 4. Ocean Trenches
      const trench = features.find(f => f.layer.id === 'trenches-points');
      if (trench) {
        const p = trench.properties;
        const coords = trench.geometry && trench.geometry.coordinates ? trench.geometry.coordinates : [e.lngLat.lng, e.lngLat.lat];
        TPM.showSmartPopup(coords, `
          <div class="popup-title" style="color:#818cf8; font-weight:700;">🌊 ${p.name}</div>
          <div class="popup-meta" style="color:#cbd5e1; margin-bottom:5px;">Max Depth: <strong style="color:#38bdf8;">${p.depth}</strong></div>
          <div style="font-size:0.75rem; color:#38bdf8; font-family:var(--font-mono); margin-bottom:6px; display:flex; align-items:center; gap:5px; background:rgba(56,189,248,0.1); padding:3px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.2);">
            <i class="fa-solid fa-location-crosshairs" style="color:#38bdf8;"></i>
            <span>${TPM.formatGeodeticCoords(coords[1], coords[0])}</span>
          </div>
          <div style="font-size:0.83rem; color:#cbd5e1; margin-bottom:4px;">Plate Subduction: <strong style="color:#f8fafc;">${p.plate}</strong></div>
          <div style="font-size:0.78rem; color:#94a3b8; margin-bottom:6px; line-height:1.35;">${p.desc}</div>
          ${TPM.getGoogleMapsButton(coords[1], coords[0], 'Open in Google Maps')}
        `, { className: 'custom-popup trench-popup', estimatedHeight: 260 });
        return true;
      }

      // 5. Impact Craters
      const crater = features.find(f => f.layer.id === 'craters-points');
      if (crater) {
        const p = crater.properties;
        const coords = crater.geometry && crater.geometry.coordinates ? crater.geometry.coordinates : [e.lngLat.lng, e.lngLat.lat];
        TPM.showSmartPopup(coords, `
          <div class="popup-title" style="color:#fbbf24; font-weight:700;">💥 ${p.name}</div>
          <div class="popup-meta" style="color:#cbd5e1; margin-bottom:5px;">${p.country} &bull; Age: <strong style="color:#f87171;">${p.age}</strong></div>
          <div style="font-size:0.75rem; color:#38bdf8; font-family:var(--font-mono); margin-bottom:6px; display:flex; align-items:center; gap:5px; background:rgba(56,189,248,0.1); padding:3px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.2);">
            <i class="fa-solid fa-location-crosshairs" style="color:#38bdf8;"></i>
            <span>${TPM.formatGeodeticCoords(coords[1], coords[0])}</span>
          </div>
          <div style="font-size:0.83rem; color:#cbd5e1; margin-bottom:4px;">Crater Diameter: <strong style="color:#fef08a;">${p.diameter}</strong></div>
          <div style="font-size:0.78rem; color:#94a3b8; margin-bottom:6px; line-height:1.35;">${p.desc}</div>
          ${TPM.getGoogleMapsButton(coords[1], coords[0], 'Open in Google Maps')}
        `, { className: 'custom-popup crater-popup', estimatedHeight: 260 });
        return true;
      }

      return false;
    },

    handleHoverTooltip: function (features, e, tooltip) {
      const volcanoFeat = features.find(f => f.layer.id === 'volcanoes-active' || f.layer.id === 'volcanoes-recent-dormant' || f.layer.id === 'volcanoes-ancient-dormant' || f.layer.id === 'volcanoes-summit-point');
      const trenchFeat = features.find(f => f.layer.id === 'trenches-points');
      const craterFeat = features.find(f => f.layer.id === 'craters-points');
      const hurricaneFeat = features.find(f => f.layer.id === 'hurricanes-points' || f.layer.id === 'hurricanes-symbol');
      const tornadoFeat = features.find(f => f.layer.id === 'tornadoes-points' || f.layer.id === 'tornadoes-polygon-fill' || f.layer.id === 'tornadoes-track-line');
      const auroraFeat = features.find(f => f.layer.id === 'aurora-stations');

      if (volcanoFeat && tooltip) {
        const vp = volcanoFeat.properties;
        const yr = vp.last_eruption_year;
        const statusLabel = yr >= 1950 ? 'Active' : (yr >= 0 ? 'Recent Dormant' : 'Ancient Dormant');
        const statusColor = yr >= 1950 ? '#ef4444' : (yr >= 0 ? '#f59e0b' : '#94a3b8');
        const coords = volcanoFeat.geometry && volcanoFeat.geometry.coordinates ? volcanoFeat.geometry.coordinates : null;
        const coordStr = coords ? TPM.formatGeodeticCoords(coords[1], coords[0]) : '';
        tooltip.innerHTML = `
          <div style="font-weight:700; color:#fff; font-size:0.92rem; margin-bottom:2px;">🌋 ${vp.name}</div>
          <div style="font-size:0.75rem; color:#cbd5e1; margin-bottom:2px;">${vp.country} &bull; Elev: <strong style="color:#fef08a;">${vp.elevation || 'N/A'}</strong></div>
          ${coordStr ? `<div style="font-size:0.7rem; color:#38bdf8; font-family:var(--font-mono); margin-bottom:3px;">📍 ${coordStr}</div>` : ''}
          <div style="font-size:0.72rem; color:${statusColor}; font-weight:700; display:flex; align-items:center; gap:4px;">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${statusColor};"></span>
            <span>${statusLabel}</span> &bull; <span style="color:#94a3b8; font-weight:500;">${vp.type || 'Volcano'}</span>
          </div>
        `;
        TPM.updateHoverTooltipPosition(tooltip, e.point);
        tooltip.style.display = 'block';
        tooltip.style.opacity = '1';
        return true;
      } else if (trenchFeat && tooltip) {
        const tp = trenchFeat.properties;
        const coords = trenchFeat.geometry && trenchFeat.geometry.coordinates ? trenchFeat.geometry.coordinates : null;
        tooltip.innerHTML = `
          <div style="font-weight:700; color:#818cf8; font-size:0.92rem; margin-bottom:2px;">🌊 ${tp.name}</div>
          <div style="font-size:0.75rem; color:#cbd5e1; margin-bottom:2px;">Max Depth: <strong style="color:#38bdf8;">${tp.depth}</strong></div>
          ${coords ? `<div style="font-size:0.7rem; color:#38bdf8; font-family:var(--font-mono); margin-bottom:2px;">📍 ${TPM.formatGeodeticCoords(coords[1], coords[0])}</div>` : ''}
          <div style="font-size:0.72rem; color:#94a3b8;">${tp.plate}</div>
        `;
        TPM.updateHoverTooltipPosition(tooltip, e.point);
        tooltip.style.display = 'block';
        tooltip.style.opacity = '1';
        return true;
      } else if (craterFeat && tooltip) {
        const cp = craterFeat.properties;
        const coords = craterFeat.geometry && craterFeat.geometry.coordinates ? craterFeat.geometry.coordinates : null;
        tooltip.innerHTML = `
          <div style="font-weight:700; color:#fbbf24; font-size:0.92rem; margin-bottom:2px;">💥 ${cp.name}</div>
          <div style="font-size:0.75rem; color:#cbd5e1; margin-bottom:2px;">Diameter: <strong style="color:#fef08a;">${cp.diameter}</strong> &bull; Age: <strong style="color:#f87171;">${cp.age}</strong></div>
          ${coords ? `<div style="font-size:0.7rem; color:#38bdf8; font-family:var(--font-mono); margin-bottom:2px;">📍 ${TPM.formatGeodeticCoords(coords[1], coords[0])}</div>` : ''}
          <div style="font-size:0.72rem; color:#94a3b8;">${cp.country}</div>
        `;
        TPM.updateHoverTooltipPosition(tooltip, e.point);
        tooltip.style.display = 'block';
        tooltip.style.opacity = '1';
        return true;
      } else if (hurricaneFeat && tooltip) {
        const hp = hurricaneFeat.properties;
        tooltip.innerHTML = `
          <div style="font-weight:700; color:#38bdf8; font-size:0.92rem; margin-bottom:2px;">🌀 ${hp.name} ${hp.year ? `(${hp.year})` : ''}</div>
          <div style="font-size:0.75rem; color:#cbd5e1; margin-bottom:2px;">Intensity: <strong style="color:${hp.color || '#f87171'};">${hp.category || 'Storm'}</strong></div>
          <div style="font-size:0.72rem; color:#94a3b8;">Winds: <strong style="color:#fef08a;">${hp.max_winds || hp.winds || '160+ mph'}</strong></div>
        `;
        TPM.updateHoverTooltipPosition(tooltip, e.point);
        tooltip.style.display = 'block';
        tooltip.style.opacity = '1';
        return true;
      } else if (tornadoFeat && tooltip) {
        const tp = tornadoFeat.properties;
        const isLive = tp.is_live;
        tooltip.innerHTML = `
          <div style="font-weight:700; color:${tp.color || '#ef4444'}; font-size:0.92rem; margin-bottom:2px;">🌪️ ${tp.name || tp.event || 'Tornado'}</div>
          <div style="font-size:0.75rem; color:#cbd5e1; margin-bottom:2px;">${isLive ? 'Live NOAA Alert' : (tp.ef_scale || 'EF5')} &bull; <strong style="color:#fef08a;">${tp.winds || tp.severity || 'Violent'}</strong></div>
          <div style="font-size:0.72rem; color:#94a3b8;">${isLive ? (tp.area_desc || 'Warning Zone') : (tp.state || '')}</div>
        `;
        TPM.updateHoverTooltipPosition(tooltip, e.point);
        tooltip.style.display = 'block';
        tooltip.style.opacity = '1';
        return true;
      } else if (auroraFeat && tooltip) {
        const ap = auroraFeat.properties;
        const coords = auroraFeat.geometry && auroraFeat.geometry.coordinates ? auroraFeat.geometry.coordinates : null;
        tooltip.innerHTML = `
          <div style="font-weight:700; color:#4ade80; font-size:0.92rem; margin-bottom:2px;">✨ ${ap.name}</div>
          <div style="font-size:0.75rem; color:#cbd5e1; margin-bottom:2px;">${ap.country || ''} &bull; ${ap.region || 'Auroral Oval'}</div>
          ${coords ? `<div style="font-size:0.7rem; color:#38bdf8; font-family:var(--font-mono); margin-bottom:2px;">📍 ${TPM.formatGeodeticCoords(coords[1], coords[0])}</div>` : ''}
          <div style="font-size:0.72rem; color:#facc15;">Activity: <strong>${ap.kp_threshold || 'Kp 2+'}</strong></div>
        `;
        TPM.updateHoverTooltipPosition(tooltip, e.point);
        tooltip.style.display = 'block';
        tooltip.style.opacity = '1';
        return true;
      }
      return false;
    },

    toggleVolcanoCategory: function (cat) {
      const state = TPM.state;
      if (!state.volcanoCategories) {
        state.volcanoCategories = { active: true, recent: true, ancient: true, magmaArc: true };
      }

      if (cat === 'magmaArc') {
        state.volcanoCategories.magmaArc = !state.volcanoCategories.magmaArc;
        PhenomenaModule.applyVolcanoCategoryVisibility();
        PhenomenaModule.updateVolcanoLegendUI();
        return;
      }

      const allActive = state.volcanoCategories.active && state.volcanoCategories.recent && state.volcanoCategories.ancient;

      if (allActive) {
        // NARROW DOWN: isolate this category
        state.volcanoCategories.active = (cat === 'active');
        state.volcanoCategories.recent = (cat === 'recent');
        state.volcanoCategories.ancient = (cat === 'ancient');
      } else {
        const isSoleActive = state.volcanoCategories[cat] &&
          ['active', 'recent', 'ancient'].filter(c => state.volcanoCategories[c]).length === 1;

        if (isSoleActive) {
          // If clicking the sole active category, restore all 3!
          state.volcanoCategories.active = true;
          state.volcanoCategories.recent = true;
          state.volcanoCategories.ancient = true;
        } else {
          state.volcanoCategories[cat] = !state.volcanoCategories[cat];
          if (!state.volcanoCategories.active && !state.volcanoCategories.recent && !state.volcanoCategories.ancient) {
            state.volcanoCategories.active = true;
            state.volcanoCategories.recent = true;
            state.volcanoCategories.ancient = true;
          }
        }
      }

      PhenomenaModule.applyVolcanoCategoryVisibility();
      PhenomenaModule.updateVolcanoLegendUI();
    },

    resetVolcanoFilters: function () {
      const state = TPM.state;
      state.volcanoCategories = { active: true, recent: true, ancient: true, magmaArc: true };
      PhenomenaModule.applyVolcanoCategoryVisibility();
      PhenomenaModule.updateVolcanoLegendUI();
    },

    applyVolcanoCategoryVisibility: function () {
      const state = TPM.state;
      const map = state.map;
      if (!map) return;
      const cats = state.volcanoCategories || { active: true, recent: true, ancient: true, magmaArc: true };
      const isVolcanoesVisible = state.layersVisibility.volcanoes;

      if (map.getLayer('volcanoes-active')) {
        map.setLayoutProperty('volcanoes-active', 'visibility', (isVolcanoesVisible && cats.active) ? 'visible' : 'none');
      }
      if (map.getLayer('volcanoes-recent-dormant')) {
        map.setLayoutProperty('volcanoes-recent-dormant', 'visibility', (isVolcanoesVisible && cats.recent) ? 'visible' : 'none');
      }
      if (map.getLayer('volcanoes-ancient-dormant')) {
        map.setLayoutProperty('volcanoes-ancient-dormant', 'visibility', (isVolcanoesVisible && cats.ancient) ? 'visible' : 'none');
      }

      if (map.getLayer('volcanoes-summit-point')) {
        const anyOn = cats.active || cats.recent || cats.ancient;
        map.setLayoutProperty('volcanoes-summit-point', 'visibility', (isVolcanoesVisible && anyOn) ? 'visible' : 'none');
        if (anyOn) {
          const summitFilters = ['any'];
          if (cats.active) summitFilters.push(['>=', ['get', 'last_eruption_year'], 1950]);
          if (cats.recent) summitFilters.push(['all', ['>=', ['get', 'last_eruption_year'], 0], ['<', ['get', 'last_eruption_year'], 1950]]);
          if (cats.ancient) summitFilters.push(['<', ['get', 'last_eruption_year'], 0]);
          map.setFilter('volcanoes-summit-point', summitFilters.length > 1 ? summitFilters : null);
        }
      }

      if (map.getLayer('boundaries-line')) {
        map.setLayoutProperty('boundaries-line', 'visibility', cats.magmaArc ? 'visible' : 'none');
      }
      if (map.getLayer('boundaries-line-glow')) {
        map.setLayoutProperty('boundaries-line-glow', 'visibility', cats.magmaArc ? 'visible' : 'none');
      }

      PhenomenaModule.updateVolcanoBadgeCount();

      // Close popup if currently open volcano feature got filtered out
      const popup = document.querySelector('.maplibregl-popup');
      if (popup && popup.classList.contains('volcano-popup')) {
        const closeBtn = popup.querySelector('.maplibregl-popup-close-button');
        if (closeBtn) closeBtn.click();
      }
    },

    updateVolcanoLegendUI: function () {
      const state = TPM.state;
      const cats = state.volcanoCategories || { active: true, recent: true, ancient: true, magmaArc: true };
      const allThreeOn = cats.active && cats.recent && cats.ancient;

      const btnActive = document.getElementById('btn-filter-volcano-active');
      const btnRecent = document.getElementById('btn-filter-volcano-recent');
      const btnAncient = document.getElementById('btn-filter-volcano-ancient');
      const btnMagma = document.getElementById('btn-filter-volcano-magma');
      const btnAll = document.getElementById('btn-filter-volcano-all');
      const allLabel = document.getElementById('volcano-all-label');

      if (btnActive) {
        btnActive.classList.toggle('is-active', cats.active);
        btnActive.classList.toggle('is-muted', !cats.active && !allThreeOn);
        btnActive.setAttribute('aria-pressed', cats.active ? 'true' : 'false');
      }
      if (btnRecent) {
        btnRecent.classList.toggle('is-active', cats.recent);
        btnRecent.classList.toggle('is-muted', !cats.recent && !allThreeOn);
        btnRecent.setAttribute('aria-pressed', cats.recent ? 'true' : 'false');
      }
      if (btnAncient) {
        btnAncient.classList.toggle('is-active', cats.ancient);
        btnAncient.classList.toggle('is-muted', !cats.ancient && !allThreeOn);
        btnAncient.setAttribute('aria-pressed', cats.ancient ? 'true' : 'false');
      }
      if (btnMagma) {
        btnMagma.classList.toggle('is-active', cats.magmaArc);
        btnMagma.classList.toggle('is-muted', !cats.magmaArc);
        btnMagma.setAttribute('aria-pressed', cats.magmaArc ? 'true' : 'false');
      }
      if (btnAll) {
        btnAll.classList.toggle('is-active', allThreeOn);
        if (allLabel) {
          allLabel.innerHTML = allThreeOn 
            ? 'Smithsonian GVP' 
            : '<i class="fa-solid fa-rotate-left mr-1" style="color:#38bdf8;"></i>Reset';
        }
      }
    },

    updateVolcanoBadgeCount: function () {
      const state = TPM.state;
      const cats = state.volcanoCategories || { active: true, recent: true, ancient: true, magmaArc: true };
      const counts = PhenomenaModule.getVolcanoCategoryCounts();
      let visibleSum = 0;
      if (cats.active) visibleSum += counts.active;
      if (cats.recent) visibleSum += counts.recent;
      if (cats.ancient) visibleSum += counts.ancient;

      const badge = document.getElementById('mode-filter-badge');
      const cardBadge = document.getElementById('card-badge-volcanoes');

      if (badge) {
        if (cats.active && cats.recent && cats.ancient) {
          badge.textContent = `${visibleSum.toLocaleString()} Volcanoes`;
        } else if (cats.active && !cats.recent && !cats.ancient) {
          badge.textContent = `${visibleSum.toLocaleString()} Active Volcanoes`;
        } else if (!cats.active && cats.recent && !cats.ancient) {
          badge.textContent = `${visibleSum.toLocaleString()} Recent Dormant`;
        } else if (!cats.active && !cats.recent && cats.ancient) {
          badge.textContent = `${visibleSum.toLocaleString()} Ancient Dormant`;
        } else {
          badge.textContent = `${visibleSum.toLocaleString()} Volcanoes`;
        }
        badge.className = 'mode-filter-badge badge-alert-volcanoes';
      }

      if (cardBadge) {
        cardBadge.textContent = visibleSum >= 1000 ? (visibleSum / 1000).toFixed(1) + 'k' : visibleSum;
      }
    },

    getVolcanoCategoryCounts: function () {
      const state = TPM.state;
      let active = 359, recent = 319, ancient = 539, total = 1217;
      if (window.TECTONIC_DATA && window.TECTONIC_DATA.volcanoes && window.TECTONIC_DATA.volcanoes.features) {
        const feats = getVolcanoesDataByFilter(state.currentVolcanoFilter).features || [];
        active = 0; recent = 0; ancient = 0;
        for (let i = 0; i < feats.length; i++) {
          const yr = feats[i].properties.last_eruption_year;
          if (yr >= 1950) active++;
          else if (yr >= 0) recent++;
          else ancient++;
        }
        total = feats.length;
      }
      return { active, recent, ancient, total };
    },

    updateVolcanoCountsUI: function () {
      const counts = PhenomenaModule.getVolcanoCategoryCounts();
      const elActive = document.getElementById('badge-volcano-count-active');
      const elRecent = document.getElementById('badge-volcano-count-recent');
      const elAncient = document.getElementById('badge-volcano-count-ancient');
      const elAll = document.getElementById('badge-volcano-count-all');

      if (elActive) elActive.textContent = counts.active;
      if (elRecent) elRecent.textContent = counts.recent;
      if (elAncient) elAncient.textContent = counts.ancient;
      if (elAll) elAll.textContent = counts.total >= 1000 ? (counts.total / 1000).toFixed(1) + 'k' : counts.total;
    },

    getHurricaneCategoryCounts: function () {
      const points = (window.TECTONIC_DATA && window.TECTONIC_DATA.hurricanePoints && window.TECTONIC_DATA.hurricanePoints.features) || [];
      const counts = {
        'TD': 0,
        'TS': 0,
        'Cat 1': 0,
        'Cat 2': 0,
        'Cat 3': 0,
        'Cat 4': 0,
        'Cat 5': 0,
        'total': points.length
      };
      points.forEach(f => {
        const p = f.properties || {};
        let cat = p.category || '';
        if (counts[cat] !== undefined) {
          counts[cat]++;
        }
      });
      return counts;
    },

    toggleHurricaneCategory: function (cat) {
      const state = TPM.state;
      if (state.hurricaneCategoryFilter === cat) {
        state.hurricaneCategoryFilter = null;
      } else {
        state.hurricaneCategoryFilter = cat;
      }
      PhenomenaModule.applyHurricaneCategoryFilter();
      PhenomenaModule.renderLegend('hurricanes');
      PhenomenaModule.updateHurricaneBadgeCount();
    },

    resetHurricaneFilters: function () {
      TPM.state.hurricaneCategoryFilter = null;
      PhenomenaModule.applyHurricaneCategoryFilter();
      PhenomenaModule.renderLegend('hurricanes');
      PhenomenaModule.updateHurricaneBadgeCount();
    },

    applyHurricaneCategoryFilter: function () {
      const state = TPM.state;
      const map = state.map;
      if (!map) return;
      const filterExpr = state.hurricaneCategoryFilter
        ? ['==', ['get', 'category'], state.hurricaneCategoryFilter]
        : null;

      ['hurricanes-symbol', 'hurricanes-radar-pulse', 'hurricanes-points', 'hurricanes-line', 'hurricanes-glow'].forEach(layerId => {
        if (map.getLayer(layerId)) {
          map.setFilter(layerId, filterExpr);
        }
      });

      if (state.hurricaneCategoryFilter && TPM.currentPopup) {
        TPM.currentPopup.remove();
        TPM.currentPopup = null;
      }
    },

    updateHurricaneBadgeCount: function () {
      const state = TPM.state;
      const badge = document.getElementById('mode-filter-badge');
      const counts = PhenomenaModule.getHurricaneCategoryCounts();
      if (!badge) return;

      if (state.hurricaneCategoryFilter) {
        const c = counts[state.hurricaneCategoryFilter] || 0;
        badge.textContent = `${c} ${state.hurricaneCategoryFilter} (${state.currentHurricaneFilter === 'active' ? 'Live' : 'Season'})`;
        badge.className = 'mode-filter-badge badge-alert-active';
      } else {
        const total = counts.total;
        badge.textContent = state.currentHurricaneFilter === 'active'
          ? (total > 0 ? `${total} Active (Live)` : '0 Active (Quiet)')
          : `${total.toLocaleString()} Storms`;
        badge.className = `mode-filter-badge ${total > 0 ? 'badge-alert-active' : 'badge-alert-zero'}`;
      }
    },

    activate: function (mode) {
      const map = TPM.state.map;
      TPM.loadDataset(mode).then(() => {
        PhenomenaModule.initLayers(map);
        PhenomenaModule.renderLegend(mode);
        PhenomenaModule.updateFilterUI();
        if (mode === 'volcanoes') {
          PhenomenaModule.applyVolcanoCategoryVisibility();
          PhenomenaModule.updateVolcanoLegendUI();
        } else if (mode === 'hurricanes') {
          PhenomenaModule.applyHurricaneCategoryFilter();
        }
      });
    }
  };

  window.onModeFilterChange = PhenomenaModule.onFilterChange;
  window.onAuroraFilterChange = function (val) {
    PhenomenaModule.updateAuroraFilter(val);
  };
  window.TPM_Phenomena = PhenomenaModule;
  TPM.phenomena = PhenomenaModule;
})();
