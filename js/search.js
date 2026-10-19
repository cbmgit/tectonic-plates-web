/**
 * Tectonic Plates Map - Global Cross-Category Search Engine (Lazy-Loaded Module)
 * Indexes Plates, Volcanoes (with aliases), Impact Craters, Ocean Trenches,
 * Hurricanes, Aurora Observatories, Earthquakes, and Countries.
 */
(function () {
  'use strict';

  const TPM = window.TPM;
  if (!TPM) {
    console.error('[TPM_Search] Core TPM namespace not found');
    return;
  }

  const VOLCANO_SEARCH_ALIASES = {
    'fuji': 'fujisan',
    'mount fuji': 'fujisan',
    'mt fuji': 'fujisan',
    'sakurajima': 'aira',
    'st helens': 'st. helens',
    'mount st helens': 'st. helens',
    'mt st helens': 'st. helens',
    'bromo': 'tengger caldera',
    'mount bromo': 'tengger caldera',
    'paricutin': 'michoacan-guanajuato',
    'ruiz': 'ruiz, nevado del',
    'nevado del ruiz': 'ruiz, nevado del',
    'yellowstone': 'yellowstone',
    'toba': 'toba',
    'lake toba': 'toba',
    'long valley': 'long valley caldera',
    'krakatoa': 'krakatau',
    'vesuvius': 'vesuvius',
    'mount vesuvius': 'vesuvius',
    'etna': 'etna',
    'mount etna': 'etna',
    'rainier': 'rainier',
    'mount rainier': 'rainier',
    'shasta': 'shasta',
    'mount shasta': 'shasta'
  };

  const COUNTRY_CENTROIDS = {
    'united states': { center: [-98.5795, 39.8283], zoom: 4.2 },
    'usa': { center: [-98.5795, 39.8283], zoom: 4.2 },
    'japan': { center: [138.2529, 36.2048], zoom: 5.2 },
    'australia': { center: [133.7751, -25.2744], zoom: 4.2 },
    'united kingdom': { center: [-3.4359, 55.3781], zoom: 5.5 },
    'iceland': { center: [-19.0208, 64.9631], zoom: 6.0 },
    'new zealand': { center: [174.8860, -40.9006], zoom: 5.2 },
    'indonesia': { center: [113.9213, -0.7893], zoom: 4.8 },
    'chile': { center: [-71.5430, -35.6751], zoom: 4.5 },
    'mexico': { center: [-102.5528, 23.6345], zoom: 5.0 },
    'canada': { center: [-106.3468, 56.1304], zoom: 3.8 },
    'india': { center: [78.9629, 20.5937], zoom: 4.8 },
    'china': { center: [104.1954, 35.8617], zoom: 4.0 },
    'turkey': { center: [35.2433, 38.9637], zoom: 5.8 },
    'italy': { center: [12.5674, 41.8719], zoom: 5.8 },
    'philippines': { center: [121.7740, 12.8797], zoom: 5.5 },
    'brazil': { center: [-51.9253, -14.2350], zoom: 4.0 },
    'russia': { center: [105.3188, 61.5240], zoom: 3.2 },
    'south africa': { center: [22.9375, -30.5595], zoom: 5.0 },
    'germany': { center: [10.4515, 51.1657], zoom: 5.8 },
    'france': { center: [2.2137, 46.2276], zoom: 5.8 },
    'spain': { center: [-3.7492, 40.4637], zoom: 5.8 },
    'greece': { center: [21.8243, 39.0742], zoom: 6.0 },
    'colombia': { center: [-74.2973, 4.5709], zoom: 5.5 },
    'peru': { center: [-75.0152, -9.1900], zoom: 5.2 },
    'argentina': { center: [-63.6167, -38.4161], zoom: 4.2 },
    'egypt': { center: [30.8025, 26.8206], zoom: 5.5 },
    'kenya': { center: [37.9062, -0.0236], zoom: 5.8 },
    'iran': { center: [53.6880, 32.4279], zoom: 5.2 }
  };

  const SearchModule = {
    isInitialized: false,

    init: function () {
      if (SearchModule.isInitialized) return;
      const input = document.getElementById('search-input');
      const dropdown = document.getElementById('search-dropdown');
      if (!input || !dropdown) return;
      SearchModule.isInitialized = true;

      // Pre-warm all category datasets only once user actually types
      const warmAllCategories = () => {
        ['volcanoes', 'craters', 'trenches', 'hurricanes', 'tornadoes', 'aurora'].forEach(datasetName => {
          if (!window.TECTONIC_DATA || !window.TECTONIC_DATA[datasetName]) {
            TPM.loadDataset(datasetName);
          }
        });
      };
      input.addEventListener('input', warmAllCategories, { once: true });

      input.addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        if (q.length < 2) {
          dropdown.classList.remove('is-active');
          dropdown.innerHTML = '';
          return;
        }

        const results = [];

        // 1. Search Plates
        if (window.TECTONIC_DATA && window.TECTONIC_DATA.plates) {
          window.TECTONIC_DATA.plates.features.forEach(f => {
            const name = (f.properties.PlateName || '').toLowerCase();
            const code = (f.properties.Code || '').toLowerCase();
            if (name.includes(q) || code === q) {
              results.push({
                title: f.properties.PlateName,
                sub: `Plate (${f.properties.Code}) • ${f.properties.size || ''}`,
                type: 'plate',
                data: f
              });
            }
          });
        }

        // 2. Search Volcanoes (With alias support)
        if (window.TECTONIC_DATA && window.TECTONIC_DATA.volcanoes) {
          const cleanQ = q.replace(/^(mount|mt\.?)\s+/i, '').trim();
          const aliasTarget = VOLCANO_SEARCH_ALIASES[q] || VOLCANO_SEARCH_ALIASES[cleanQ];

          window.TECTONIC_DATA.volcanoes.features.forEach(v => {
            const name = v.properties.name.toLowerCase();
            const country = v.properties.country.toLowerCase();
            const isDirectMatch = name.includes(q) || country.includes(q) || (cleanQ.length >= 3 && name.includes(cleanQ));
            const isAliasMatch = aliasTarget && name.includes(aliasTarget);

            if (isDirectMatch || isAliasMatch) {
              let displayTitle = `🌋 ${v.properties.name}`;
              if (isAliasMatch && !name.includes(q)) {
                const capQ = q.charAt(0).toUpperCase() + q.slice(1);
                displayTitle = `🌋 ${v.properties.name} (${capQ})`;
              }

              results.push({
                title: displayTitle,
                sub: `${v.properties.country} • ${v.properties.type}`,
                type: 'volcano',
                coords: v.geometry.coordinates,
                data: v
              });
            }
          });
        }

        // 3. Search Impact Craters
        if (window.TECTONIC_DATA && window.TECTONIC_DATA.craters) {
          window.TECTONIC_DATA.craters.features.forEach(c => {
            const name = (c.properties.name || '').toLowerCase();
            const country = (c.properties.country || '').toLowerCase();
            if (name.includes(q) || country.includes(q) || (q.includes('crater') && name.includes(q.replace('crater', '').trim()))) {
              results.push({
                title: `💥 ${c.properties.name}`,
                sub: `${c.properties.country} • Diameter: ${c.properties.diameter} • Age: ${c.properties.age}`,
                type: 'crater',
                coords: c.geometry.coordinates,
                data: c
              });
            }
          });
        }

        // 4. Search Ocean Trenches
        if (window.TECTONIC_DATA && window.TECTONIC_DATA.trenches) {
          window.TECTONIC_DATA.trenches.features.forEach(t => {
            const name = (t.properties.name || '').toLowerCase();
            const plate = (t.properties.plate || '').toLowerCase();
            if (name.includes(q) || plate.includes(q) || (q.includes('trench') && name.includes(q.replace('trench', '').trim()))) {
              results.push({
                title: `🌊 ${t.properties.name}`,
                sub: `Max Depth: ${t.properties.depth} • ${t.properties.plate}`,
                type: 'trench',
                coords: t.geometry.coordinates,
                data: t
              });
            }
          });
        }

        // 5. Search Hurricanes & Storm Tracks (Historical + Live Active)
        if (window.TECTONIC_DATA && (window.TECTONIC_DATA.hurricanePoints || window.TECTONIC_DATA.hurricanes || window.TECTONIC_DATA.hurricaneSeasons)) {
          const stormPoints = (window.TECTONIC_DATA.hurricanePoints && window.TECTONIC_DATA.hurricanePoints.features) || [];
          const activeStorms = (window.TECTONIC_DATA.hurricaneSeasons?.active?.points?.features) || [];
          const seenIds = new Set();
          const stormList = [];
          [...activeStorms, ...stormPoints].forEach(s => {
            const id = (s.properties && (s.properties.id || s.properties.name)) || '';
            if (id && !seenIds.has(id)) {
              seenIds.add(id);
              stormList.push(s);
            }
          });

          stormList.forEach(h => {
            if (!h || !h.geometry || !h.properties) return;
            const name = (h.properties.name || '').toLowerCase();
            if (name.includes(q) || (q.includes('hurricane') && name.includes(q.replace('hurricane', '').trim()))) {
              results.push({
                title: `🌀 ${h.properties.name}`,
                sub: `${h.properties.year ? `${h.properties.year} • ` : (h.properties.is_live ? 'Live Active • ' : '')}${h.properties.category} • Max Winds: ${h.properties.max_winds || h.properties.winds || '160+ mph'}`,
                type: 'hurricane',
                coords: h.geometry.coordinates,
                data: h
              });
            }
          });
        }

        // 5b. Search Tornadoes & Severe Storms (Outbreaks + Live NWS Alerts)
        if (window.TECTONIC_DATA && (window.TECTONIC_DATA.tornadoesPoints || window.TECTONIC_DATA.tornadoesTracks || window.TECTONIC_DATA.tornadoesSeasons)) {
          const tPoints = (window.TECTONIC_DATA.tornadoesPoints && window.TECTONIC_DATA.tornadoesPoints.features) || [];
          const tTracks = (window.TECTONIC_DATA.tornadoesTracks && window.TECTONIC_DATA.tornadoesTracks.features) || [];
          const activeAlerts = (window.TECTONIC_DATA.tornadoesSeasons?.active?.points?.features) || [];
          const seenTornIds = new Set();
          const allTornadoes = [];
          [...activeAlerts, ...tPoints, ...tTracks].forEach(t => {
            const id = (t.properties && (t.properties.id || t.properties.name)) || '';
            if (id && !seenTornIds.has(id)) {
              seenTornIds.add(id);
              allTornadoes.push(t);
            }
          });

          allTornadoes.forEach(t => {
            if (!t || !t.properties) return;
            const p = t.properties;
            const name = (p.name || p.event || '').toLowerCase();
            const state = (p.state || p.area_desc || '').toLowerCase();
            const ef = (p.ef_scale || '').toLowerCase();
            if (name.includes(q) || state.includes(q) || ef.includes(q) || (q.includes('tornado') && name.includes(q.replace('tornado', '').trim())) || (q === 'twister' || q === 'ef5' || q === 'ef4')) {
              let coords = null;
              if (t.geometry && t.geometry.type) {
                if (t.geometry.type === 'Point' && Array.isArray(t.geometry.coordinates)) coords = t.geometry.coordinates;
                else if (t.geometry.type === 'LineString' && Array.isArray(t.geometry.coordinates) && t.geometry.coordinates[0]) coords = t.geometry.coordinates[0];
                else if (t.geometry.type === 'Polygon' && Array.isArray(t.geometry.coordinates) && t.geometry.coordinates[0] && t.geometry.coordinates[0][0]) coords = t.geometry.coordinates[0][0];
                else if (t.geometry.type === 'MultiPolygon' && Array.isArray(t.geometry.coordinates) && t.geometry.coordinates[0] && t.geometry.coordinates[0][0]) coords = t.geometry.coordinates[0][0][0];
                else if (t.geometry.type === 'MultiLineString' && Array.isArray(t.geometry.coordinates) && t.geometry.coordinates[0]) coords = t.geometry.coordinates[0][0];
              }

              if (coords) {
                results.push({
                  title: `🌪️ ${p.name || p.event || 'Tornado'}`,
                  sub: `${p.ef_scale ? `${p.ef_scale} • ` : ''}${p.state || p.area_desc || ''} • Winds: ${p.winds || p.severity || 'Severe'}`,
                  type: 'tornado',
                  coords: coords,
                  data: t
                });
              }
            }
          });
        }

        // 6. Search Northern & Southern Lights Observatories
        if (window.TECTONIC_DATA && window.TECTONIC_DATA.aurora && window.TECTONIC_DATA.aurora.features) {
          window.TECTONIC_DATA.aurora.features.forEach(a => {
            if (a.geometry && a.geometry.type === 'Point' && a.properties) {
              const name = (a.properties.name || '').toLowerCase();
              const country = (a.properties.country || '').toLowerCase();
              const region = (a.properties.region || '').toLowerCase();
              if (name.includes(q) || country.includes(q) || region.includes(q) || (q.includes('aurora') && name.includes(q.replace('aurora', '').trim()))) {
                results.push({
                  title: `✨ ${a.properties.name}`,
                  sub: `${a.properties.country} • ${a.properties.region} • ${a.properties.kp_threshold}`,
                  type: 'aurora',
                  coords: a.geometry.coordinates,
                  data: a
                });
              }
            }
          });
        }

        // 7. Search Countries
        if (window.TECTONIC_DATA && window.TECTONIC_DATA.plates) {
          window.TECTONIC_DATA.plates.features.forEach(f => {
            const pName = f.properties.PlateName || '';
            const countries = f.properties.countries || [];
            countries.forEach(c => {
              if (c.toLowerCase().includes(q)) {
                results.push({
                  title: `🏳️ ${c}`,
                  sub: `Located on ${pName}`,
                  type: 'country',
                  countryName: c,
                  plateName: pName
                });
              }
            });
          });
        }

        // 8. Search Notable Earthquakes
        if (TPM.state.earthquakesData && TPM.state.earthquakesData.features) {
          const quakeList = TPM.state.earthquakesData.features;
          const isQuakeKeyword = q === 'quake' || q === 'quakes' || q === 'earthquake' || q === 'earthquakes';
          let matchCount = 0;
          for (let i = 0; i < quakeList.length && matchCount < 5; i++) {
            const eq = quakeList[i];
            const place = (eq.properties.place || '').toLowerCase();
            const mag = (eq.properties.mag || 0).toFixed(1);
            if (isQuakeKeyword ? (eq.properties.mag >= 6.0) : place.includes(q)) {
              matchCount++;
              results.push({
                title: `⚡ M${mag} - ${eq.properties.place}`,
                sub: `Depth: ${Math.round(eq.properties.depth !== undefined ? eq.properties.depth : (eq.geometry.coordinates[2] || 0))} km • ${TPM.formatTimeAgo(eq.properties.time)}`,
                type: 'earthquake',
                coords: eq.geometry.coordinates.slice(0, 2),
                data: eq
              });
            }
          }
        }

        SearchModule.renderResults(results.slice(0, 10), dropdown);
      });

      // Keyboard navigation: Enter, ArrowUp, ArrowDown, Escape
      input.addEventListener('keydown', (e) => {
        if (!dropdown.classList.contains('is-active')) return;
        const items = dropdown.querySelectorAll('.search-item');
        if (!items || items.length === 0) return;

        let activeIdx = -1;
        items.forEach((it, idx) => {
          if (it.classList.contains('is-highlighted')) activeIdx = idx;
        });

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (activeIdx >= 0) items[activeIdx].classList.remove('is-highlighted');
          activeIdx = (activeIdx + 1) % items.length;
          items[activeIdx].classList.add('is-highlighted');
          items[activeIdx].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (activeIdx >= 0) items[activeIdx].classList.remove('is-highlighted');
          activeIdx = (activeIdx - 1 + items.length) % items.length;
          items[activeIdx].classList.add('is-highlighted');
          items[activeIdx].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const targetItem = activeIdx >= 0 ? items[activeIdx] : items[0];
          if (targetItem) targetItem.click();
        } else if (e.key === 'Escape') {
          dropdown.classList.remove('is-active');
          input.blur();
        }
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.remove('is-active');
        }
      });

      // If user typed into the input while module was downloading, execute search immediately
      if (input.value && input.value.trim().length >= 2) {
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    },

    renderResults: function (results, dropdown) {
      dropdown.innerHTML = '';
      if (results.length === 0) {
        dropdown.innerHTML = '<div class="search-item" style="color:#94a3b8;">No results found.</div>';
        dropdown.classList.add('is-active');
        return;
      }

      results.forEach(res => {
        const item = document.createElement('div');
        item.className = 'search-item';
        item.setAttribute('role', 'option');

        item.innerHTML = `
          <div class="search-item-title">${res.title}</div>
          <div class="search-item-sub">${res.sub}</div>
        `;

        item.addEventListener('click', () => {
          dropdown.classList.remove('is-active');
          const isMobile = window.innerWidth <= 768;
          const state = TPM.state;

          if (res.type === 'plate') {
            TPM.selectPlate(res.data);
            window.flyToSelectedPlate();
          } else if (res.type === 'volcano') {
            if (typeof window.switchMapMode === 'function' && state.currentMode !== 'volcanoes') {
              window.switchMapMode('volcanoes', true);
            } else if (typeof window.toggleLayer === 'function') {
              window.toggleLayer('volcanoes', true);
            }

            const hub = document.getElementById('maps-hub-bar');
            if (hub && !hub.classList.contains('is-minimized')) {
              hub.classList.add('is-minimized');
            }

            state.map.flyTo({ center: res.coords, zoom: 8, speed: 1.3, offset: [0, isMobile ? 50 : 60] });

            const showVolcanoCard = () => {
              if (res.data && res.data.properties) {
                const vp = res.data.properties;
                const yr = vp.last_eruption_year;
                const isUndated = yr === -99999 || yr === null || yr === undefined || vp.last_eruption === 'Unknown';
                const statusBadge = yr >= 1950
                  ? '<span style="background:#dc2626; color:#ffffff; font-size:0.7rem; padding:2.5px 8px; border-radius:4px; font-weight:700;">ACTIVE</span>'
                  : (isUndated
                      ? '<span style="background:#475569; color:#f1f5f9; font-size:0.7rem; padding:2.5px 8px; border-radius:4px; font-weight:600;">UNDATED</span>'
                      : '<span style="background:#b45309; color:#fef3c7; font-size:0.7rem; padding:2.5px 8px; border-radius:4px; font-weight:700;">DORMANT</span>');

                TPM.showSmartPopup(res.coords, `
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:6px;">
                    <span class="popup-title" style="color:#f97316; font-size:1.05rem; margin:0; font-weight:700;">🌋 ${vp.name}</span>
                    ${statusBadge}
                  </div>
                  <div style="font-size:0.75rem; color:#38bdf8; font-family:var(--font-mono); margin-bottom:5px; display:flex; align-items:center; gap:5px; background:rgba(56,189,248,0.1); padding:3px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.2);">
                    <i class="fa-solid fa-location-crosshairs" style="color:#38bdf8;"></i>
                    <span style="letter-spacing:0.02em;">${TPM.formatGeodeticCoords(res.coords[1], res.coords[0])}</span>
                    <span style="color:#64748b; margin:0 2px;">&bull;</span>
                    <span style="color:#e2e8f0;">Elev: <strong style="color:#fef08a;">${vp.elevation || 'N/A'}</strong></span>
                  </div>
                  <div class="popup-meta" style="color:#cbd5e1; font-weight:500; margin-bottom:5px;">Region: <strong>${vp.country}</strong></div>
                  <div style="font-size:0.83rem; color:#94a3b8; margin-bottom:4px;">Type: <strong style="color:#f8fafc;">${vp.type || 'Volcano'}</strong></div>
                  <div style="font-size:0.78rem; color:#94a3b8; margin-bottom:6px; line-height:1.35;">Tectonic Context: <span style="color:#38bdf8; font-weight:600;">${vp.tectonic_setting || 'Subduction Zone / Hotspot'}</span></div>
                  <div style="font-size:0.8rem; color:#fbbf24; background:rgba(249, 115, 22, 0.12); border-left:3px solid #f97316; padding:5px 8px; border-radius:3px; margin-bottom:6px;">Last Eruption: <strong>${isUndated ? 'Undated Holocene (past ~11,700 yr)' : (vp.last_eruption || 'Holocene')}</strong></div>
                  ${TPM.getGoogleMapsButton(res.coords[1], res.coords[0], 'Open in Google Maps')}
                `, { className: 'custom-popup volcano-popup', estimatedHeight: 280 });
              }
            };

            state.map.once('moveend', showVolcanoCard);
          } else if (res.type === 'crater') {
            if (typeof window.switchMapMode === 'function' && state.currentMode !== 'craters') {
              window.switchMapMode('craters', true);
            } else if (typeof window.toggleLayer === 'function') {
              window.toggleLayer('craters', true);
            }

            const hub = document.getElementById('maps-hub-bar');
            if (hub && !hub.classList.contains('is-minimized')) {
              hub.classList.add('is-minimized');
            }

            state.map.flyTo({ center: res.coords, zoom: 7, speed: 1.3, offset: [0, isMobile ? 50 : 60] });

            const showCraterCard = () => {
              if (res.data && res.data.properties) {
                const cp = res.data.properties;
                TPM.showSmartPopup(res.coords, `
                  <div class="popup-title" style="color:#fbbf24; font-weight:700;">💥 ${cp.name}</div>
                  <div class="popup-meta" style="color:#cbd5e1; margin-bottom:5px;">${cp.country} &bull; Age: <strong style="color:#f87171;">${cp.age}</strong></div>
                  <div style="font-size:0.75rem; color:#38bdf8; font-family:var(--font-mono); margin-bottom:6px; display:flex; align-items:center; gap:5px; background:rgba(56,189,248,0.1); padding:3px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.2);">
                    <i class="fa-solid fa-location-crosshairs" style="color:#38bdf8;"></i>
                    <span>${TPM.formatGeodeticCoords(res.coords[1], res.coords[0])}</span>
                  </div>
                  <div style="font-size:0.83rem; color:#cbd5e1; margin-bottom:4px;">Crater Diameter: <strong style="color:#fef08a;">${cp.diameter}</strong></div>
                  <div style="font-size:0.78rem; color:#94a3b8; margin-bottom:6px; line-height:1.35;">${cp.desc}</div>
                  ${TPM.getGoogleMapsButton(res.coords[1], res.coords[0], 'Open in Google Maps')}
                `, { className: 'custom-popup crater-popup', estimatedHeight: 260 });
              }
            };

            state.map.once('moveend', showCraterCard);
          } else if (res.type === 'trench') {
            if (typeof window.switchMapMode === 'function' && state.currentMode !== 'trenches') {
              window.switchMapMode('trenches', true);
            } else if (typeof window.toggleLayer === 'function') {
              window.toggleLayer('trenches', true);
            }

            const hub = document.getElementById('maps-hub-bar');
            if (hub && !hub.classList.contains('is-minimized')) {
              hub.classList.add('is-minimized');
            }

            state.map.flyTo({ center: res.coords, zoom: 7, speed: 1.3, offset: [0, isMobile ? 50 : 60] });

            const showTrenchCard = () => {
              if (res.data && res.data.properties) {
                const tp = res.data.properties;
                TPM.showSmartPopup(res.coords, `
                  <div class="popup-title" style="color:#818cf8; font-weight:700;">🌊 ${tp.name}</div>
                  <div class="popup-meta" style="color:#cbd5e1; margin-bottom:5px;">Max Depth: <strong style="color:#38bdf8;">${tp.depth}</strong></div>
                  <div style="font-size:0.75rem; color:#38bdf8; font-family:var(--font-mono); margin-bottom:6px; display:flex; align-items:center; gap:5px; background:rgba(56,189,248,0.1); padding:3px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.2);">
                    <i class="fa-solid fa-location-crosshairs" style="color:#38bdf8;"></i>
                    <span>${TPM.formatGeodeticCoords(res.coords[1], res.coords[0])}</span>
                  </div>
                  <div style="font-size:0.83rem; color:#cbd5e1; margin-bottom:4px;">Plate Subduction: <strong style="color:#f8fafc;">${tp.plate}</strong></div>
                  <div style="font-size:0.78rem; color:#94a3b8; margin-bottom:6px; line-height:1.35;">${tp.desc}</div>
                  ${TPM.getGoogleMapsButton(res.coords[1], res.coords[0], 'Open in Google Maps')}
                `, { className: 'custom-popup trench-popup', estimatedHeight: 260 });
              }
            };

            state.map.once('moveend', showTrenchCard);
          } else if (res.type === 'hurricane') {
            if (typeof window.switchMapMode === 'function' && state.currentMode !== 'hurricanes') {
              window.switchMapMode('hurricanes', true);
            } else if (typeof window.toggleLayer === 'function') {
              window.toggleLayer('hurricanes', true);
            }

            const hub = document.getElementById('maps-hub-bar');
            if (hub && !hub.classList.contains('is-minimized')) {
              hub.classList.add('is-minimized');
            }

            state.map.flyTo({ center: res.coords, zoom: 6, speed: 1.3, offset: [0, isMobile ? 50 : 60] });

            const showHurricaneCard = () => {
              if (res.data && res.data.properties) {
                const hp = res.data.properties;
                const isLive = hp.is_live || false;
                TPM.showSmartPopup(res.coords, `
                  <div class="popup-title" style="color:#38bdf8; font-weight:700; display:flex; align-items:center; justify-content:space-between;">
                    <span>🌀 ${hp.name || 'Tropical Cyclone'}</span>
                    ${isLive ? '<span style="background:#ef4444; color:#fff; font-size:0.68rem; font-weight:800; padding:2px 6px; border-radius:4px; text-transform:uppercase; letter-spacing:0.04em;">LIVE NOAA</span>' : ''}
                  </div>
                  <div class="popup-meta" style="color:#cbd5e1; margin-bottom:5px;">
                    ${hp.year ? `Year: ${hp.year} &bull; ` : ''}<strong style="color:${hp.color || '#f87171'}; font-weight:700;">${hp.category || 'Cat 5'}</strong>
                    ${hp.classification ? ` &bull; <span style="color:#94a3b8;">${hp.classification}</span>` : ''}
                  </div>
                  <div style="font-size:0.75rem; color:#38bdf8; font-family:var(--font-mono); margin-bottom:6px; display:flex; align-items:center; gap:5px; background:rgba(56,189,248,0.1); padding:3px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.2);">
                    <i class="fa-solid fa-location-crosshairs" style="color:#38bdf8;"></i>
                    <span>${TPM.formatGeodeticCoords(res.coords[1], res.coords[0])}</span>
                  </div>
                  <div style="font-size:0.83rem; color:#cbd5e1; margin-bottom:4px;">
                    ${isLive ? 'Sustained Winds' : 'Peak Winds'}: <strong style="color:#f87171;">${hp.max_winds || hp.winds || '160+ mph'}</strong>
                  </div>
                  ${hp.pressure ? `<div style="font-size:0.8rem; color:#94a3b8; margin-bottom:4px;">Min Central Pressure: <strong style="color:#38bdf8;">${hp.pressure}</strong></div>` : ''}
                  ${hp.movement ? `<div style="font-size:0.8rem; color:#94a3b8; margin-bottom:6px;">Current Movement: <strong style="color:#facc15;">${hp.movement}</strong></div>` : ''}
                  <div style="font-size:0.78rem; color:#94a3b8; margin-bottom:6px; line-height:1.35;">
                    ${isLive ? 'Real-time tropical cyclone tracking feed powered by NOAA National Hurricane Center (NHC) Automated Tropical Cyclone Forecasting (ATCF).' : 'Historical monster tropical cyclone track showing atmospheric and oceanic energy transfer.'}
                  </div>
                  <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">
                    ${hp.advisory_url ? `<a href="${hp.advisory_url}" target="_blank" rel="noopener noreferrer" class="btn-clean" style="flex:1; text-align:center; padding:5px 8px; font-size:0.75rem; background:rgba(56,189,248,0.15); border:1px solid #38bdf8; color:#38bdf8; border-radius:4px; text-decoration:none;"><i class="fa-solid fa-file-lines"></i> NOAA Advisory</a>` : ''}
                    ${TPM.getGoogleMapsButton(res.coords[1], res.coords[0], 'Open in Google Maps')}
                  </div>
                `, { className: 'custom-popup hurricane-popup', estimatedHeight: isLive ? 320 : 260 });
              }
            };

            state.map.once('moveend', showHurricaneCard);
          } else if (res.type === 'tornado') {
            if (typeof window.switchMapMode === 'function' && state.currentMode !== 'tornadoes') {
              window.switchMapMode('tornadoes', true);
            } else if (typeof window.toggleLayer === 'function') {
              window.toggleLayer('tornadoes', true);
            }

            const hub = document.getElementById('maps-hub-bar');
            if (hub && !hub.classList.contains('is-minimized')) {
              hub.classList.add('is-minimized');
            }

            state.map.flyTo({ center: res.coords, zoom: 7.5, speed: 1.3, offset: [0, isMobile ? 50 : 60] });

            const showTornadoCard = () => {
              if (res.data && res.data.properties) {
                const p = res.data.properties;
                const isLive = p.is_live;
                TPM.showSmartPopup(res.coords, `
                  <div class="popup-title" style="color:#ef4444; font-weight:700;">🌪️ ${p.name || p.event || 'Tornado Outbreak'}</div>
                  <div class="popup-meta" style="color:#cbd5e1; margin-bottom:5px;">
                    ${p.date ? `${p.date} • ` : ''}<strong style="color:#ef4444;">${p.ef_scale || (isLive ? 'Active Alert' : 'EF5')}</strong>
                  </div>
                  <div style="font-size:0.75rem; color:#38bdf8; font-family:var(--font-mono); margin-bottom:6px; display:flex; align-items:center; gap:5px; background:rgba(56,189,248,0.1); padding:3px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.2);">
                    <i class="fa-solid fa-location-crosshairs" style="color:#38bdf8;"></i>
                    <span>${TPM.formatGeodeticCoords(res.coords[1], res.coords[0])}</span>
                  </div>
                  <div style="font-size:0.83rem; color:#cbd5e1; margin-bottom:4px;">
                    Peak Winds: <strong style="color:#ef4444;">${p.winds || p.severity || 'Extreme'}</strong>
                  </div>
                  ${p.path_length ? `<div style="font-size:0.8rem; color:#94a3b8; margin-bottom:4px;">Path: <strong>${p.path_length}</strong> &bull; Width: <strong>${p.max_width || 'N/A'}</strong></div>` : ''}
                  <div style="font-size:0.78rem; color:#94a3b8; margin-bottom:6px; line-height:1.35;">${p.desc || p.instruction || ''}</div>
                  ${TPM.getGoogleMapsButton(res.coords[1], res.coords[0], 'Open in Google Maps')}
                `, { className: 'custom-popup tornado-popup', estimatedHeight: 280 });
              }
            };

            state.map.once('moveend', showTornadoCard);
          } else if (res.type === 'aurora') {
            if (typeof window.switchMapMode === 'function' && state.currentMode !== 'aurora') {
              window.switchMapMode('aurora', true);
            } else if (typeof window.toggleLayer === 'function') {
              window.toggleLayer('aurora', true);
            }

            const hub = document.getElementById('maps-hub-bar');
            if (hub && !hub.classList.contains('is-minimized')) {
              hub.classList.add('is-minimized');
            }

            state.map.flyTo({ center: res.coords, zoom: 7, speed: 1.3, offset: [0, isMobile ? 50 : 60] });

            const showAuroraCard = () => {
              if (res.data && res.data.properties) {
                const ap = res.data.properties;
                TPM.showSmartPopup(res.coords, `
                  <div class="popup-title" style="color:#4ade80; font-weight:700;">✨ ${ap.name} Aurora Station</div>
                  <div class="popup-meta" style="color:#cbd5e1; margin-bottom:5px;">${ap.country || ''} &bull; <strong style="color:#a7f3d0;">${ap.region || 'Auroral Oval'}</strong></div>
                  <div style="font-size:0.75rem; color:#38bdf8; font-family:var(--font-mono); margin-bottom:6px; display:flex; align-items:center; gap:5px; background:rgba(56,189,248,0.1); padding:3px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.2);">
                    <i class="fa-solid fa-location-crosshairs" style="color:#38bdf8;"></i>
                    <span>${TPM.formatGeodeticCoords(res.coords[1], res.coords[0])}</span>
                  </div>
                  <div style="font-size:0.83rem; color:#cbd5e1; margin-bottom:6px;">Required Storm Activity: <strong style="color:#facc15;">${ap.kp_threshold || 'Kp 2+'}</strong></div>
                  <div style="font-size:0.78rem; color:#94a3b8; margin-bottom:6px; line-height:1.35;">Prime polar geomagnetic observatory where Earth magnetic field channels solar wind ions into the upper atmosphere.</div>
                  ${TPM.getGoogleMapsButton(res.coords[1], res.coords[0], 'Open in Google Maps')}
                `, { className: 'custom-popup aurora-popup', estimatedHeight: 260 });
              }
            };

            state.map.once('moveend', showAuroraCard);
          } else if (res.type === 'earthquake') {
            if (typeof window.switchMapMode === 'function' && state.currentMode !== 'earthquakes') {
              window.switchMapMode('earthquakes', true);
            } else if (typeof window.toggleLayer === 'function') {
              window.toggleLayer('earthquakes', true);
            }

            const hub = document.getElementById('maps-hub-bar');
            if (hub && !hub.classList.contains('is-minimized')) {
              hub.classList.add('is-minimized');
            }

            state.map.flyTo({ center: res.coords, zoom: 6.5, speed: 1.3, offset: [0, isMobile ? 50 : 60] });

            const showQuakeCard = () => {
              if (res.data && res.data.properties) {
                const p = res.data.properties;
                const magVal = (p.mag || 0).toFixed(1);
                const depthVal = Math.round(p.depth !== undefined ? p.depth : (res.data.geometry.coordinates[2] || 0));
                const timeAgo = TPM.formatTimeAgo(p.time);
                const utcStr = new Date(p.time).toUTCString();
                const coords = res.coords;

                TPM.showSmartPopup(coords, `
                  <div class="popup-title" style="color:#ef4444; font-weight:700; padding-right:32px;">⚡ Magnitude ${magVal} Earthquake</div>
                  <div class="popup-meta" style="font-weight:600; color:#f8fafc; margin-bottom:4px;">${p.place || 'Seismic Event'}</div>
                  <div style="font-size:0.75rem; color:#38bdf8; font-family:var(--font-mono); margin-bottom:5px; display:flex; align-items:center; gap:5px; background:rgba(56,189,248,0.1); padding:3px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.2);">
                    <i class="fa-solid fa-location-crosshairs" style="color:#38bdf8;"></i>
                    <span>${TPM.formatGeodeticCoords(coords[1], coords[0])}</span>
                  </div>
                  <div style="font-size:0.8rem; color:#cbd5e1; margin-bottom:3px;">Depth: <strong style="color:#38bdf8;">${depthVal} km</strong></div>
                  <div style="font-size:0.78rem; color:#94a3b8; margin-bottom:2px;">Time: ${timeAgo}</div>
                  <div style="font-size:0.74rem; color:#64748b; margin-bottom:6px;">${utcStr}</div>
                  <div class="popup-actions">
                    <a href="${p.url}" target="_blank" rel="noopener" class="popup-btn popup-btn-usgs" title="Open official USGS Event page">
                      <span>USGS Event ↗</span>
                    </a>
                    ${TPM.getGoogleMapsButton(coords[1], coords[0], 'Google Maps')}
                  </div>
                `, { className: 'custom-popup quake-popup', estimatedHeight: 250 });
              }
            };

            state.map.once('moveend', showQuakeCard);
          } else if (res.type === 'country') {
            const feat = window.TECTONIC_DATA.plates.features.find(
              f => (f.properties.PlateName || '').toLowerCase() === res.plateName.toLowerCase()
            );
            if (feat) {
              TPM.selectPlate(feat);
              const cKey = (res.countryName || '').toLowerCase();
              const cLoc = COUNTRY_CENTROIDS[cKey];
              if (cLoc && state.map) {
                state.map.flyTo({
                  center: cLoc.center,
                  zoom: cLoc.zoom,
                  speed: 1.25
                });
                TPM.showSmartPopup(cLoc.center, `
                  <div class="popup-title">🏳️ ${res.countryName}</div>
                  <div style="font-size:0.82rem; color:#cbd5e1; margin-top:4px;">
                    Located on: <strong style="color:#38bdf8;">${res.plateName}</strong>
                  </div>
                `, { className: 'custom-popup country-popup', estimatedHeight: 120 });
              } else {
                window.flyToSelectedPlate();
              }
            }
          }
        });

        dropdown.appendChild(item);
      });

      dropdown.classList.add('is-active');
    }
  };

  window.TPM_Search = SearchModule;
  TPM.search = SearchModule;
  SearchModule.init();
})();
