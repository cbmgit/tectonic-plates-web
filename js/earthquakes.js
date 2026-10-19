/**
 * Tectonic Plates Map - Earthquakes Subsystem (Lazy-Loaded Module)
 * Handles USGS Live Seismology Feeds, Offline Snapshot Fallback, Heatmaps,
 * 24h Pulse Rings, Time/Magnitude Filtering, and Top 10 Quakes Drawer.
 */
(function () {
  'use strict';

  const TPM = window.TPM;
  if (!TPM) {
    console.error('[TPM_Earthquakes] Core TPM namespace not found');
    return;
  }

  let isQuakeSyncing = false;
  let bgIntervalId = null;
  let shouldCenterOnActivate = true;
  const quakeDatasetCache = {
    30: null,
    60: null,
    90: null,
    365: null
  };

  const EarthquakesModule = {
    initLayers: function (map) {
      if (!map) return;
      const state = TPM.state;

      if (!map.getSource('earthquakes')) {
        map.addSource('earthquakes', {
          type: 'geojson',
          data: state.earthquakesData || { type: 'FeatureCollection', features: [] },
          cluster: false
        });
      }

      // A. Earthquakes Heatmap
      if (!map.getLayer('earthquakes-heat')) {
        map.addLayer({
          id: 'earthquakes-heat',
          type: 'heatmap',
          source: 'earthquakes',
          maxzoom: 4.5,
          layout: {
            visibility: state.layersVisibility.earthquakes ? 'visible' : 'none'
          },
          paint: {
            'heatmap-weight': [
              'interpolate', ['linear'], ['get', 'mag'],
              2.5, 0.25,
              5.0, 0.6,
              7.0, 1.0
            ],
            'heatmap-intensity': [
              'interpolate', ['linear'], ['zoom'],
              0, 0.5,
              3, 1.2
            ],
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0, 0, 0, 0)',
              0.2, '#3b528b',
              0.4, '#21918c',
              0.6, '#5ec962',
              0.8, '#fde725',
              1.0, '#ff3860'
            ],
            'heatmap-radius': [
              'interpolate', ['linear'], ['zoom'],
              0, 4,
              3, 16
            ],
            'heatmap-opacity': [
              'interpolate', ['linear'], ['zoom'],
              1, 0.8,
              3, 0.6,
              4, 0
            ]
          }
        });
      }

      // B. Last 24-Hour Accent Ring
      if (!map.getLayer('earthquakes-24h-ring')) {
        map.addLayer({
          id: 'earthquakes-24h-ring',
          type: 'circle',
          source: 'earthquakes',
          minzoom: 2,
          filter: ['all', ['>=', ['get', 'time'], Date.now() - 24 * 60 * 60 * 1000]],
          layout: {
            visibility: state.layersVisibility.earthquakes ? 'visible' : 'none'
          },
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              2, ['interpolate', ['linear'], ['get', 'mag'], 2.5, 4.5, 5, 8, 7, 14, 8.5, 20],
              8, ['interpolate', ['linear'], ['get', 'mag'], 2.5, 7, 5, 13, 7, 23, 8.5, 34]
            ],
            'circle-color': 'transparent',
            'circle-stroke-width': 1.8,
            'circle-stroke-color': '#f87171',
            'circle-stroke-opacity': 0.95
          }
        });
      }

      // C. Unclustered Individual Quakes
      if (!map.getLayer('earthquakes-points')) {
        map.addLayer({
          id: 'earthquakes-points',
          type: 'circle',
          source: 'earthquakes',
          minzoom: 1.5,
          layout: {
            visibility: state.layersVisibility.earthquakes ? 'visible' : 'none',
            'circle-sort-key': ['get', 'mag']
          },
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              2, ['interpolate', ['linear'], ['get', 'mag'], 2.5, 2.5, 5, 5, 7, 10, 8.5, 16],
              8, ['interpolate', ['linear'], ['get', 'mag'], 2.5, 4, 5, 9, 7, 18, 8.5, 28]
            ],
            'circle-color': [
              'interpolate', ['linear'], ['get', 'depth'],
              0,   '#fde725',
              35,  '#5ec962',
              70,  '#21918c',
              150, '#3b528b',
              300, '#440154',
              700, '#1a002c'
            ],
            'circle-stroke-width': 1.0,
            'circle-stroke-color': 'rgba(15, 23, 42, 0.95)',
            'circle-opacity': [
              'interpolate', ['linear'], ['zoom'],
              2, 0.45,
              3, 0.85,
              4, 0.95
            ]
          }
        });
      }

      // D. Peak Event Spotlight Source & Layers
      if (!map.getSource('earthquakes-peak')) {
        map.addSource('earthquakes-peak', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
      }

      // D1. Outer Golden Spotlight Halo
      if (!map.getLayer('earthquakes-peak-halo')) {
        map.addLayer({
          id: 'earthquakes-peak-halo',
          type: 'circle',
          source: 'earthquakes-peak',
          minzoom: 1.5,
          layout: {
            visibility: state.layersVisibility.earthquakes ? 'visible' : 'none'
          },
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              1.5, 14,
              5, 24,
              10, 36
            ],
            'circle-color': '#f59e0b',
            'circle-opacity': 0.28,
            'circle-stroke-width': 2.2,
            'circle-stroke-color': '#fbbf24',
            'circle-stroke-opacity': 0.95
          }
        }, 'earthquakes-points');
      }

      // D2. Inner Focus Ring
      if (!map.getLayer('earthquakes-peak-ring')) {
        map.addLayer({
          id: 'earthquakes-peak-ring',
          type: 'circle',
          source: 'earthquakes-peak',
          minzoom: 1.5,
          layout: {
            visibility: state.layersVisibility.earthquakes ? 'visible' : 'none'
          },
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              1.5, 8,
              5, 13,
              10, 20
            ],
            'circle-color': 'transparent',
            'circle-stroke-width': 2.5,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-opacity': 0.95
          }
        });
      }

      // D3. Floating Peak Event Badge
      if (!map.getLayer('earthquakes-peak-label')) {
        map.addLayer({
          id: 'earthquakes-peak-label',
          type: 'symbol',
          source: 'earthquakes-peak',
          minzoom: 1.5,
          layout: {
            visibility: state.layersVisibility.earthquakes ? 'visible' : 'none',
            'text-field': ['get', 'spotlight_label'],
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-size': [
              'interpolate', ['linear'], ['zoom'],
              1.5, 11,
              5, 12.5,
              10, 14
            ],
            'text-offset': [0, -1.8],
            'text-anchor': 'bottom',
            'text-allow-overlap': true,
            'text-ignore-placement': true
          },
          paint: {
            'text-color': '#fde047',
            'text-halo-color': '#070b14',
            'text-halo-width': 2.5
          }
        });
      }

      EarthquakesModule.applyFilters();
    },

    refresh: function (isUserTriggered = false) {
      const state = TPM.state;
      if (isUserTriggered) {
        if (typeof window.switchMapMode === 'function' && state.currentMode !== 'earthquakes') {
          window.switchMapMode('earthquakes', true);
        }
        if (typeof window.setQuakeTimeWindow === 'function') {
          window.setQuakeTimeWindow('24h');
        }
      }

      if (isQuakeSyncing) return;
      isQuakeSyncing = true;

      const navBadge = document.getElementById('quake-count-badge');
      if (navBadge) {
        navBadge.classList.add('is-syncing');
        navBadge.innerHTML = `<span class="icon is-small"><i class="fa-solid fa-arrows-rotate fa-spin" aria-hidden="true"></i></span><span>Syncing...</span>`;
        navBadge.title = 'Fetching latest real-time earthquake data from USGS...';
      }

      const cacheBuster = isUserTriggered ? `?_t=${Date.now()}` : '';
      const EDGE_FEED = `/api/earthquakes${cacheBuster}`;
      const USGS_FEED = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson${cacheBuster}`;

      fetch(EDGE_FEED, {
        cache: isUserTriggered ? 'reload' : 'default',
        headers: { 'Accept': 'application/geo+json, application/json' }
      })
        .then(res => {
          if (!res.ok) throw new Error(`Edge status ${res.status}`);
          return res.json();
        })
        .catch(() => {
          return fetch(USGS_FEED, {
            cache: isUserTriggered ? 'reload' : 'default',
            headers: { 'Accept': 'application/geo+json, application/json' }
          }).then(res => {
            if (!res.ok) throw new Error(`USGS status ${res.status}`);
            return res.json();
          });
        })
        .then(data => {
          EarthquakesModule.processData(data, false, isUserTriggered);
        })
        .catch(() => {
          TPM.loadDataset('earthquakesSnapshot').then(snapshot => {
            if (snapshot) {
              EarthquakesModule.processData(snapshot, true, isUserTriggered);
            } else {
              const badge = document.getElementById('mode-filter-badge');
              if (badge && state.currentMode === 'earthquakes') badge.textContent = '0 (past 30 days)';
              if (navBadge) {
                navBadge.classList.remove('is-syncing');
                navBadge.innerHTML = `<span class="icon is-small"><i class="fa-solid fa-cloud" aria-hidden="true"></i></span><span>Offline</span>`;
                navBadge.title = 'USGS earthquake feed offline';
              }
              isQuakeSyncing = false;
            }
          });
        });
    },

    processData: function (geojson, isStale, isUserTriggered = false) {
      isQuakeSyncing = false;
      const state = TPM.state;

      if (geojson && Array.isArray(geojson.features)) {
        for (let i = 0; i < geojson.features.length; i++) {
          const f = geojson.features[i];
          if (f.geometry && Array.isArray(f.geometry.coordinates)) {
            f.properties = f.properties || {};
            if (typeof f.properties.depth !== 'number') {
              f.properties.depth = typeof f.geometry.coordinates[2] === 'number' ? f.geometry.coordinates[2] : 0;
            }
          }
        }
      }

      state.earthquakesData = geojson;
      quakeDatasetCache[30] = geojson;
      if (!state.quakeTimeWindow) {
        state.quakeTimeWindow = '24h';
      }

      if (state.map && state.map.getSource('earthquakes')) {
        state.map.getSource('earthquakes').setData(geojson);
      }

      const totalCount = Array.isArray(geojson.features) ? geojson.features.length : 0;
      const now = Date.now();
      const past24hCutoff = now - 24 * 60 * 60 * 1000;
      const count24h = Array.isArray(geojson.features)
        ? geojson.features.filter(f => (f.properties?.time || 0) >= past24hCutoff).length
        : 0;

      const genTime = geojson.metadata?.generated || geojson.metadata?.cached_at || now;
      const mins = Math.max(0, Math.round((now - genTime) / 60000));

      const navBadge = document.getElementById('quake-count-badge');
      if (navBadge) {
        navBadge.classList.remove('is-syncing');

        if (isUserTriggered) {
          navBadge.classList.add('is-success-pulse');
          navBadge.innerHTML = `<span class="icon is-small"><i class="fa-solid fa-check" style="color:#10b981;" aria-hidden="true"></i></span><span>Updated! (${count24h} today)</span>`;
          navBadge.title = `USGS feed refreshed just now! (${count24h} earthquakes M2.5+ in past 24 hours, ${totalCount.toLocaleString()} past 30 days) • Click to refresh again`;

          setTimeout(() => {
            if (navBadge) {
              navBadge.classList.remove('is-success-pulse');
              EarthquakesModule.renderBadge(navBadge, count24h, totalCount, mins, isStale);
            }
          }, 2000);
        } else {
          EarthquakesModule.renderBadge(navBadge, count24h, totalCount, mins, isStale);
        }
      }

      const cardBadge = document.getElementById('card-badge-earthquakes');
      if (cardBadge) {
        cardBadge.textContent = count24h > 0 ? `${count24h}` : (totalCount > 1000 ? `${(totalCount / 1000).toFixed(1)}k` : `${totalCount}`);
        cardBadge.title = `${count24h} earthquakes past 24 hours (${totalCount.toLocaleString()} past 30 days)`;
      }

      EarthquakesModule.applyFilters();
      EarthquakesModule.renderLegend();
      if (shouldCenterOnActivate) {
        shouldCenterOnActivate = false;
        EarthquakesModule.centerOnPeakQuake(1.2);
      }
    },

    renderBadge: function (badge, count24h, totalCount, minsAgo, isStale) {
      if (!badge) return;
      const timeAgoStr = minsAgo <= 1 ? 'just now' : `${minsAgo} min ago`;
      const staleNote = isStale ? ' (Cached data)' : '';
      badge.innerHTML = `<span class="icon is-small"><i class="fa-solid fa-bolt" aria-hidden="true"></i></span><span>${count24h} Today</span>`;
      badge.title = `Live USGS Earthquakes: ${count24h} quakes M2.5+ in past 24 hours (${totalCount.toLocaleString()} past 30 days) • Updated ${timeAgoStr}${staleNote} • Click to refresh in real time`;
    },

    setTimeWindow: function (winKey, centerOnPeak = true) {
      const state = TPM.state;
      state.quakeTimeWindow = winKey;

      if (typeof TPM.closePopup === 'function') {
        TPM.closePopup();
      }

      document.querySelectorAll('.quake-time-btn').forEach(btn => {
        const text = btn.textContent.trim().toLowerCase();
        const isMatch = (winKey === '24h' && (text === 'today' || text === '24h')) ||
                        (winKey === '7d' && (text === '7d' || text.includes('7'))) ||
                        (winKey === '30d' && (text === '30d' || text.includes('30'))) ||
                        (winKey === '60d' && (text === '60d' || text.includes('60'))) ||
                        (winKey === '90d' && (text === '90d' || text.includes('90'))) ||
                        (winKey === '1y' && (text === '1y' || text.includes('year') || text.includes('365')));
        btn.classList.toggle('is-active', isMatch);
      });

      const targetDays = winKey === '60d' ? 60 : (winKey === '90d' ? 90 : (winKey === '1y' ? 365 : 30));

      if (targetDays > 30 && (!quakeDatasetCache[targetDays] || !Array.isArray(quakeDatasetCache[targetDays].features))) {
        EarthquakesModule.fetchExtendedWindow(targetDays, winKey, centerOnPeak);
        return;
      }

      if (targetDays <= 30 && quakeDatasetCache[30] && state.earthquakesData !== quakeDatasetCache[30]) {
        state.earthquakesData = quakeDatasetCache[30];
        if (state.map && state.map.getSource('earthquakes')) {
          state.map.getSource('earthquakes').setData(state.earthquakesData);
        }
      } else if (targetDays > 30 && quakeDatasetCache[targetDays] && state.earthquakesData !== quakeDatasetCache[targetDays]) {
        state.earthquakesData = quakeDatasetCache[targetDays];
        if (state.map && state.map.getSource('earthquakes')) {
          state.map.getSource('earthquakes').setData(state.earthquakesData);
        }
      }

      EarthquakesModule.applyFilters();
      EarthquakesModule.renderLegend();
      if (centerOnPeak) {
        EarthquakesModule.centerOnPeakQuake(1.25);
      }
    },

    fetchExtendedWindow: function (days, winKey, centerOnPeak = true) {
      const state = TPM.state;
      const btn = document.getElementById(`btn-quake-time-${winKey}`);
      const badge = document.getElementById(`badge-quake-${winKey}`);
      if (badge) {
        badge.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin" style="font-size:0.65rem;" aria-hidden="true"></i>';
      }
      if (btn) btn.classList.add('is-loading');

      const filterBadge = document.getElementById('mode-filter-badge');
      if (filterBadge && state.currentMode === 'earthquakes') {
        filterBadge.textContent = 'Syncing...';
      }

      const startIso = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
      const minMag = days >= 365 ? 4.5 : 2.5;
      const EDGE_URL = `/api/earthquakes?days=${days}`;
      const USGS_QUERY_URL = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startIso}&minmagnitude=${minMag}`;

      fetch(EDGE_URL)
        .then(res => {
          if (!res.ok) throw new Error(`Edge error ${res.status}`);
          return res.json();
        })
        .catch(() => {
          return fetch(USGS_QUERY_URL).then(res => {
            if (!res.ok) throw new Error(`USGS query error ${res.status}`);
            return res.json();
          });
        })
        .then(data => {
          if (btn) btn.classList.remove('is-loading');
          if (data && Array.isArray(data.features)) {
            for (let i = 0; i < data.features.length; i++) {
              const f = data.features[i];
              if (f.geometry && Array.isArray(f.geometry.coordinates)) {
                f.properties = f.properties || {};
                if (typeof f.properties.depth !== 'number') {
                  f.properties.depth = typeof f.geometry.coordinates[2] === 'number' ? f.geometry.coordinates[2] : 0;
                }
              }
            }
          }

          quakeDatasetCache[days] = data;
          state.earthquakesData = data;
          if (state.map && state.map.getSource('earthquakes')) {
            state.map.getSource('earthquakes').setData(data);
          }

          EarthquakesModule.applyFilters();
          EarthquakesModule.renderLegend();
          if (centerOnPeak) {
            EarthquakesModule.centerOnPeakQuake(1.25);
          }
        })
        .catch(err => {
          console.warn(`[Earthquakes] Failed to fetch ${days}-day data:`, err);
          if (btn) btn.classList.remove('is-loading');
          state.quakeTimeWindow = '30d';
          EarthquakesModule.applyFilters();
          EarthquakesModule.renderLegend();
          if (centerOnPeak) {
            EarthquakesModule.centerOnPeakQuake(1.25);
          }
        });
    },

    setMinMag: function (val) {
      TPM.state.minMagFilter = parseFloat(val);
      const label = document.getElementById('mag-slider-val');
      if (label) label.textContent = TPM.state.minMagFilter.toFixed(1);
      const slider = document.getElementById('quake-mag-slider');
      if (slider) slider.value = TPM.state.minMagFilter;
      EarthquakesModule.applyFilters();
      EarthquakesModule.renderLegend();
    },

    toggleMagThreshold: function (threshold) {
      const state = TPM.state;
      if (state.minMagFilter === threshold) {
        state.minMagFilter = 2.5; // Toggle back to all
      } else {
        state.minMagFilter = threshold;
      }
      const label = document.getElementById('mag-slider-val');
      if (label) label.textContent = state.minMagFilter.toFixed(1);
      const slider = document.getElementById('quake-mag-slider');
      if (slider) slider.value = state.minMagFilter;
      EarthquakesModule.applyFilters();
      EarthquakesModule.renderLegend();
    },

    resetFilters: function () {
      const state = TPM.state;
      state.minMagFilter = 2.5;
      const label = document.getElementById('mag-slider-val');
      if (label) label.textContent = '2.5';
      const slider = document.getElementById('quake-mag-slider');
      if (slider) slider.value = '2.5';
      EarthquakesModule.applyFilters();
      EarthquakesModule.renderLegend();
    },

    toggleDrawer: function (forceState) {
      const drawer = document.getElementById('top-quakes-drawer');
      if (!drawer) return;
      if (typeof forceState === 'boolean') {
        drawer.classList.toggle('is-hidden', !forceState);
      } else {
        drawer.classList.toggle('is-hidden');
      }
    },

    applyFilters: function () {
      const state = TPM.state;
      if (!state.map || !state.earthquakesData || !Array.isArray(state.earthquakesData.features)) return;
      const now = Date.now();
      let timeCutoff = now - 24 * 60 * 60 * 1000; // Default to TODAY (past 24 hours)
      let winLabel = 'Today';

      if (state.quakeTimeWindow === '7d') {
        timeCutoff = now - 7 * 24 * 60 * 60 * 1000;
        winLabel = 'past 7 days';
      } else if (state.quakeTimeWindow === '30d') {
        timeCutoff = now - 30 * 24 * 60 * 60 * 1000;
        winLabel = 'past 30 days';
      } else if (state.quakeTimeWindow === '60d') {
        timeCutoff = now - 60 * 24 * 60 * 60 * 1000;
        winLabel = 'past 60 days';
      } else if (state.quakeTimeWindow === '90d') {
        timeCutoff = now - 90 * 24 * 60 * 60 * 1000;
        winLabel = 'past 90 days';
      } else if (state.quakeTimeWindow === '1y') {
        timeCutoff = now - 365 * 24 * 60 * 60 * 1000;
        winLabel = 'past 1 year';
      }

      const minMag = state.minMagFilter || 2.5;

      const filterExpr = [
        'all',
        ['>=', ['get', 'mag'], minMag],
        ['>=', ['get', 'time'], timeCutoff]
      ];

      if (state.map.getLayer('earthquakes-points')) {
        state.map.setFilter('earthquakes-points', filterExpr);
      }
      if (state.map.getLayer('earthquakes-heat')) {
        state.map.setFilter('earthquakes-heat', filterExpr);
      }
      if (state.map.getLayer('earthquakes-24h-ring')) {
        state.map.setFilter('earthquakes-24h-ring', [
          'all',
          ['>=', ['get', 'mag'], minMag],
          ['>=', ['get', 'time'], Math.max(timeCutoff, now - 24 * 60 * 60 * 1000)]
        ]);
      }

      const matching = state.earthquakesData.features.filter(f => {
        const p = f.properties;
        return (p.mag || 0) >= minMag && (p.time || 0) >= timeCutoff;
      });

      // Find the single Peak (Largest) Earthquake in current active filter
      let peakQuake = null;
      if (matching.length > 0) {
        peakQuake = matching.reduce((max, q) => {
          const m = q.properties?.mag || 0;
          return (!max || m > (max.properties?.mag || 0)) ? q : max;
        }, null);
      }
      state.currentPeakQuake = peakQuake;

      // Update Peak Spotlight GeoJSON source on the map
      if (state.map && state.map.getSource('earthquakes-peak')) {
        const peakGeoJson = peakQuake ? {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: peakQuake.geometry,
            properties: {
              ...peakQuake.properties,
              spotlight_label: `👑 M${(peakQuake.properties?.mag || 0).toFixed(1)} Peak (${winLabel === 'Today' ? 'Today' : winLabel.replace('past ', '')})`
            }
          }]
        } : { type: 'FeatureCollection', features: [] };
        state.map.getSource('earthquakes-peak').setData(peakGeoJson);
      }

      const badge = document.getElementById('mode-filter-badge');
      if (badge && state.currentMode === 'earthquakes') {
        const peakSuffix = peakQuake ? ` • Peak M${(peakQuake.properties?.mag || 0).toFixed(1)}` : '';
        const magNote = state.quakeTimeWindow === '1y' && minMag < 4.5 ? ' [M4.5+]' : '';
        badge.textContent = `${matching.length.toLocaleString()} (${winLabel}${magNote}${peakSuffix})`;
        badge.title = `${matching.length} earthquakes matching M${state.quakeTimeWindow === '1y' && minMag < 4.5 ? '4.5' : minMag}+ in ${winLabel}${state.quakeTimeWindow === '1y' && minMag < 4.5 ? ' (USGS 1-Year feed index M4.5+)' : ''}${peakQuake ? ` (Peak: M${(peakQuake.properties.mag || 0).toFixed(1)} near ${peakQuake.properties.place || 'Unknown'})` : ''}`;
      }

      EarthquakesModule.renderTopQuakes(matching);

      if (state.selectedPlate) {
        TPM.renderEarthquakesForPlate(state.selectedPlate.properties);
      }
    },

    renderLegend: function () {
      const el = document.getElementById('dynamic-mode-legend');
      if (!el) return;
      const state = TPM.state;
      if (state.currentMode !== 'earthquakes') return;

      const win = state.quakeTimeWindow || '24h';
      const curMag = state.minMagFilter || 2.5;

      const now = Date.now();
      const rawFeatures = (quakeDatasetCache[30] && quakeDatasetCache[30].features)
        || (state.earthquakesData && state.earthquakesData.features)
        || [];

      const baseFeatures = curMag > 2.5
        ? rawFeatures.filter(f => (f.properties?.mag || 0) >= curMag)
        : rawFeatures;

      const count24h = baseFeatures.filter(f => (f.properties?.time || 0) >= now - 24 * 3600 * 1000).length;
      const count7d = baseFeatures.filter(f => (f.properties?.time || 0) >= now - 7 * 86400 * 1000).length;
      const count30d = baseFeatures.filter(f => (f.properties?.time || 0) >= now - 30 * 86400 * 1000).length;

      const feats60 = quakeDatasetCache[60]?.features;
      const count60d = feats60 ? (curMag > 2.5 ? feats60.filter(f => (f.properties?.mag || 0) >= curMag).length : feats60.length) : null;

      const feats90 = quakeDatasetCache[90]?.features;
      const count90d = feats90 ? (curMag > 2.5 ? feats90.filter(f => (f.properties?.mag || 0) >= curMag).length : feats90.length) : null;

      const formatCount = (c) => {
        if (c === null || c === undefined) return '...';
        if (typeof c === 'string') return c;
        return c >= 1000 ? (c / 1000).toFixed(1) + 'k' : c.toString();
      };

      const isM3Active = curMag === 3.0;
      const isM5Active = curMag === 5.0;
      const isM7Active = curMag >= 7.0;

      el.innerHTML = `
        <div class="quake-dual-legend">
          <div class="legend-scale-row quake-time-row" role="group" aria-label="Earthquake Time Range Filters">
            <!-- 1. Today (Default) -->
            <button type="button" 
                    id="btn-quake-time-today" 
                    class="legend-filter-btn ${win === '24h' ? 'is-active' : ''}" 
                    data-window="24h" 
                    onclick="window.setQuakeTimeWindow('24h')" 
                    onmouseenter="window.showGlobalLegendTooltip(this, 'quake-time-today', event)" 
                    onmouseleave="window.hideGlobalLegendTooltip()" 
                    onfocus="window.showGlobalLegendTooltip(this, 'quake-time-today', event)" 
                    onblur="window.hideGlobalLegendTooltip()" 
                    aria-pressed="${win === '24h'}" 
                    title="Today's Earthquakes (Past 24 Hours)">
              <span class="quake-live-bolt" style="color:#ef4444;">⚡</span>
              <span class="legend-filter-label">Today</span>
              <span class="legend-alert-badge alert-red" id="badge-quake-today">${count24h}</span>
            </button>

            <!-- 2. 7 Days -->
            <button type="button" 
                    id="btn-quake-time-7d" 
                    class="legend-filter-btn ${win === '7d' ? 'is-active' : ''}" 
                    data-window="7d" 
                    onclick="window.setQuakeTimeWindow('7d')" 
                    onmouseenter="window.showGlobalLegendTooltip(this, 'quake-time-7d', event)" 
                    onmouseleave="window.hideGlobalLegendTooltip()" 
                    onfocus="window.showGlobalLegendTooltip(this, 'quake-time-7d', event)" 
                    onblur="window.hideGlobalLegendTooltip()" 
                    aria-pressed="${win === '7d'}" 
                    title="Past 7 Days Seismicity">
              <span class="legend-filter-label">7 Days</span>
              <span class="legend-alert-badge alert-amber" id="badge-quake-7d">${count7d}</span>
            </button>

            <!-- 3. 30 Days -->
            <button type="button" 
                    id="btn-quake-time-30d" 
                    class="legend-filter-btn ${win === '30d' ? 'is-active' : ''}" 
                    data-window="30d" 
                    onclick="window.setQuakeTimeWindow('30d')" 
                    onmouseenter="window.showGlobalLegendTooltip(this, 'quake-time-30d', event)" 
                    onmouseleave="window.hideGlobalLegendTooltip()" 
                    onfocus="window.showGlobalLegendTooltip(this, 'quake-time-30d', event)" 
                    onblur="window.hideGlobalLegendTooltip()" 
                    aria-pressed="${win === '30d'}" 
                    title="Past 30 Days Seismicity">
              <span class="legend-filter-label">30 Days</span>
              <span class="legend-alert-badge alert-catalog" id="badge-quake-30d">${formatCount(count30d)}</span>
            </button>

            <!-- 4. 60 Days -->
            <button type="button" 
                    id="btn-quake-time-60d" 
                    class="legend-filter-btn ${win === '60d' ? 'is-active' : ''}" 
                    data-window="60d" 
                    onclick="window.setQuakeTimeWindow('60d')" 
                    onmouseenter="window.showGlobalLegendTooltip(this, 'quake-time-60d', event)" 
                    onmouseleave="window.hideGlobalLegendTooltip()" 
                    onfocus="window.showGlobalLegendTooltip(this, 'quake-time-60d', event)" 
                    onblur="window.hideGlobalLegendTooltip()" 
                    aria-pressed="${win === '60d'}" 
                    title="Past 60 Days Seismicity (USGS Query API)">
              <span class="legend-filter-label">60 Days</span>
              <span class="legend-alert-badge alert-catalog" id="badge-quake-60d">${formatCount(count60d)}</span>
            </button>

            <!-- 5. 90 Days -->
            <button type="button" 
                    id="btn-quake-time-90d" 
                    class="legend-filter-btn ${win === '90d' ? 'is-active' : ''}" 
                    data-window="90d" 
                    onclick="window.setQuakeTimeWindow('90d')" 
                    onmouseenter="window.showGlobalLegendTooltip(this, 'quake-time-90d', event)" 
                    onmouseleave="window.hideGlobalLegendTooltip()" 
                    onfocus="window.showGlobalLegendTooltip(this, 'quake-time-90d', event)" 
                    onblur="window.hideGlobalLegendTooltip()" 
                    aria-pressed="${win === '90d'}" 
                    title="Past 90 Days Seismicity (USGS Query API)">
              <span class="legend-filter-label">90 Days</span>
              <span class="legend-alert-badge alert-catalog" id="badge-quake-90d">${formatCount(count90d)}</span>
            </button>

            <!-- Separator -->
            <span style="width:1px; height:18px; background:rgba(255,255,255,0.18); margin:0 3px;"></span>

            <!-- Magnitude Quick Filters -->
            <button type="button" 
                    id="btn-filter-mag-3" 
                    class="legend-filter-btn ${isM3Active ? 'is-active' : (curMag > 3.0 ? 'is-muted' : '')}" 
                    style="padding:2px 7px; font-size:0.75rem;" 
                    onclick="window.toggleQuakeMagThreshold(3.0)" 
                    onmouseenter="window.showGlobalLegendTooltip(this, 'quake-m3', event)" 
                    onmouseleave="window.hideGlobalLegendTooltip()" 
                    title="Filter quakes M≥3.0">
              <span style="width:6px; height:6px; border-radius:50%; background:#94a3b8; display:inline-block;"></span>
              <span>M3+</span>
            </button>

            <button type="button" 
                    id="btn-filter-mag-5" 
                    class="legend-filter-btn ${isM5Active ? 'is-active' : (curMag > 5.0 ? 'is-muted' : '')}" 
                    style="padding:2px 7px; font-size:0.75rem;" 
                    onclick="window.toggleQuakeMagThreshold(5.0)" 
                    onmouseenter="window.showGlobalLegendTooltip(this, 'quake-m5', event)" 
                    onmouseleave="window.hideGlobalLegendTooltip()" 
                    title="Filter quakes M≥5.0">
              <span style="width:9px; height:9px; border-radius:50%; background:#f59e0b; display:inline-block;"></span>
              <span>M5+</span>
            </button>

            <button type="button" 
                    id="btn-filter-mag-7" 
                    class="legend-filter-btn ${isM7Active ? 'is-active' : ''}" 
                    style="padding:2px 7px; font-size:0.75rem;" 
                    onclick="window.toggleQuakeMagThreshold(7.0)" 
                    onmouseenter="window.showGlobalLegendTooltip(this, 'quake-m7', event)" 
                    onmouseleave="window.hideGlobalLegendTooltip()" 
                    title="Filter quakes M≥7.0">
              <span style="width:12px; height:12px; border-radius:50%; background:#ef4444; display:inline-block;"></span>
              <span>M7+</span>
            </button>

            <!-- Peak Event Spotlight Button -->
            ${(() => {
              const peak = state.currentPeakQuake;
              if (!peak || !peak.properties) return '';
              const peakMag = (peak.properties.mag || 0).toFixed(1);
              const placeParts = (peak.properties.place || '').split(',');
              const placeShort = (placeParts.length > 1 ? placeParts.pop() : placeParts[0] || 'Event').trim();
              return `
                <button type="button" 
                        id="btn-quake-peak-focus" 
                        class="legend-filter-btn btn-peak-spotlight" 
                        onclick="window.focusPeakQuake()" 
                        onmouseenter="window.showGlobalLegendTooltip(this, 'quake-peak-focus', event)" 
                        onmouseleave="window.hideGlobalLegendTooltip()" 
                        onfocus="window.showGlobalLegendTooltip(this, 'quake-peak-focus', event)" 
                        onblur="window.hideGlobalLegendTooltip()" 
                        title="Peak Event: Magnitude ${peakMag} near ${peak.properties.place || 'Unknown'} • Click to fly to epicenter">
                  <i class="fa-solid fa-crown" style="color:#facc15; font-size:0.75rem;" aria-hidden="true"></i>
                  <span class="legend-filter-label" style="color:#fef08a; font-weight:700;">Peak: M${peakMag}</span>
                  <span class="legend-peak-place" style="font-size:0.65rem; color:#fde68a; opacity:0.85; max-width:85px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${placeShort}</span>
                </button>
              `;
            })()}

            <!-- Reset Filters -->
            <button type="button" 
                    class="legend-filter-btn legend-source-btn is-active" 
                    onclick="window.resetQuakeFilters()" 
                    title="Reset magnitude filter to M2.5+">
              <span class="legend-filter-label" style="color:#94a3b8; font-weight:600;">
                ${curMag > 2.5 ? '<i class="fa-solid fa-rotate-left mr-1" style="color:#38bdf8;"></i>Reset' : 'USGS'}
              </span>
            </button>
          </div>

          <!-- Row 2: Wadati-Benioff Depth Gradient Profile -->
          <div id="legend-depth-sec" 
               class="quake-depth-row" 
               onmouseenter="window.showGlobalLegendTooltip(this, 'quake-depth', event)" 
               onmouseleave="window.hideGlobalLegendTooltip()" 
               style="cursor:help; margin-top:5px;" 
               title="Earthquake hypocenter depth profile (0 - 700 km)">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.67rem; color:#94a3b8; margin-bottom:2px; font-family:var(--font-mono);">
              <span>0 km (Shallow)</span>
              <span>35</span>
              <span>70</span>
              <span>150</span>
              <span>300</span>
              <span>700 km (Deep Mantle)</span>
            </div>
            <div class="legend-depth-bar"></div>
          </div>
        </div>
      `;
    },

    getShortestLng: function (targetLng, currentLng) {
      if (typeof currentLng !== 'number' || isNaN(currentLng)) return targetLng;
      let diff = (targetLng - currentLng) % 360;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      return currentLng + diff;
    },

    centerOnPeakQuake: function (flySpeed = 1.25, targetZoom = null) {
      const state = TPM.state;
      if (!state.map || !state.currentPeakQuake) return;
      const q = state.currentPeakQuake;
      if (!q.geometry || !Array.isArray(q.geometry.coordinates)) return;
      const coords = q.geometry.coordinates;

      const currentCenter = state.map.getCenter();
      const shortestLng = EarthquakesModule.getShortestLng(coords[0], currentCenter ? currentCenter.lng : coords[0]);

      const currentZoom = state.map.getZoom();
      const z = targetZoom !== null ? targetZoom : (currentZoom < 3.2 ? 3.8 : Math.min(currentZoom, 6.0));

      state.map.flyTo({
        center: [shortestLng, coords[1]],
        zoom: z,
        speed: flySpeed,
        curve: 1.3,
        essential: true
      });
    },

    focusPeakQuake: function () {
      const q = TPM.state.currentPeakQuake;
      if (!q || !q.geometry || !q.geometry.coordinates) return;
      const coords = q.geometry.coordinates;

      const currentCenter = TPM.state.map.getCenter();
      const shortestLng = EarthquakesModule.getShortestLng(coords[0], currentCenter ? currentCenter.lng : coords[0]);

      TPM.state.map.flyTo({
        center: [shortestLng, coords[1]],
        zoom: Math.max(5.5, TPM.state.map.getZoom()),
        speed: 1.4,
        curve: 1.2
      });
      setTimeout(() => {
        EarthquakesModule.openQuakePopup(q);
      }, 550);
    },

    openQuakePopup: function (q) {
      if (!q || !q.properties) return;
      const p = q.properties;
      const magVal = (p.mag || 0).toFixed(1);
      const magType = p.magType ? ` <span style="font-size:0.75rem; color:#94a3b8; font-weight:normal; font-family:var(--font-mono);">(${p.magType.toUpperCase()})</span>` : '';
      const depthVal = Math.round(p.depth !== undefined ? p.depth : (q.geometry.coordinates[2] || 0));
      const timeAgo = TPM.formatTimeAgo(p.time);
      const coords = q.geometry.coordinates.slice(0, 2);
      const isPeak = TPM.state.currentPeakQuake && TPM.state.currentPeakQuake.id === q.id;

      const peakBadgeHtml = isPeak ? `
        <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(245,158,11,0.22); color:#fde68a; border:1px solid rgba(245,158,11,0.55); padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:700; margin-bottom:6px;">
          <i class="fa-solid fa-crown" style="color:#facc15;"></i> Peak Event in Current View
        </div>
      ` : '';

      TPM.showSmartPopup(coords, `
        ${peakBadgeHtml}
        <div class="popup-title" style="color:#ef4444; font-weight:700; padding-right:32px;">⚡ Magnitude ${magVal}${magType} Earthquake</div>
        <div class="popup-meta" style="font-weight:600; color:#f8fafc; margin-bottom:4px;">${p.place || 'Seismic Event'}</div>
        <div style="font-size:0.75rem; color:#38bdf8; font-family:var(--font-mono); margin-bottom:5px; display:flex; align-items:center; gap:5px; background:rgba(56,189,248,0.1); padding:3px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.2);">
          <i class="fa-solid fa-location-crosshairs" style="color:#38bdf8;"></i>
          <span>${TPM.formatGeodeticCoords(coords[1], coords[0])}</span>
        </div>
        <div style="font-size:0.8rem; color:#cbd5e1; margin-bottom:3px;">Depth: <strong style="color:#38bdf8;">${depthVal} km</strong></div>
        <div style="font-size:0.78rem; color:#94a3b8; margin-bottom:2px;">Time: ${timeAgo}</div>
        <div style="font-size:0.74rem; color:#64748b; margin-bottom:6px;">${new Date(p.time).toUTCString()}</div>
        <div class="popup-actions">
          <a href="${p.url}" target="_blank" rel="noopener" class="popup-btn popup-btn-usgs" title="Open official USGS Event detail page">
            <span>USGS Event ↗</span>
          </a>
          ${TPM.getGoogleMapsButton(coords[1], coords[0], 'Google Maps')}
        </div>
      `, { className: 'custom-popup quake-popup', estimatedHeight: 260 });
    },

    renderTopQuakes: function (quakes) {
      const listEl = document.getElementById('top-quakes-list');
      if (!listEl) return;
      listEl.innerHTML = '';

      const sorted = [...quakes].sort((a, b) => (b.properties.mag || 0) - (a.properties.mag || 0)).slice(0, 10);
      if (sorted.length === 0) {
        listEl.innerHTML = '<div style="padding:16px 10px; font-size:0.8rem; color:#94a3b8; text-align:center;">No earthquakes match active filters.</div>';
        return;
      }

      sorted.forEach((q, idx) => {
        const p = q.properties;
        const magVal = (p.mag || 0).toFixed(1);
        const depthVal = Math.round(p.depth !== undefined ? p.depth : (q.geometry.coordinates[2] || 0));
        const timeAgo = TPM.formatTimeAgo(p.time);
        const magColor = p.mag >= 7.0 ? '#dc2626' : (p.mag >= 6.0 ? '#ea580c' : (p.mag >= 5.0 ? '#f97316' : '#0284c7'));
        const isPeak = idx === 0;

        const itemBtn = document.createElement('button');
        itemBtn.type = 'button';
        itemBtn.className = `top-quake-item ${isPeak ? 'is-peak-item' : ''}`;
        itemBtn.setAttribute('role', 'listitem');
        itemBtn.setAttribute('aria-label', `Rank ${idx+1}: Magnitude ${magVal} earthquake, ${p.place}, ${timeAgo}`);
        if (isPeak) {
          itemBtn.style.border = '1px solid rgba(245, 158, 11, 0.55)';
          itemBtn.style.background = 'rgba(245, 158, 11, 0.12)';
        }

        itemBtn.innerHTML = `
          <div style="flex:1; min-width:0; margin-right:8px;">
            ${isPeak ? '<div style="font-size:0.65rem; color:#facc15; font-weight:700; display:flex; align-items:center; gap:4px; margin-bottom:2px;"><i class="fa-solid fa-crown" style="font-size:0.68rem;"></i> Peak Event in View</div>' : ''}
            <div style="font-size:0.82rem; font-weight:600; color:#f1f5f9; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              <span style="color:${isPeak ? '#facc15' : '#94a3b8'}; font-family:var(--font-mono); margin-right:4px;">#${idx+1}</span> ${p.place || 'Seismic Event'}
            </div>
            <div style="font-size:0.72rem; color:#94a3b8; display:flex; gap:8px;">
              <span>${timeAgo}</span>
              <span>&bull;</span>
              <span>Depth: ${depthVal} km</span>
            </div>
          </div>
          <span class="top-quake-mag" style="background:${magColor};">M${magVal}</span>
        `;

        itemBtn.addEventListener('click', () => {
          if (window.matchMedia('(max-width: 768px)').matches) {
            EarthquakesModule.toggleDrawer(false);
          }
          const coords = q.geometry.coordinates.slice(0, 2);
          TPM.state.map.flyTo({ center: coords, zoom: 6, speed: 1.4 });
          EarthquakesModule.openQuakePopup(q);
        });

        listEl.appendChild(itemBtn);
      });
    },

    handlePopup: function (features, e, map) {
      const quake = features.find(f => f.layer.id === 'earthquakes-points' || f.layer.id === 'earthquakes-peak-halo' || f.layer.id === 'earthquakes-peak-ring' || f.layer.id === 'earthquakes-peak-label');
      if (!quake) return false;
      EarthquakesModule.openQuakePopup(quake);
      return true;
    },

    handleHoverTooltip: function (features, e, tooltip) {
      const quakeFeat = features.find(f => f.layer.id === 'earthquakes-points' || f.layer.id === 'earthquakes-peak-halo' || f.layer.id === 'earthquakes-peak-ring' || f.layer.id === 'earthquakes-peak-label');
      if (!quakeFeat || !tooltip) return false;

      const qp = quakeFeat.properties;
      const mag = (qp.mag || 0).toFixed(1);
      const depth = Math.round(qp.depth !== undefined ? qp.depth : (quakeFeat.geometry.coordinates[2] || 0));
      const isPeak = TPM.state.currentPeakQuake && TPM.state.currentPeakQuake.id === quakeFeat.id;

      tooltip.innerHTML = `
        ${isPeak ? '<div style="font-size:0.68rem; font-weight:800; color:#facc15; display:flex; align-items:center; gap:4px; margin-bottom:2px;"><i class="fa-solid fa-crown" style="font-size:0.7rem;"></i> Peak Event in Current View</div>' : ''}
        <div style="font-weight:700; color:#ef4444; font-size:0.92rem; margin-bottom:2px;">⚡ Magnitude ${mag} Earthquake</div>
        <div style="font-size:0.75rem; color:#cbd5e1; margin-bottom:2px;">${qp.place || 'Seismic Event'}</div>
        <div style="font-size:0.72rem; color:#38bdf8;">Depth: <strong style="color:#fff;">${depth} km</strong> &bull; ${TPM.formatTimeAgo(qp.time)}</div>
      `;
      TPM.updateHoverTooltipPosition(tooltip, e.point);
      tooltip.style.display = 'block';
      tooltip.style.opacity = '1';
      return true;
    },

    activate: function (centerOnPeak = true) {
      TPM.state.quakeTimeWindow = '24h';
      shouldCenterOnActivate = !!centerOnPeak;
      if (typeof TPM.closePopup === 'function') {
        TPM.closePopup();
      }
      EarthquakesModule.initLayers(TPM.state.map);
      if (TPM.state.earthquakesData) {
        EarthquakesModule.applyFilters();
      }
      EarthquakesModule.refresh(false);
      EarthquakesModule.renderLegend();
      if (shouldCenterOnActivate && TPM.state.currentPeakQuake) {
        shouldCenterOnActivate = false;
        EarthquakesModule.centerOnPeakQuake(1.25);
      }

      if (!bgIntervalId) {
        bgIntervalId = setInterval(() => {
          EarthquakesModule.refresh(false);
        }, 5 * 60 * 1000);
      }
    },

    deactivate: function () {
      if (typeof TPM.closePopup === 'function') {
        TPM.closePopup();
      }
      if (bgIntervalId) {
        clearInterval(bgIntervalId);
        bgIntervalId = null;
      }
    }
  };

  // Bind global helpers so existing inline button handlers work seamlessly
  window.refreshLiveEarthquakes = EarthquakesModule.refresh;
  window.setQuakeTimeWindow = EarthquakesModule.setTimeWindow;
  window.onQuakeMagChange = EarthquakesModule.setMinMag;
  window.toggleQuakeMagThreshold = EarthquakesModule.toggleMagThreshold;
  window.resetQuakeFilters = EarthquakesModule.resetFilters;
  window.toggleTopQuakesDrawer = EarthquakesModule.toggleDrawer;
  window.focusPeakQuake = EarthquakesModule.focusPeakQuake;
  window.centerOnPeakQuake = EarthquakesModule.centerOnPeakQuake;

  window.TPM_Earthquakes = EarthquakesModule;
  TPM.earthquakes = EarthquakesModule;
})();
