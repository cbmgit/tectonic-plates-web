/**
 * Tectonic Plates Map - Core Application Engine
 * Lightweight Coordinator for MapLibre WebGL, Plate Boundaries, Drift Velocities,
 * Dynamic URL Routing, and On-Demand Module Lazy Loading.
 */
(function () {
  'use strict';

  // --- Configuration & State ---
  const config = {
    initialCenter: [15, 20],
    initialZoom: 1.8,
    initialPitch: 0,
    styles: {
      dark: {
        name: 'Dark Geophysics',
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      },
      satellite: {
        name: 'Satellite Topo',
        style: {
          version: 8,
          glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
          sources: {
            'esri-satellite': {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256,
              attribution: 'Esri, Maxar, Earthstar Geographics'
            }
          },
          layers: [{
            id: 'esri-satellite-layer',
            type: 'raster',
            source: 'esri-satellite',
            minzoom: 0,
            maxzoom: 19
          }]
        }
      },
      voyager: {
        name: 'Geological Voyager',
        style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
      },
      positron: {
        name: 'Clean Light',
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
      },
      offline: {
        name: 'Offline Vector',
        style: {
          version: 8,
          glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
          sources: {
            'offline-land': {
              type: 'geojson',
              data: (window.TECTONIC_DATA && window.TECTONIC_DATA.land) || { type: 'FeatureCollection', features: [] }
            }
          },
          layers: [
            {
              id: 'offline-ocean-bg',
              type: 'background',
              paint: { 'background-color': '#0b1329' }
            },
            {
              id: 'offline-land-fill',
              type: 'fill',
              source: 'offline-land',
              paint: {
                'fill-color': '#1e293b',
                'fill-opacity': 0.95
              }
            },
            {
              id: 'offline-land-stroke',
              type: 'line',
              source: 'offline-land',
              paint: {
                'line-color': '#334155',
                'line-width': 1.2
              }
            }
          ]
        }
      }
    }
  };

  const state = {
    map: null,
    currentStyle: 'dark',
    selectedPlate: null,
    hoveredPlateId: null,
    hoverInfoEnabled: false,
    earthquakesData: null,
    currentQuakeFilter: '2.5_month',
    currentVolcanoFilter: 'all_holocene',
    currentHurricaneFilter: 'active',
    currentTornadoFilter: 'active',
    layersVisibility: {
      plates: true,
      boundaries: true,
      boundarySymbols: true,
      velocities: true,
      volcanoes: false,
      earthquakes: false,
      hurricanes: false,
      tornadoes: false,
      aurora: false,
      trenches: false,
      craters: false
    },
    currentMode: 'tectonic-plates',
    quakeTimeWindow: '24h',
    minMagFilter: 2.5
  };

  // --- Dynamic On-Demand Subsystem Module Loader ---
  const modulePromises = {};
  function loadModule(name) {
    const key = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    if (window['TPM_' + key]) return Promise.resolve(window['TPM_' + key]);
    if (modulePromises[key]) return modulePromises[key];

    modulePromises[key] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `js/${name.toLowerCase()}.min.js?v=0.5`;
      s.onload = () => {
        const mod = window['TPM_' + key] || window['TPM_' + name.toLowerCase()] || (name.toLowerCase() === 'cross-section' ? window['TPM_Cross-section'] : null);
        if (mod) resolve(mod);
        else reject(new Error(`Failed to initialize module TPM_${key}`));
      };
      s.onerror = (err) => {
        console.warn(`[ModuleLoader] Failed loading ${name}:`, err);
        reject(err);
      };
      document.head.appendChild(s);
    });
    return modulePromises[key];
  }

  // --- Asynchronous On-Demand Dataset Lazy Loading ---
  const datasetFetchers = {
    volcanoes: () => fetch('/data/volcanoes.geojson').then(r => r.json()),
    hurricanes: () => fetch('/data/hurricanes_seasons.json').then(r => r.json()),
    tornadoes: () => fetch('/data/tornadoes_seasons.json').then(r => r.json()),
    aurora: () => fetch('/data/aurora.geojson').then(r => r.json()),
    trenches: () => fetch('/data/trenches.geojson').then(r => r.json()),
    craters: () => fetch('/data/craters.geojson').then(r => r.json()),
    earthquakesSnapshot: () => fetch('/data/earthquakes_snapshot.geojson').then(r => r.json()),
    land: () => fetch('/data/world_land.geojson').then(r => r.json())
  };

  const datasetPromises = {};

  function loadDataset(name) {
    if (!window.TECTONIC_DATA) window.TECTONIC_DATA = {};
    if (window.TECTONIC_DATA[name]) {
      return Promise.resolve(window.TECTONIC_DATA[name]);
    }
    if (datasetPromises[name]) {
      return datasetPromises[name];
    }
    if (!datasetFetchers[name]) {
      return Promise.resolve(null);
    }

    datasetPromises[name] = datasetFetchers[name]()
      .then(data => {
        if (name === 'hurricanes') {
          window.TECTONIC_DATA.hurricaneSeasons = data;
          const s = data['active'] || data['2024'] || data[Object.keys(data)[0]];
          if (s) {
            window.TECTONIC_DATA.hurricanes = s.lines;
            window.TECTONIC_DATA.hurricanePoints = s.points;
          }
        } else if (name === 'tornadoes') {
          window.TECTONIC_DATA.tornadoesSeasons = data;
          const s = data['active'] || data['2024'] || data['legends'] || data[Object.keys(data)[0]];
          if (s) {
            window.TECTONIC_DATA.tornadoesPolygons = s.polygons;
            window.TECTONIC_DATA.tornadoesPoints = s.points;
            window.TECTONIC_DATA.tornadoesTracks = s.lines;
          }
        } else {
          window.TECTONIC_DATA[name] = data;
        }

        if (state.map) {
          if (name === 'land' && state.map.getSource('offline-land')) {
            state.map.getSource('offline-land').setData(data);
          }
          ensureTectonicLayers();
        }
        return data;
      })
      .catch(err => {
        console.warn(`[LazyLoad] Failed to load ${name}:`, err);
        return null;
      });

    return datasetPromises[name];
  }

  // Distinct qualitative colors for the 52 plates
  const PLATE_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
    '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#e11d48',
    '#84cc16', '#d946ef', '#0ea5e9', '#eab308', '#a855f7'
  ];

  // Helper for human-readable relative time
  function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Recently';
    const elapsedSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (elapsedSec < 60) return 'Just now';
    const mins = Math.floor(elapsedSec / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  // Helper to test if point [lng, lat] is inside polygon ring
  function pointInPolygon(pt, ring) {
    if (!pt || !ring || !Array.isArray(ring) || ring.length < 3) return false;
    const x = pt[0], y = pt[1];
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Cached bounding boxes for 52 plates
  let plateBBoxes = null;
  function getPlateBBoxes() {
    if (plateBBoxes && plateBBoxes.length > 0) return plateBBoxes;
    if (!window.TECTONIC_DATA || !window.TECTONIC_DATA.plates) return [];

    plateBBoxes = window.TECTONIC_DATA.plates.features.map(f => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      function scan(coords) {
        for (let i = 0; i < coords.length; i++) {
          const c = coords[i];
          if (Array.isArray(c[0])) {
            scan(c);
          } else {
            if (c[0] < minX) minX = c[0];
            if (c[0] > maxX) maxX = c[0];
            if (c[1] < minY) minY = c[1];
            if (c[1] > maxY) maxY = c[1];
          }
        }
      }
      scan(f.geometry.coordinates);
      return { feature: f, bbox: [minX, minY, maxX, maxY] };
    });
    return plateBBoxes;
  }

  function haversineDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Helper to test if point is inside a polygon with outer ring and interior holes
  function isPointInsidePolygonWithHoles(pt, rings) {
    if (!rings || !rings.length) return false;
    if (!pointInPolygon(pt, rings[0])) return false;
    for (let h = 1; h < rings.length; h++) {
      if (pointInPolygon(pt, rings[h])) return false;
    }
    return true;
  }

  // Precise point-in-polygon plate resolver with hole inspection and coastal proximity fallback
  function findPlateForCoordinate(lng, lat) {
    if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) return null;
    const normLng = ((lng + 180) % 360 + 360) % 360 - 180;
    const bboxes = getPlateBBoxes();

    for (let i = 0; i < bboxes.length; i++) {
      const item = bboxes[i];
      const b = item.bbox;
      if (normLng < b[0] || normLng > b[2] || lat < b[1] || lat > b[3]) continue;

      const f = item.feature;
      const geom = f.geometry;
      if (!geom || !geom.coordinates) continue;

      if (geom.type === 'Polygon') {
        if (isPointInsidePolygonWithHoles([normLng, lat], geom.coordinates)) return f;
      } else if (geom.type === 'MultiPolygon') {
        for (let poly of geom.coordinates) {
          if (Array.isArray(poly) && isPointInsidePolygonWithHoles([normLng, lat], poly)) return f;
        }
      }
    }

    // Proximity fallback: If point is slightly offshore or on a micro boundary gap (< 250km)
    if (window.TECTONIC_DATA && window.TECTONIC_DATA.plates && Array.isArray(window.TECTONIC_DATA.plates.features)) {
      let closestFeature = null;
      let minKm = 250;
      const features = window.TECTONIC_DATA.plates.features;
      for (let i = 0; i < features.length; i++) {
        const feat = features[i];
        const geom = feat.geometry;
        if (!geom) continue;
        const rings = geom.type === 'Polygon' ? geom.coordinates : (geom.type === 'MultiPolygon' ? geom.coordinates.flat(1) : []);
        for (let r = 0; r < rings.length; r++) {
          const ring = rings[r];
          const step = ring.length > 50 ? 2 : 1;
          for (let p = 0; p < ring.length; p += step) {
            const ptLat = ring[p][1];
            if (Math.abs(ptLat - lat) * 110 > minKm) continue;
            const d = haversineDistanceKm(lat, normLng, ptLat, ring[p][0]);
            if (d < minKm) {
              minKm = d;
              closestFeature = feat;
            }
          }
        }
      }
      if (closestFeature) return closestFeature;
    }

    return null;
  }

  // --- Map Modes Routing Metadata (Hash URLs & Dynamic Page Titles) ---
  const MODES = {
    'tectonic-plates': {
      hash: 'plates',
      title: 'Tectonic Plates Map | Interactive 3D Earth Boundaries'
    },
    'earthquakes': {
      hash: 'earthquakes',
      title: 'Live Earthquakes Map | Real-Time USGS Feeds & Fault Lines'
    },
    'volcanoes': {
      hash: 'volcanoes',
      title: 'Active Volcanoes Map | Ring of Fire & Holocene Eruptions'
    },
    'hurricanes': {
      hash: 'hurricanes',
      title: 'Hurricanes & Cyclones Map | Historical Storm Tracks'
    },
    'aurora': {
      hash: 'northern-lights',
      title: 'Northern Lights Map | Auroral Ovals & Space Weather'
    },
    'trenches': {
      hash: 'ocean-trenches',
      title: 'Deep Ocean Trenches Map | Mariana & Subduction Chasms'
    },
    'craters': {
      hash: 'impact-craters',
      title: 'Meteorite Impact Craters Map | Global Impact Structures'
    },
    'tornadoes': {
      hash: 'tornadoes',
      title: 'Live Tornado Warnings & Storm Outbreaks Map | NOAA NWS Alerts & Radar'
    }
  };

  function getModeFromUrl() {
    try {
      const rawHash = window.location.hash.toLowerCase().replace(/^#/, '').replace(/^\/+|\/+$/g, '');
      const searchParams = new URLSearchParams(window.location.search);
      const urlParam = (searchParams.get('map') || searchParams.get('mode') || '').toLowerCase().replace(/^\/+|\/+$/g, '');
      const pathSegment = window.location.pathname.toLowerCase().split('/').filter(Boolean).pop() || '';
      const cleanPath = (pathSegment && pathSegment !== 'index' && pathSegment !== 'index.html') ? pathSegment : '';
      const candidate = rawHash || urlParam || cleanPath;

      if (candidate && !['geology-guide', 'app', 'faq', 'webapp', 'brand-logo-link'].includes(candidate)) {
        if (candidate.startsWith('plate=')) return 'tectonic-plates';
        for (const [modeKey, conf] of Object.entries(MODES)) {
          if (candidate === conf.hash || candidate === modeKey) return modeKey;
        }
        if (candidate === 'aurora' || candidate === 'northernlights') return 'aurora';
        if (candidate === 'trenches' || candidate === 'oceantrenches') return 'trenches';
        if (candidate === 'craters' || candidate === 'impactcraters') return 'craters';
        if (candidate === 'tornadoes' || candidate === 'tornado') return 'tornadoes';
      }
    } catch (e) {
      console.warn('getModeFromUrl error:', e);
    }
    return 'tectonic-plates';
  }

  // --- LocalStorage User State Persistence ---
  function saveUserSettings() {
    try {
      localStorage.setItem('tpm_hover_info', JSON.stringify(!!state.hoverInfoEnabled));
      localStorage.setItem('tpm_layers', JSON.stringify(state.layersVisibility));
      localStorage.setItem('tpm_style', state.currentStyle);
      if (state.activeBoundaryTypes) {
        localStorage.setItem('tpm_boundary_subfilters', JSON.stringify(state.activeBoundaryTypes));
      } else if (state.boundaryFilters) {
        localStorage.setItem('tpm_boundary_subfilters', JSON.stringify(state.boundaryFilters));
      }
      const hub = document.getElementById('maps-hub-bar');
      if (hub) {
        localStorage.setItem('tpm_explorer_minimized', JSON.stringify(hub.classList.contains('is-minimized')));
      }
      const layersPanel = document.getElementById('floating-layers-panel');
      if (layersPanel) {
        localStorage.setItem('tpm_layers_panel_collapsed', JSON.stringify(layersPanel.classList.contains('is-collapsed')));
      }
    } catch (e) {
      console.warn('saveUserSettings error:', e);
    }
  }

  function loadUserSettings() {
    try {
      const savedHover = localStorage.getItem('tpm_hover_info');
      state.hoverInfoEnabled = savedHover !== null ? JSON.parse(savedHover) : false;
      const hoverToggle = document.getElementById('toggle-hover-info');
      if (hoverToggle) hoverToggle.checked = state.hoverInfoEnabled;

      const savedStyle = localStorage.getItem('tpm_style');
      if (savedStyle && config.styles[savedStyle]) {
        state.currentStyle = savedStyle;
        document.querySelectorAll('.style-btn').forEach(btn => {
          btn.classList.toggle('is-active', btn.dataset.style === savedStyle);
        });
      }

      const savedLayers = localStorage.getItem('tpm_layers');
      if (savedLayers) {
        const parsed = JSON.parse(savedLayers);
        Object.keys(parsed).forEach(k => {
          if (typeof state.layersVisibility[k] !== 'undefined') {
            state.layersVisibility[k] = parsed[k];
          }
        });
      }

      Object.keys(state.layersVisibility).forEach(k => {
        const toggle = document.getElementById(`toggle-${k}-layer`);
        if (toggle) toggle.checked = state.layersVisibility[k];
      });

      const savedBFilters = localStorage.getItem('tpm_boundary_subfilters');
      if (savedBFilters) {
        try {
          const parsed = JSON.parse(savedBFilters);
          if (Array.isArray(parsed)) {
            state.activeBoundaryTypes = parsed;
          } else if (typeof parsed === 'object' && parsed !== null) {
            state.activeBoundaryTypes = Object.keys(parsed).filter(k => parsed[k]);
          }
        } catch (e) {}
      }
      if (!state.activeBoundaryTypes || state.activeBoundaryTypes.length === 0) {
        state.activeBoundaryTypes = ['convergent', 'divergent', 'transform'];
      }
      state.boundaryFilters = {
        convergent: state.activeBoundaryTypes.includes('convergent'),
        divergent: state.activeBoundaryTypes.includes('divergent'),
        transform: state.activeBoundaryTypes.includes('transform')
      };
      ['convergent', 'divergent', 'transform'].forEach(t => {
        const on = state.activeBoundaryTypes.includes(t);
        const btn = document.getElementById(`btn-filter-${t}`);
        if (btn) {
          btn.classList.toggle('is-active', on);
          btn.style.opacity = on ? '1' : '0.4';
        }
      });

      const savedExpMin = localStorage.getItem('tpm_explorer_minimized');
      const hub = document.getElementById('maps-hub-bar');
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (savedExpMin !== null && hub) {
        hub.classList.toggle('is-minimized', JSON.parse(savedExpMin));
      } else if (isMobile && hub) {
        hub.classList.add('is-minimized');
      }

      const savedLayersCollapsed = localStorage.getItem('tpm_layers_panel_collapsed');
      const layersPanel = document.getElementById('floating-layers-panel');
      if (savedLayersCollapsed !== null && layersPanel) {
        layersPanel.classList.toggle('is-collapsed', JSON.parse(savedLayersCollapsed));
      } else if (isMobile && layersPanel) {
        layersPanel.classList.add('is-collapsed');
      }
    } catch (e) {
      console.warn('loadUserSettings error:', e);
    }
  }

  // --- Map Initialization ---
  function initMap() {
    loadUserSettings();

    const initialMode = getModeFromUrl();
    state.currentMode = initialMode;

    if (MODES[initialMode]) {
      if (window.location.hash || initialMode !== 'tectonic-plates') {
        document.title = MODES[initialMode].title;
      }
      document.querySelectorAll('.map-mode-card').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.mode === initialMode);
      });
      if (['volcanoes', 'hurricanes', 'tornadoes', 'aurora', 'trenches', 'craters'].includes(initialMode)) {
        loadDataset(initialMode);
      }
    }

    if (!navigator.onLine) {
      state.currentStyle = 'offline';
      document.querySelectorAll('.style-btn').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.style === 'offline');
      });
    }

    const initialStyleSpec = config.styles[state.currentStyle].style;
    const styleParam = typeof initialStyleSpec === 'object'
      ? JSON.parse(JSON.stringify(initialStyleSpec))
      : initialStyleSpec;

    state.map = new maplibregl.Map({
      container: 'map-container',
      style: styleParam,
      center: config.initialCenter,
      zoom: config.initialZoom,
      pitch: config.initialPitch,
      fadeDuration: 0,
      maxTileCacheSize: 60,
      trackResize: true,
      attributionControl: false
    });

    state.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    state.map.addControl(new maplibregl.FullscreenControl(), 'top-right');
    state.map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');

    const compactAttribution = new maplibregl.AttributionControl({ compact: true });
    compactAttribution._updateCompact = function () {
      if (this._container) this._container.classList.add('maplibregl-compact');
    };
    state.map.addControl(compactAttribution, 'bottom-right');

    state.map.on('load', onMapLoad);
    state.map.on('style.load', ensureTectonicLayers);
    state.map.on('styledata', () => {
      if (state.map && state.map.isStyleLoaded() && !state.map.getLayer('boundaries-line')) {
        ensureTectonicLayers();
      }
    });
    state.map.on('idle', () => {
      if (state.map && state.map.isStyleLoaded() && !state.map.getLayer('boundaries-line')) {
        ensureTectonicLayers();
      }
    });
  }

  function onMapLoad() {
    ensureTectonicLayers();
    setupMapInteractions();

    const attribDetails = document.querySelector('details.maplibregl-ctrl-attrib');
    if (attribDetails) {
      attribDetails.removeAttribute('open');
      attribDetails.classList.remove('maplibregl-compact-show');
      attribDetails.classList.add('maplibregl-compact');
    }

    setupSearchTriggers();

    if (state.currentMode && state.currentMode !== 'tectonic-plates') {
      window.switchMapMode(state.currentMode, false);
    } else {
      renderDefaultPlateLegend();
      hideModeFilterUI();
    }

    handleInitialQueryParams();
    state.map.on('pitch', update3DButtonState);
    update3DButtonState();
  }

  function handleInitialQueryParams() {
    try {
      const params = new URLSearchParams(window.location.search);
      let plateCode = params.get('plate');
      const hash = window.location.hash;
      if (!plateCode && hash.includes('plate=')) {
        const match = hash.match(/plate=([a-zA-Z0-9_\-%]+)/i);
        if (match) plateCode = decodeURIComponent(match[1]);
      }

      const lat = parseFloat(params.get('lat'));
      const lng = parseFloat(params.get('lng'));
      if (!isNaN(lat) && !isNaN(lng)) {
        setTimeout(() => {
          showLocationPin(lng, lat);
        }, 450);
      } else if (plateCode) {
        setTimeout(() => {
          window.selectAndZoomPlate(plateCode);
        }, 350);
      }
    } catch (e) {}
  }

  // --- Kinematic Movement Icons (Structural Geology Symbology) ---
  function initBoundaryKinematicIcons(map) {
    if (!map) return;

    // 1. Subduction Zone Tooth (Convergent Subduction - SUB)
    if (!map.hasImage('icon-boundary-subduction')) {
      try {
        const c = document.createElement('canvas');
        c.width = 48;
        c.height = 48;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 48, 48);

          // Subduction tooth (solid triangle pointing up into overriding plate)
          ctx.beginPath();
          ctx.moveTo(13, 24);
          ctx.lineTo(35, 24);
          ctx.lineTo(24, 7);
          ctx.closePath();

          ctx.fillStyle = '#ff3860';
          ctx.shadowColor = 'rgba(255, 56, 96, 0.6)';
          ctx.shadowBlur = 6;
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2.5;
          ctx.lineJoin = 'round';
          ctx.stroke();

          // Apex white highlight dot
          ctx.beginPath();
          ctx.arc(24, 11, 1.6, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          const imgData = ctx.getImageData(0, 0, 48, 48);
          map.addImage('icon-boundary-subduction', imgData);
        }
      } catch (e) {
        console.warn('[BoundaryIcon] subduction skipped:', e);
      }
    }

    // 2. Continental Collision Teeth (CCB - Himalayas/Alps)
    if (!map.hasImage('icon-boundary-collision')) {
      try {
        const c = document.createElement('canvas');
        c.width = 48;
        c.height = 48;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 48, 48);

          // Double interlocking / serrated teeth for crustal thickening
          ctx.beginPath();
          ctx.moveTo(10, 24);
          ctx.lineTo(24, 24);
          ctx.lineTo(17, 8);
          ctx.closePath();
          ctx.fillStyle = '#f43f5e';
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(24, 24);
          ctx.lineTo(38, 24);
          ctx.lineTo(31, 8);
          ctx.closePath();
          ctx.fillStyle = '#f43f5e';
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.stroke();

          const imgData = ctx.getImageData(0, 0, 48, 48);
          map.addImage('icon-boundary-collision', imgData);
        }
      } catch (e) {
        console.warn('[BoundaryIcon] collision skipped:', e);
      }
    }

    // 3. Divergent Spreading Arrows (Plates pulling away perpendicular to line)
    if (!map.hasImage('icon-boundary-divergent')) {
      try {
        const c = document.createElement('canvas');
        c.width = 48;
        c.height = 48;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 48, 48);

          // Center ridge axis bar
          ctx.beginPath();
          ctx.moveTo(24, 18);
          ctx.lineTo(24, 30);
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 3.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(24, 18);
          ctx.lineTo(24, 30);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.8;
          ctx.stroke();

          // Upward Arrow (pointing North/away)
          ctx.beginPath();
          ctx.moveTo(24, 20);
          ctx.lineTo(24, 10);
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 3.2;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(17, 13);
          ctx.lineTo(24, 5);
          ctx.lineTo(31, 13);
          ctx.closePath();
          ctx.fillStyle = '#fbbf24';
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Downward Arrow (pointing South/away)
          ctx.beginPath();
          ctx.moveTo(24, 28);
          ctx.lineTo(24, 38);
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 3.2;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(17, 35);
          ctx.lineTo(24, 43);
          ctx.lineTo(31, 35);
          ctx.closePath();
          ctx.fillStyle = '#fbbf24';
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.stroke();

          const imgData = ctx.getImageData(0, 0, 48, 48);
          map.addImage('icon-boundary-divergent', imgData);
        }
      } catch (e) {
        console.warn('[BoundaryIcon] divergent skipped:', e);
      }
    }

    // 4. Transform Strike-Slip Shear Arrows (Parallel opposing slip vectors)
    if (!map.hasImage('icon-boundary-transform')) {
      try {
        const c = document.createElement('canvas');
        c.width = 48;
        c.height = 48;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 48, 48);

          // Top shear arrow: pointing Right ->
          ctx.beginPath();
          ctx.moveTo(11, 15);
          ctx.lineTo(31, 15);
          ctx.strokeStyle = '#00d1b2';
          ctx.lineWidth = 3.2;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(29, 9);
          ctx.lineTo(38, 15);
          ctx.lineTo(29, 21);
          ctx.closePath();
          ctx.fillStyle = '#00d1b2';
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Bottom shear arrow: pointing Left <-
          ctx.beginPath();
          ctx.moveTo(37, 33);
          ctx.lineTo(17, 33);
          ctx.strokeStyle = '#00d1b2';
          ctx.lineWidth = 3.2;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(19, 27);
          ctx.lineTo(10, 33);
          ctx.lineTo(19, 39);
          ctx.closePath();
          ctx.fillStyle = '#00d1b2';
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.stroke();

          const imgData = ctx.getImageData(0, 0, 48, 48);
          map.addImage('icon-boundary-transform', imgData);
        }
      } catch (e) {
        console.warn('[BoundaryIcon] transform skipped:', e);
      }
    }

    // 5. Plate Velocity Directional Arrowhead
    if (!map.hasImage('icon-velocity-arrow')) {
      try {
        const c = document.createElement('canvas');
        c.width = 36;
        c.height = 36;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 36, 36);

          ctx.beginPath();
          ctx.moveTo(18, 4);
          ctx.lineTo(29, 29);
          ctx.lineTo(18, 22);
          ctx.lineTo(7, 29);
          ctx.closePath();

          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
          ctx.shadowBlur = 6;
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2.2;
          ctx.lineJoin = 'round';
          ctx.stroke();

          // Center spine highlight
          ctx.beginPath();
          ctx.moveTo(18, 8);
          ctx.lineTo(18, 20);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          const imgData = ctx.getImageData(0, 0, 36, 36);
          map.addImage('icon-velocity-arrow', imgData);
        }
      } catch (e) {
        console.warn('[VelocityIcon] arrow skipped:', e);
      }
    }
  }

  // --- Add Core Sources & Layers ---
  function addTectonicSourcesAndLayers() {
    const map = state.map;
    if (!map) return;
    const data = window.TECTONIC_DATA;
    if (!data) return;

    // 1. Tectonic Plates
    if (!map.getSource('tectonic-plates')) {
      if (!data._platesInitialized) {
        data.plates.features.forEach((feat, idx) => {
          feat.id = idx + 1;
          feat.properties.color = PLATE_COLORS[idx % PLATE_COLORS.length];
        });
        data._platesInitialized = true;
      }
      map.addSource('tectonic-plates', { type: 'geojson', data: data.plates });
    }

    if (!map.getLayer('plates-fill')) {
      map.addLayer({
        id: 'plates-fill',
        type: 'fill',
        source: 'tectonic-plates',
        layout: {
          visibility: state.layersVisibility.plates ? 'visible' : 'none'
        },
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false], 0.35,
            ['boolean', ['feature-state', 'selected'], false], 0.45,
            0.12
          ]
        }
      });
    }

    if (!map.getLayer('plates-outline')) {
      map.addLayer({
        id: 'plates-outline',
        type: 'line',
        source: 'tectonic-plates',
        layout: {
          visibility: state.layersVisibility.plates ? 'visible' : 'none'
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false], 2.5,
            ['boolean', ['feature-state', 'selected'], false], 3.0,
            1.0
          ],
          'line-opacity': 0.6
        }
      });
    }

    // 2. Tectonic Boundaries
    if (!map.getSource('tectonic-boundaries')) {
      map.addSource('tectonic-boundaries', { type: 'geojson', data: data.boundaries });
    }

    if (!map.getLayer('boundaries-line-glow')) {
      map.addLayer({
        id: 'boundaries-line-glow',
        type: 'line',
        source: 'tectonic-boundaries',
        layout: {
          visibility: state.layersVisibility.boundaries ? 'visible' : 'none',
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': [
            'match', ['get', 'boundary_type'],
            'convergent', '#ff3860',
            'divergent', '#ffb703',
            'transform', '#00d1b2',
            '#9d4edd'
          ],
          'line-width': 5.5,
          'line-opacity': 0.35,
          'line-blur': 3.0
        }
      });
    }

    if (!map.getLayer('boundaries-line')) {
      map.addLayer({
        id: 'boundaries-line',
        type: 'line',
        source: 'tectonic-boundaries',
        layout: {
          visibility: state.layersVisibility.boundaries ? 'visible' : 'none',
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': [
            'match', ['get', 'boundary_type'],
            'convergent', '#ff3860',
            'divergent', '#ffb703',
            'transform', '#00d1b2',
            '#9d4edd'
          ],
          'line-width': 2.2,
          'line-opacity': 0.95
        }
      });
    }

    // Register Kinematic Movement Icons (Subduction teeth, Divergent spreading, Strike-slip shear, Collision)
    initBoundaryKinematicIcons(map);

    if (!map.getLayer('boundaries-symbols')) {
      map.addLayer({
        id: 'boundaries-symbols',
        type: 'symbol',
        source: 'tectonic-boundaries',
        layout: {
          visibility: (state.layersVisibility.boundaries && state.layersVisibility.boundarySymbols !== false) ? 'visible' : 'none',
          'symbol-placement': 'line',
          'symbol-spacing': 80,
          'icon-image': [
            'match', ['get', 'boundary_class'],
            'SUB', 'icon-boundary-subduction',
            'CCB', 'icon-boundary-collision',
            [
              'match', ['get', 'boundary_type'],
              'convergent', 'icon-boundary-subduction',
              'divergent', 'icon-boundary-divergent',
              'transform', 'icon-boundary-transform',
              'icon-boundary-divergent'
            ]
          ],
          'icon-size': [
            'interpolate', ['linear'], ['zoom'],
            1.5, 0.38,
            4, 0.60,
            7, 0.85,
            10, 1.10
          ],
          'icon-rotation-alignment': 'map',
          'icon-pitch-alignment': 'map',
          'icon-keep-upright': false,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        }
      });
    }

    // 3. Plate Velocities
    if (!map.getSource('plate-velocities')) {
      map.addSource('plate-velocities', { type: 'geojson', data: data.velocities });
    }

    if (!map.getLayer('velocities-arrows')) {
      map.addLayer({
        id: 'velocities-arrows',
        type: 'line',
        source: 'plate-velocities',
        layout: {
          visibility: state.layersVisibility.velocities ? 'visible' : 'none',
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#38bdf8',
          'line-width': 3.0,
          'line-opacity': 0.85,
          'line-dasharray': [2, 1]
        }
      });
    }

    // Plate Velocity Endpoints with Directional Arrowheads & Speed Labels
    if (!map.getSource('plate-velocities-points')) {
      const velFeatures = (data.velocities && data.velocities.features ? data.velocities.features : []).map(f => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: f.properties.endpoint || (f.geometry && f.geometry.coordinates && f.geometry.coordinates[1])
        },
        properties: {
          ...f.properties,
          label: `${f.properties.speed_cmyr || ''} cm/yr`
        }
      }));
      map.addSource('plate-velocities-points', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: velFeatures }
      });
    }

    if (!map.getLayer('velocities-arrowheads')) {
      map.addLayer({
        id: 'velocities-arrowheads',
        type: 'symbol',
        source: 'plate-velocities-points',
        layout: {
          visibility: state.layersVisibility.velocities ? 'visible' : 'none',
          'icon-image': 'icon-velocity-arrow',
          'icon-rotate': ['get', 'azimuth'],
          'icon-rotation-alignment': 'map',
          'icon-pitch-alignment': 'map',
          'icon-size': [
            'interpolate', ['linear'], ['zoom'],
            1.5, 0.50,
            4, 0.70,
            7, 0.90
          ],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'text-field': ['concat', ['to-string', ['get', 'speed_cmyr']], ' cm/yr'],
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size': 11,
          'text-offset': [0, 1.25],
          'text-anchor': 'top',
          'text-optional': true,
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#38bdf8',
          'text-halo-color': '#0f172a',
          'text-halo-width': 2.0
        }
      });
    }

    // Ensure active boundary subfilters are applied to newly created layers
    updateBoundaryFilterMap();

    // If Earthquakes or Phenomena were previously loaded, re-sync their layers
    if (state.earthquakesData && window.TPM_Earthquakes) {
      window.TPM_Earthquakes.initLayers(map);
    }
    if (window.TPM_Phenomena) {
      window.TPM_Phenomena.initLayers(map);
    }
  }

  // --- Smart Collision-Free Feature Popup Handler ---
  let activePopup = null;
  function closeSmartPopup() {
    if (activePopup) {
      try { activePopup.remove(); } catch (e) {}
      activePopup = null;
    }
    document.querySelectorAll('.maplibregl-popup').forEach(p => {
      try { p.remove(); } catch (e) {}
    });
  }

  function showSmartPopup(coords, htmlContent, options = {}) {
    const map = state.map;
    if (!map) return;

    closeSmartPopup();

    const lngLat = Array.isArray(coords) ? { lng: coords[0], lat: coords[1] } : coords;
    const point = map.project(lngLat);
    const container = map.getContainer();
    const width = container.clientWidth;
    const height = container.clientHeight;
    const isMobile = window.innerWidth <= 768;

    const hubBar = document.getElementById('maps-hub-bar');
    let hubBottom = isMobile ? 65 : 75;
    if (hubBar && getComputedStyle(hubBar).display !== 'none') {
      const rect = hubBar.getBoundingClientRect();
      if (rect.height > 0 && rect.bottom > 0) {
        hubBottom = rect.bottom;
      }
    }
    const topBlockedZone = Math.max(hubBottom + 16, isMobile ? 70 : 85);
    const bottomBlockedZone = isMobile ? 120 : 60;
    const estCardHeight = options.estimatedHeight || 260;

    let anchor = 'bottom';
    let offsetY = -14;
    let offsetX = 0;

    if (point.y - estCardHeight < topBlockedZone) {
      if (point.y + estCardHeight < height - bottomBlockedZone) {
        anchor = 'top';
        offsetY = 16;
      } else {
        anchor = point.x < width / 2 ? 'left' : 'right';
        offsetY = 0;
        offsetX = anchor === 'left' ? 16 : -16;
      }
    }

    const panThreshold = topBlockedZone + 20;
    if (anchor === 'bottom' && point.y - estCardHeight < panThreshold) {
      const neededPanY = panThreshold - (point.y - estCardHeight);
      map.panBy([0, -neededPanY], { duration: 250 });
    }

    const popupClass = (options.className || 'custom-popup') + ' smart-popup';

    activePopup = new maplibregl.Popup({
      anchor: anchor,
      offset: anchor === 'top' ? [0, offsetY] : (anchor === 'bottom' ? [0, offsetY] : [offsetX, 0]),
      className: popupClass,
      maxWidth: isMobile ? '310px' : '360px',
      closeButton: true,
      closeOnClick: true
    })
      .setLngLat(lngLat)
      .setHTML(htmlContent)
      .addTo(map);

    activePopup.on('close', () => {
      activePopup = null;
    });
  }

  function updateHoverTooltipPosition(tooltip, point) {
    if (!tooltip) return;
    const tooltipWidth = tooltip.offsetWidth || 240;
    const tooltipHeight = tooltip.offsetHeight || 100;
    const isMobile = window.innerWidth <= 768;
    const container = state.map ? state.map.getContainer() : null;
    const containerWidth = container ? container.clientWidth : window.innerWidth;
    const containerHeight = container ? container.clientHeight : window.innerHeight;

    let left = point.x + 14;
    let top = point.y + 14;

    if (left + tooltipWidth > containerWidth - 12) {
      left = point.x - tooltipWidth - 14;
    }
    if (top + tooltipHeight > containerHeight - (isMobile ? 120 : 40)) {
      top = point.y - tooltipHeight - 14;
    }

    tooltip.style.left = `${Math.max(10, left)}px`;
    tooltip.style.top = `${Math.max(60, top)}px`;
  }

  // --- Setup Map Interactions (Click, Hover, Popups) ---
  let cachedHoverLayers = null;
  let cachedClickLayers = null;
  function invalidateInteractiveLayers() {
    cachedHoverLayers = null;
    cachedClickLayers = null;
  }

  function getActiveHoverLayers(map) {
    if (cachedHoverLayers) return cachedHoverLayers;
    const candidates = [];
    if (state.layersVisibility.earthquakes) candidates.push('earthquakes-points', 'earthquakes-peak-halo', 'earthquakes-peak-label');
    if (state.layersVisibility.volcanoes) candidates.push('volcanoes-active', 'volcanoes-recent-dormant', 'volcanoes-ancient-dormant', 'volcanoes-summit-point');
    if (state.layersVisibility.hurricanes) candidates.push('hurricanes-symbol', 'hurricanes-points');
    if (state.layersVisibility.tornadoes) candidates.push('tornadoes-points', 'tornadoes-polygon-fill', 'tornadoes-track-line');
    if (state.layersVisibility.aurora) candidates.push('aurora-stations');
    if (state.layersVisibility.trenches) candidates.push('trenches-points');
    if (state.layersVisibility.craters) candidates.push('craters-points');
    if (state.layersVisibility.boundaries) candidates.push('boundaries-line', 'boundaries-symbols');
    if (state.layersVisibility.velocities) candidates.push('velocities-arrowheads');
    if (state.layersVisibility.plates) candidates.push('plates-fill');

    cachedHoverLayers = candidates.filter(id => map.getLayer(id));
    return cachedHoverLayers;
  }

  function getActiveClickLayers(map) {
    if (cachedClickLayers) return cachedClickLayers;
    const candidates = [];
    if (state.layersVisibility.earthquakes) candidates.push('earthquakes-points', 'earthquakes-peak-halo', 'earthquakes-peak-label');
    if (state.layersVisibility.volcanoes) candidates.push('volcanoes-active', 'volcanoes-recent-dormant', 'volcanoes-ancient-dormant', 'volcanoes-summit-point');
    if (state.layersVisibility.hurricanes) candidates.push('hurricanes-symbol', 'hurricanes-points');
    if (state.layersVisibility.tornadoes) candidates.push('tornadoes-points', 'tornadoes-polygon-fill', 'tornadoes-track-line');
    if (state.layersVisibility.aurora) candidates.push('aurora-stations', 'aurora-line');
    if (state.layersVisibility.trenches) candidates.push('trenches-points');
    if (state.layersVisibility.craters) candidates.push('craters-points');
    if (state.layersVisibility.boundaries) candidates.push('boundaries-line', 'boundaries-symbols');
    if (state.layersVisibility.velocities) candidates.push('velocities-arrowheads');
    if (state.layersVisibility.plates) candidates.push('plates-fill');

    cachedClickLayers = candidates.filter(id => map.getLayer(id));
    return cachedClickLayers;
  }

  function setupMapInteractions() {
    const map = state.map;
    if (!map) return;

    // Hover tooltip tracking with requestAnimationFrame throttling
    let mouseMoveTicking = false;
    let latestMouseEvent = null;

    map.on('mousemove', (e) => {
      latestMouseEvent = e;
      if (!mouseMoveTicking) {
        mouseMoveTicking = true;
        requestAnimationFrame(() => {
          mouseMoveTicking = false;
          if (!latestMouseEvent || !state.map) return;
          processMapMouseMove(latestMouseEvent);
        });
      }
    });

    function processMapMouseMove(e) {
      const activeLayers = getActiveHoverLayers(map);
      if (activeLayers.length === 0) return;

      const features = map.queryRenderedFeatures(e.point, { layers: activeLayers });
      const tooltip = document.getElementById('plate-hover-tooltip');

      if (features.length > 0) {
        map.getCanvas().style.cursor = 'pointer';

        // Check if Earthquakes module handles hover
        if (window.TPM_Earthquakes && window.TPM_Earthquakes.handleHoverTooltip(features, e, tooltip)) {
          return;
        }

        // Check if Phenomena module handles hover
        if (window.TPM_Phenomena && window.TPM_Phenomena.handleHoverTooltip(features, e, tooltip)) {
          return;
        }

        const plateFeat = features.find(f => f.layer.id === 'plates-fill');
        if (plateFeat) {
          if (state.hoveredPlateId !== null && state.hoveredPlateId !== plateFeat.id) {
            map.setFeatureState(
              { source: 'tectonic-plates', id: state.hoveredPlateId },
              { hover: false }
            );
          }
          state.hoveredPlateId = plateFeat.id;
          map.setFeatureState(
            { source: 'tectonic-plates', id: state.hoveredPlateId },
            { hover: true }
          );

          if (tooltip && state.hoverInfoEnabled) {
            const p = plateFeat.properties;
            const badgeColor = p.class === 'major' ? '#3b82f6' : (p.class === 'minor' ? '#f59e0b' : '#10b981');
            const classLabel = p.class ? (p.class.charAt(0).toUpperCase() + p.class.slice(1) + ' Plate') : 'Tectonic Plate';
            const crustLabel = p.crustType ? (p.crustType.charAt(0).toUpperCase() + p.crustType.slice(1) + ' Crust') : '';

            tooltip.innerHTML = `
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:4px;">
                <span style="font-weight:700; color:#fff; font-size:0.95rem;">${p.PlateName}</span>
                <span style="font-family:var(--font-mono); font-size:0.75rem; background:${badgeColor}; color:#fff; padding:1px 6px; border-radius:3px; font-weight:700;">${p.Code}</span>
              </div>
              <div style="font-size:0.75rem; color:#cbd5e1; margin-bottom:4px;">${classLabel}${crustLabel ? ' &bull; ' + crustLabel : ''}</div>
              <div style="font-size:0.75rem; color:#94a3b8; display:flex; justify-content:space-between; gap:12px;">
                <span>Area: <strong style="color:#e2e8f0;">${p.size || (p.areaKm2 ? `${p.areaKm2.toLocaleString()} km²` : 'N/A')}</strong></span>
                <span>Speed: <strong style="color:#38bdf8;">${p.speed || (p.speedCmPerYear ? `${p.speedCmPerYear} cm/yr` : 'N/A')}</strong></span>
              </div>
            `;
            updateHoverTooltipPosition(tooltip, e.point);
            tooltip.style.display = 'block';
            tooltip.style.opacity = '1';
          }
        }
      } else {
        map.getCanvas().style.cursor = '';
        if (state.hoveredPlateId !== null) {
          map.setFeatureState(
            { source: 'tectonic-plates', id: state.hoveredPlateId },
            { hover: false }
          );
          state.hoveredPlateId = null;
        }
        if (tooltip) {
          tooltip.style.display = 'none';
          tooltip.style.opacity = '0';
        }
      }
    }

    map.on('mouseleave', 'plates-fill', () => {
      map.getCanvas().style.cursor = '';
      if (state.hoveredPlateId !== null) {
        map.setFeatureState(
          { source: 'tectonic-plates', id: state.hoveredPlateId },
          { hover: false }
        );
        state.hoveredPlateId = null;
      }
      const tooltip = document.getElementById('plate-hover-tooltip');
      if (tooltip) {
        tooltip.style.display = 'none';
        tooltip.style.opacity = '0';
      }
    });

    // Click selection
    map.on('click', (e) => {
      const activeLayers = getActiveClickLayers(map);
      if (activeLayers.length === 0) return;

      const features = map.queryRenderedFeatures(e.point, { layers: activeLayers });
      if (features.length === 0) return;

      // 1. Earthquakes
      if (window.TPM_Earthquakes && window.TPM_Earthquakes.handlePopup(features, e, map)) {
        return;
      }

      // 2. Phenomena modes
      if (window.TPM_Phenomena && window.TPM_Phenomena.handlePopup(features, e, map)) {
        return;
      }

      // 3. Boundaries
      const boundary = features.find(f => f.layer.id === 'boundaries-line' || f.layer.id === 'boundaries-symbols');
      if (boundary) {
        const props = boundary.properties;
        const bType = (props.boundary_type || '').toLowerCase();
        const bClass = (props.boundary_class || '').toUpperCase();

        let motionGlyph = '▲';
        let motionTitle = 'Subduction Zone';
        let motionSummary = 'One tectonic plate plunges beneath another into the mantle.';
        if (bClass === 'CCB') {
          motionGlyph = '▲▲';
          motionTitle = 'Continental Collision';
          motionSummary = 'Two continental plates collide under massive pressure, crumpling crust into mountain belts.';
        } else if (bType === 'divergent') {
          motionGlyph = '←|→';
          motionTitle = 'Seafloor Spreading / Rifting';
          motionSummary = 'Plates pull apart horizontally as rising magma creates new oceanic crust.';
        } else if (bType === 'transform') {
          motionGlyph = '⇋';
          motionTitle = 'Strike-Slip Horizontal Shear';
          motionSummary = 'Plates grind past each other horizontally along fractures without creating or destroying crust.';
        }

        showSmartPopup(e.lngLat, `
          <div class="popup-title">${props.boundary_name || 'Plate Boundary'}</div>
          <div class="popup-meta">Plates: <strong>${props.PlateA || ''}</strong> &amp; <strong>${props.PlateB || ''}</strong></div>
          <div style="font-size:0.85rem; color:#cbd5e1; margin-bottom:8px;">${props.boundary_desc || ''}</div>
          <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:6px 8px; margin-bottom:8px; font-size:0.8rem;">
            <div style="font-weight:700; color:#f8fafc; display:flex; align-items:center; gap:6px; margin-bottom:2px;">
              <span style="color:${props.boundary_color || '#ff3860'}; font-size:0.95rem;">${motionGlyph}</span>
              <span>${motionTitle}</span>
            </div>
            <div style="color:#94a3b8; line-height:1.35;">${motionSummary}</div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; gap:8px;">
            <span class="tag is-small" style="background:${props.boundary_color}; color:#fff; font-weight:700;">
              ${(props.boundary_type || '').toUpperCase()}
            </span>
            <button class="button is-small is-rounded" style="background:#0284c7; color:#fff; font-size:0.75rem; font-weight:700; height:24px; padding:0 8px; border:none; cursor:pointer;" onclick="window.showBoundaryCrossSection('${props.boundary_type || 'convergent'}', '${encodeURIComponent(props.boundary_name || '')}')">
              <i class="fa-solid fa-mountain-sun mr-1"></i> Cross-Section
            </button>
          </div>
        `, { estimatedHeight: 230 });
        return;
      }

      // 3b. Velocity Arrowhead click
      const velArrow = features.find(f => f.layer.id === 'velocities-arrowheads');
      if (velArrow) {
        const props = velArrow.properties;
        showSmartPopup(e.lngLat, `
          <div class="popup-title"><i class="fa-solid fa-arrow-trend-up mr-1" style="color:#38bdf8;"></i> ${props.plate || 'Plate Drift Velocity'}</div>
          <div class="popup-meta">Plate Code: <strong>${props.code || ''}</strong> &bull; Heading: <strong>${props.direction || ''} (${props.azimuth || 0}&deg;)</strong></div>
          <div style="background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.3); border-radius:6px; padding:8px 10px; margin:8px 0; font-size:0.85rem; color:#f0f9ff;">
            <div><strong>Drift Speed:</strong> <span style="font-size:1.1rem; font-weight:800; color:#38bdf8;">${props.speed_cmyr || ''} cm/year</span> (${props.speed_mmyr || ''} mm/yr)</div>
            <div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;">Measured relative to No-Net-Rotation (NNR) reference frame</div>
          </div>
        `, { estimatedHeight: 180 });
        return;
      }

      // 4. Plate polygon selection
      const plate = features.find(f => f.layer.id === 'plates-fill');
      if (plate) {
        selectPlate(plate);
      }
    });
  }

  // --- Select Plate and Populate Inspector ---
  function selectPlate(plateFeature) {
    const map = state.map;
    if (!map || !plateFeature) return;

    if (state.selectedPlate) {
      map.setFeatureState(
        { source: 'tectonic-plates', id: state.selectedPlate.id },
        { selected: false }
      );
    }

    state.selectedPlate = plateFeature;
    map.setFeatureState(
      { source: 'tectonic-plates', id: plateFeature.id },
      { selected: true }
    );

    populatePlateInspector(plateFeature.properties);
    renderNeighborsForPlate(plateFeature.properties.Code);
    renderVelocityForPlate(plateFeature.properties.Code);
    renderEarthquakesForPlate(plateFeature.properties);

    const sidebar = document.getElementById('inspector-sidebar');
    if (sidebar) sidebar.classList.remove('is-hidden');
    const drawer = document.getElementById('inspector-drawer');
    if (drawer) drawer.classList.add('is-active');

    try {
      const code = plateFeature.properties.Code;
      if (code) {
        const modeConf = MODES[state.currentMode] || MODES['tectonic-plates'];
        const baseHash = '#' + modeConf.hash;
        window.history.replaceState(null, '', `${baseHash}?plate=${encodeURIComponent(code)}`);
      }
    } catch (e) {}
  }

  // --- Close Inspector Drawer / Sidebar ---
  window.closeInspector = function () {
    const sidebar = document.getElementById('inspector-sidebar');
    if (sidebar) sidebar.classList.add('is-hidden');
    const drawer = document.getElementById('inspector-drawer');
    if (drawer) drawer.classList.remove('is-active');
    if (state.selectedPlate && state.map) {
      try {
        state.map.setFeatureState(
          { source: 'tectonic-plates', id: state.selectedPlate.id },
          { selected: false }
        );
      } catch (e) {}
    }
    state.selectedPlate = null;
  };

  // --- Share Direct Link to Selected Plate ---
  window.shareCurrentPlate = function () {
    if (!state.selectedPlate) return;
    const code = state.selectedPlate.properties.Code || '';
    const name = state.selectedPlate.properties.PlateName || 'Plate';
    const shareUrl = `${window.location.origin}${window.location.pathname}#plates?plate=${encodeURIComponent(code)}`;
    const label = document.getElementById('share-btn-label');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        if (label) {
          const orig = label.textContent;
          label.textContent = 'Copied!';
          setTimeout(() => { label.textContent = orig; }, 2000);
        }
      }).catch(() => {
        prompt(`Share link to ${name}:`, shareUrl);
      });
    } else {
      prompt(`Share link to ${name}:`, shareUrl);
    }
  };

  function populatePlateInspector(props) {
    const pName = props.PlateName || 'Unknown Plate';
    const pCode = props.Code || '--';
    const pClass = (props.class || 'major').toLowerCase();
    const crust = props.crustType || props.crust_type || 'Mixed';
    const formattedCrust = crust.charAt(0).toUpperCase() + crust.slice(1);
    const sizeStr = props.size || (props.areaKm2 ? `${(props.areaKm2 / 1000000).toFixed(2)}M km²` : 'N/A');
    const speedVal = props.speedCmPerYear || props.speed || (props.driftRate ? parseFloat(props.driftRate) : 2.5);
    const speedStr = typeof speedVal === 'number' ? `${speedVal} cm/yr` : (speedVal.toString().includes('cm') ? speedVal : `${speedVal} cm/yr`);
    const moveStr = props.direction ? `${props.direction}${props.azimuth ? ` (${props.azimuth}°)` : ''} (relative to NNR)` : 'WSW (relative to NNR)';

    // 1. Header Badges & Titles
    const title = document.getElementById('plate-name-title') || document.getElementById('inspector-title');
    const codeBadge = document.getElementById('plate-code-badge') || document.getElementById('inspector-code');
    const classBadge = document.getElementById('inspector-class-badge');
    const classSub = document.getElementById('plate-class-sub') || document.getElementById('inspector-type');

    if (title) title.textContent = pName;
    if (codeBadge) codeBadge.textContent = pCode;
    if (classBadge) {
      classBadge.textContent = pClass.toUpperCase();
      classBadge.className = `tag is-small ${pClass === 'major' ? 'is-primary' : (pClass === 'minor' ? 'is-warning' : 'is-info')}`;
    }
    if (classSub) classSub.textContent = `${pClass.toUpperCase()} Plate (${formattedCrust} Crust)`;

    // 2. Metrics & Drift Speed Meter
    const sizeEl = document.getElementById('plate-size-val') || document.getElementById('inspector-area');
    const speedEl = document.getElementById('plate-speed-val') || document.getElementById('inspector-rate');
    const moveEl = document.getElementById('plate-movement-sub');
    const speedFill = document.getElementById('speed-meter-fill');

    if (sizeEl) sizeEl.textContent = sizeStr;
    if (speedEl) speedEl.textContent = speedStr;
    if (moveEl) moveEl.textContent = moveStr;
    if (speedFill) {
      const num = parseFloat(speedVal) || 2.5;
      const pct = Math.min(100, Math.max(5, (num / 10) * 100));
      speedFill.style.width = `${pct}%`;
    }

    // 3. Geological Overview Description
    const descEl = document.getElementById('plate-desc-text') || document.getElementById('inspector-desc');
    const pInfoObj = window.TECTONIC_DATA && window.TECTONIC_DATA.platesInfo;
    const infoDesc = pInfoObj && (
      (pInfoObj[pName] && pInfoObj[pName].description) ||
      (pName.startsWith('South ') && pInfoObj[pName.replace(/^South\s+/, '')] && pInfoObj[pName.replace(/^South\s+/, '')].description) ||
      (pInfoObj[`South ${pName}`] && pInfoObj[`South ${pName}`].description)
    );
    const defaultDesc = `The ${pName} (${pCode}) covers a major geological region characterized by ${formattedCrust.toLowerCase()} lithosphere, actively interacting with adjacent tectonic boundaries at roughly ${speedStr}.`;
    const fullDesc = props.description || infoDesc || props.summary || props.geology || defaultDesc;
    if (descEl) {
      descEl.innerHTML = `<p>${fullDesc}</p>`;
    }

    // 4. Key Tectonic Facts List
    const factsList = document.getElementById('plate-facts-list');
    if (factsList) {
      factsList.innerHTML = `
        <li><strong>Crust Classification:</strong> ${formattedCrust} lithosphere drifting across the upper mantle asthenosphere</li>
        <li><strong>Relative Drift Velocity:</strong> ${speedStr} ${moveStr ? `(${moveStr})` : ''}</li>
        <li><strong>Estimated Surface Area:</strong> ${sizeStr} ${props.areaKm2 ? `(${props.areaKm2.toLocaleString()} km²)` : ''}</li>
        <li><strong>Geological Setting:</strong> Actively delineated by Peter Bird (2002) PB2002 global plate boundaries</li>
      `;
    }

    // 5. Associated Countries & Landmasses
    const countriesEl = document.getElementById('plate-countries-tags') || document.getElementById('inspector-countries');
    if (countriesEl) {
      countriesEl.innerHTML = '';
      const list = props.countries || [];
      if (list.length === 0) {
        countriesEl.innerHTML = '<span class="tag is-dark is-small">Primarily Oceanic Lithosphere</span>';
      } else {
        list.slice(0, 16).forEach(c => {
          const span = document.createElement('span');
          span.className = 'tag is-dark is-small mr-1 mb-1';
          span.textContent = c;
          countriesEl.appendChild(span);
        });
        if (list.length > 16) {
          const more = document.createElement('span');
          more.className = 'tag is-dark is-small is-light mr-1 mb-1';
          more.textContent = `+${list.length - 16} more`;
          countriesEl.appendChild(more);
        }
      }
    }
  }

  function renderNeighborsForPlate(plateCode) {
    const container = document.getElementById('inspector-neighbors');
    if (!container || !window.TECTONIC_DATA || !window.TECTONIC_DATA.boundaries) return;
    container.innerHTML = '';

    const neighbors = new Set();
    window.TECTONIC_DATA.boundaries.features.forEach(f => {
      const p = f.properties;
      if (p.PlateA === plateCode && p.PlateB) neighbors.add(p.PlateB);
      if (p.PlateB === plateCode && p.PlateA) neighbors.add(p.PlateA);
    });

    if (neighbors.size === 0) {
      container.innerHTML = '<span class="tag is-dark is-small">Isolated / Microplate</span>';
      return;
    }

    Array.from(neighbors).forEach(nCode => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'button is-small is-dark is-rounded mr-1 mb-1';
      btn.textContent = nCode;
      btn.title = `Switch inspection to plate ${nCode}`;
      btn.onclick = () => window.selectAndZoomPlate(nCode);
      container.appendChild(btn);
    });
  }

  function renderVelocityForPlate(plateCode) {
    const el = document.getElementById('inspector-velocity-detail');
    if (!el || !window.TECTONIC_DATA || !window.TECTONIC_DATA.velocities) return;

    const vel = window.TECTONIC_DATA.velocities.features.find(f => f.properties.code === plateCode);
    if (!vel) {
      el.innerHTML = '<span style="color:#94a3b8;">Velocity model data unavailable.</span>';
      return;
    }

    const vp = vel.properties;
    el.innerHTML = `
      <div style="font-size:0.8rem; color:#cbd5e1; display:flex; justify-content:space-between; margin-top:4px;">
        <span>Speed: <strong style="color:#38bdf8;">${vp.speed_mmyr} mm/yr</strong> (${vp.speed_cmyr} cm/yr)</span>
        <span>Direction: <strong style="color:#f59e0b;">${vp.direction} (${vp.azimuth}°)</strong></span>
      </div>
    `;
  }

  function renderEarthquakesForPlate(plateProps) {
    const listEl = document.getElementById('plate-earthquakes-list') || document.getElementById('inspector-quakes-summary');
    if (!listEl) return;
    if (!state.earthquakesData || !Array.isArray(state.earthquakesData.features)) {
      listEl.innerHTML = '<span style="color:#94a3b8; font-size:0.8rem;">Loading recent seismic events...</span>';
      return;
    }

    const plateCode = plateProps.Code;
    const bboxes = getPlateBBoxes();
    const plateItem = bboxes.find(b => b.feature.properties.Code === plateCode);
    const bbox = plateItem ? plateItem.bbox : null;
    const geom = plateItem ? plateItem.feature.geometry : null;

    const matching = state.earthquakesData.features.filter(f => {
      if (f.properties.plateCode) return f.properties.plateCode === plateCode;
      if (!bbox || !f.geometry || !Array.isArray(f.geometry.coordinates)) return false;
      const lng = f.geometry.coordinates[0];
      const lat = f.geometry.coordinates[1];
      const normLng = ((lng + 180) % 360 + 360) % 360 - 180;
      if (normLng < bbox[0] || normLng > bbox[2] || lat < bbox[1] || lat > bbox[3]) return false;
      let inside = false;
      if (geom.type === 'Polygon') {
        inside = pointInPolygon([normLng, lat], geom.coordinates[0]);
      } else if (geom.type === 'MultiPolygon') {
        for (let poly of geom.coordinates) {
          if (Array.isArray(poly) && pointInPolygon([normLng, lat], poly[0])) { inside = true; break; }
        }
      }
      if (inside) f.properties.plateCode = plateCode;
      return inside;
    });

    const now = Date.now();
    const quakes24h = matching.filter(f => (f.properties.time || 0) >= now - 24 * 60 * 60 * 1000);

    const activeRange = state.quakeTimeWindow || '24h';
    let rangeCutoff = now - 24 * 60 * 60 * 1000;
    let rangeLabel = 'Past 24 Hours';
    if (activeRange === '7d') {
      rangeCutoff = now - 7 * 24 * 60 * 60 * 1000;
      rangeLabel = 'Past 7 Days';
    } else if (activeRange === '30d') {
      rangeCutoff = now - 30 * 24 * 60 * 60 * 1000;
      rangeLabel = 'Past 30 Days';
    } else if (activeRange === '60d') {
      rangeCutoff = now - 60 * 24 * 60 * 60 * 1000;
      rangeLabel = 'Past 60 Days';
    } else if (activeRange === '90d') {
      rangeCutoff = now - 90 * 24 * 60 * 60 * 1000;
      rangeLabel = 'Past 90 Days';
    } else if (activeRange === '1y') {
      rangeCutoff = now - 365 * 24 * 60 * 60 * 1000;
      rangeLabel = 'Past 1 Year';
    }

    const quakesInWindow = matching.filter(f => (f.properties.time || 0) >= rangeCutoff);

    let maxMag = 0;
    quakesInWindow.forEach(f => {
      if ((f.properties.mag || 0) > maxMag) maxMag = f.properties.mag;
    });

    const is24hActive = activeRange === '24h';
    listEl.innerHTML = `
      <div style="font-size:0.82rem; color:#cbd5e1; background:rgba(15,23,42,0.6); padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>${rangeLabel}:</span>
          <strong style="color:#f87171;">${quakesInWindow.length.toLocaleString()} earthquakes</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:4px;">
          <span>${is24hActive ? 'Past 30d Total' : 'Last 24h'}: <strong style="color:#38bdf8;">${is24hActive ? matching.length.toLocaleString() : quakes24h.length}</strong></span>
          <span>Max Magnitude: <strong style="color:#f59e0b;">M${maxMag ? maxMag.toFixed(1) : 'None'}</strong></span>
        </div>
      </div>
    `;
  }

  window.selectAndZoomPlate = function (plateCode) {
    if (typeof window.closeAllModals === 'function') {
      window.closeAllModals();
    }
    if (!window.TECTONIC_DATA || !window.TECTONIC_DATA.plates) return;
    const feat = window.TECTONIC_DATA.plates.features.find(
      f => (f.properties.Code || '').toUpperCase() === plateCode.toUpperCase()
    );
    if (feat) {
      selectPlate(feat);
      window.flyToSelectedPlate();
    }
  };

  window.flyToSelectedPlate = function () {
    if (!state.map || !state.selectedPlate) return;
    const props = state.selectedPlate.properties || {};
    const coords = state.selectedPlate.geometry.coordinates;
    const isMobile = window.innerWidth <= 768;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    function scan(arr) {
      for (let i = 0; i < arr.length; i++) {
        const c = arr[i];
        if (Array.isArray(c[0])) {
          scan(c);
        } else {
          if (c[0] < minX) minX = c[0];
          if (c[0] > maxX) maxX = c[0];
          if (c[1] < minY) minY = c[1];
          if (c[1] > maxY) maxY = c[1];
        }
      }
    }
    scan(coords);

    // Antimeridian-crossing or globe-spanning plates (Pacific, North American, Antarctic, etc.)
    const spansAntimeridian = (maxX - minX > 200) || (minX <= -170 && maxX >= 170);
    if (spansAntimeridian && props.centroid && typeof props.centroid.longitude === 'number') {
      const zoomLevel = props.Code === 'PA' ? 2.1 : (props.Code === 'AN' ? 1.6 : (props.Code === 'NA' ? 2.6 : 3.0));
      const targetCenter = [props.centroid.longitude, props.centroid.latitude];
      state.map.flyTo({
        center: targetCenter,
        zoom: zoomLevel,
        speed: 1.2,
        offset: isMobile ? [0, 40] : [-120, 0]
      });
      return;
    }

    if (minX !== Infinity) {
      state.map.fitBounds([[minX, minY], [maxX, maxY]], {
        padding: isMobile
          ? { top: 60, bottom: 220, left: 24, right: 24 }
          : { top: 80, bottom: 80, left: 80, right: 380 },
        maxZoom: 5.5,
        duration: 1200
      });
    }
  };

  function showLocationPin(lng, lat) {
    if (!state.map) return;
    state.map.flyTo({ center: [lng, lat], zoom: 4.5, speed: 1.2 });
    const pl = findPlateForCoordinate(lng, lat);
    const pName = pl ? pl.properties.PlateName : 'Oceanic/Boundary';

    showSmartPopup([lng, lat], `
      <div class="popup-title">📍 Your Location</div>
      <div class="popup-meta">Coords: <strong>${lat.toFixed(4)}°, ${lng.toFixed(4)}°</strong></div>
      <div style="font-size:0.85rem; color:#cbd5e1; margin-top:4px;">
        Tectonic Plate: <strong style="color:#38bdf8;">${pName}</strong>
      </div>
    `, { className: 'custom-popup location-popup', estimatedHeight: 140 });

    if (pl) selectPlate(pl);
  }

  // --- Find My Plate Feature ---
  window.findMyPlate = function () {
    const btn = document.getElementById('btn-find-my-plate');
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    if (btn) btn.classList.add('is-loading');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (btn) btn.classList.remove('is-loading');
        showLocationPin(pos.coords.longitude, pos.coords.latitude);
      },
      (err) => {
        if (btn) btn.classList.remove('is-loading');
        alert(`Could not detect location: ${err.message}`);
      },
      { timeout: 10000 }
    );
  };

  // --- Lazy-Loaded Boundary Cross-Section Modal ---
  window.showBoundaryCrossSection = function (boundaryType, boundaryName) {
    function decodeName(val) {
      try {
        return decodeURIComponent(val || '');
      } catch (e) {
        return typeof unescape === 'function' ? unescape(val || '') : val;
      }
    }
    const cleanName = decodeName(boundaryName);
    if (typeof window.renderCrossSectionModal === 'function') {
      window.renderCrossSectionModal(boundaryType, cleanName);
    } else {
      loadModule('cross-section')
        .then(() => {
          if (typeof window.renderCrossSectionModal === 'function') {
            window.renderCrossSectionModal(boundaryType, cleanName);
          }
        })
        .catch(err => {
          console.error('[CrossSection] Failed to load module:', err);
        });
    }
  };

  // --- Accessible Colorblind-Safe Boundary Palette ---
  window.toggleColorblindMode = function (enabled) {
    state.colorblindMode = !!enabled;
    if (!state.map) return;
    const normalColors = [
      'match', ['get', 'boundary_type'],
      'convergent', '#ff3860',
      'divergent', '#ffb703',
      'transform', '#00d1b2',
      '#9d4edd'
    ];
    const cbColors = [
      'match', ['get', 'boundary_type'],
      'convergent', '#e69f00',
      'divergent', '#56b4e9',
      'transform', '#009e73',
      '#cc79a7'
    ];
    const palette = state.colorblindMode ? cbColors : normalColors;
    if (state.map.getLayer('boundaries-line')) {
      state.map.setPaintProperty('boundaries-line', 'line-color', palette);
    }
  };

  // --- 3D Perspective Pitch Toggle & Gestures Synchronization ---
  function update3DButtonState() {
    if (!state.map) return;
    const is3D = state.map.getPitch() > 20;
    const labelEl = document.getElementById('label-3d-pitch');
    const chipBtn = document.getElementById('chip-3d-pitch');
    if (labelEl) labelEl.textContent = is3D ? '2D View' : '3D View';
    if (chipBtn) {
      chipBtn.classList.toggle('is-active', is3D);
      chipBtn.setAttribute('aria-pressed', is3D ? 'true' : 'false');
      chipBtn.title = is3D ? 'Switch to flat 2D map view' : 'Switch to 3D perspective pitch view';
    }
  }

  window.toggle3DPerspective = function () {
    if (!state.map) return;
    const currentPitch = state.map.getPitch();
    const newPitch = currentPitch > 20 ? 0 : 50;
    state.map.easeTo({ pitch: newPitch, duration: 800 });
  };

  // --- Reset to Defaults ---
  window.resetToHomeDefaults = function (e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (state.map) {
      state.map.flyTo({
        center: config.initialCenter,
        zoom: config.initialZoom,
        pitch: config.initialPitch,
        bearing: 0,
        speed: 1.4
      });
      window.closeInspector();
      window.switchMapMode('tectonic-plates', false);
      try {
        window.location.hash = '';
      } catch (e2) {}
    }
  };

  // --- Setup Search Triggers ---
  function setupSearchTriggers() {
    const input = document.getElementById('search-input');
    if (!input) return;
    let searchLoaded = false;
    const triggerSearchLoad = () => {
      if (searchLoaded) return;
      searchLoaded = true;
      loadModule('search');
    };
    input.addEventListener('focus', triggerSearchLoad, { once: true });
    input.addEventListener('mouseenter', triggerSearchLoad, { once: true });
    input.addEventListener('input', triggerSearchLoad, { once: true });
    if ('requestIdleCallback' in window) {
      requestIdleCallback(triggerSearchLoad, { timeout: 3500 });
    } else {
      setTimeout(triggerSearchLoad, 2000);
    }
  }

  // --- Layer Toggles ---
  window.toggleLayer = function (layerKey, forceState) {
    if (typeof forceState === 'boolean') {
      state.layersVisibility[layerKey] = forceState;
    } else {
      state.layersVisibility[layerKey] = !state.layersVisibility[layerKey];
    }
    const isVisible = state.layersVisibility[layerKey];
    const visibilityVal = isVisible ? 'visible' : 'none';

    const checkbox = document.getElementById(`toggle-${layerKey}-layer`);
    if (checkbox) checkbox.checked = isVisible;

    if (isVisible && ['volcanoes', 'hurricanes', 'tornadoes', 'aurora', 'trenches', 'craters'].includes(layerKey)) {
      loadDataset(layerKey);
    }

    if (!state.map) return;

    if (layerKey === 'plates') {
      if (state.map.getLayer('plates-fill')) state.map.setLayoutProperty('plates-fill', 'visibility', visibilityVal);
      if (state.map.getLayer('plates-outline')) state.map.setLayoutProperty('plates-outline', 'visibility', visibilityVal);
    } else if (layerKey === 'boundaries') {
      if (state.map.getLayer('boundaries-line')) state.map.setLayoutProperty('boundaries-line', 'visibility', visibilityVal);
      if (state.map.getLayer('boundaries-line-glow')) state.map.setLayoutProperty('boundaries-line-glow', 'visibility', visibilityVal);
      if (state.map.getLayer('boundaries-symbols')) {
        const showSymbols = (visibilityVal === 'visible' && state.layersVisibility.boundarySymbols !== false);
        state.map.setLayoutProperty('boundaries-symbols', 'visibility', showSymbols ? 'visible' : 'none');
      }
    } else if (layerKey === 'boundarySymbols') {
      if (state.map.getLayer('boundaries-symbols')) {
        const showSymbols = (visibilityVal === 'visible' && state.layersVisibility.boundaries);
        state.map.setLayoutProperty('boundaries-symbols', 'visibility', showSymbols ? 'visible' : 'none');
      }
    } else if (layerKey === 'velocities') {
      if (state.map.getLayer('velocities-arrows')) state.map.setLayoutProperty('velocities-arrows', 'visibility', visibilityVal);
      if (state.map.getLayer('velocities-arrowheads')) state.map.setLayoutProperty('velocities-arrowheads', 'visibility', visibilityVal);
    } else if (layerKey === 'earthquakes') {
      ['earthquakes-points', 'earthquakes-heat', 'earthquakes-24h-ring', 'earthquakes-peak-halo', 'earthquakes-peak-ring', 'earthquakes-peak-label'].forEach(id => {
        if (state.map.getLayer(id)) state.map.setLayoutProperty(id, 'visibility', visibilityVal);
      });
    } else if (layerKey === 'volcanoes') {
      ['volcanoes-active', 'volcanoes-recent-dormant', 'volcanoes-ancient-dormant', 'volcanoes-summit-point'].forEach(id => {
        if (state.map.getLayer(id)) state.map.setLayoutProperty(id, 'visibility', visibilityVal);
      });
    } else if (layerKey === 'hurricanes') {
      ['hurricanes-glow', 'hurricanes-line', 'hurricanes-radar-pulse', 'hurricanes-symbol', 'hurricanes-points'].forEach(id => {
        if (state.map.getLayer(id)) state.map.setLayoutProperty(id, 'visibility', visibilityVal);
      });
    } else if (layerKey === 'tornadoes') {
      ['tornadoes-polygon-fill', 'tornadoes-polygon-line', 'tornadoes-track-line', 'tornadoes-points'].forEach(id => {
        if (state.map.getLayer(id)) state.map.setLayoutProperty(id, 'visibility', visibilityVal);
      });
    } else if (layerKey === 'aurora') {
      ['aurora-glow', 'aurora-line', 'aurora-label', 'aurora-stations'].forEach(id => {
        if (state.map.getLayer(id)) state.map.setLayoutProperty(id, 'visibility', visibilityVal);
      });
    } else if (layerKey === 'trenches') {
      if (state.map.getLayer('trenches-points')) state.map.setLayoutProperty('trenches-points', 'visibility', visibilityVal);
    } else if (layerKey === 'craters') {
      if (state.map.getLayer('craters-points')) state.map.setLayoutProperty('craters-points', 'visibility', visibilityVal);
    }

    invalidateInteractiveLayers();
    saveUserSettings();
  };

  window.toggleHoverInfo = function (forceVal) {
    state.hoverInfoEnabled = typeof forceVal === 'boolean' ? forceVal : !state.hoverInfoEnabled;
    const toggle = document.getElementById('toggle-hover-info');
    if (toggle) toggle.checked = state.hoverInfoEnabled;
    saveUserSettings();
  };

  // --- Switch Map Mode (Maps Hub) ---
  window.switchMapMode = function (mode, fromSearch = false) {
    if (!MODES[mode]) mode = 'tectonic-plates';
    const prevMode = state.currentMode;
    state.currentMode = mode;

    // Automatically close any open feature popup and hover tooltip when switching categories
    closeSmartPopup();
    if (typeof window.closeInspector === 'function') {
      window.closeInspector();
    }
    const hoverTooltip = document.getElementById('plate-hover-tooltip') || document.getElementById('map-hover-tooltip');
    if (hoverTooltip) hoverTooltip.style.display = 'none';
    if (typeof window.hideGlobalLegendTooltip === 'function') {
      window.hideGlobalLegendTooltip();
    }

    // Dynamically update trust & attribution banner per active mode
    const disclaimerEl = document.getElementById('map-trust-banner-text');
    if (disclaimerEl) {
      if (mode === 'earthquakes') {
        disclaimerEl.innerHTML = 'Educational map, not an early-warning system. Data: <a href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php" target="_blank" rel="noopener">USGS Earthquake Hazards Program</a>';
      } else if (mode === 'volcanoes') {
        disclaimerEl.innerHTML = 'Educational map. Data: <a href="https://volcano.si.edu/" target="_blank" rel="noopener">Smithsonian Institution Global Volcanism Program</a>';
      } else if (mode === 'hurricanes') {
        disclaimerEl.innerHTML = 'Historical tracks &amp; storms. Data: <a href="https://www.nhc.noaa.gov/data/" target="_blank" rel="noopener">NOAA NHC &amp; IBTrACS</a>';
      } else if (mode === 'tornadoes') {
        disclaimerEl.innerHTML = 'Severe weather climatology. Data: <a href="https://www.spc.noaa.gov/" target="_blank" rel="noopener">NOAA Storm Prediction Center</a>';
      } else if (mode === 'aurora') {
        disclaimerEl.innerHTML = 'Geomagnetic visualization. Model: <a href="https://www.swpc.noaa.gov/" target="_blank" rel="noopener">NOAA Space Weather Prediction Center</a>';
      } else if (mode === 'trenches') {
        disclaimerEl.innerHTML = 'Bathymetric &amp; tectonic trenches. Data: <a href="https://www.gebco.net/" target="_blank" rel="noopener">GEBCO &amp; PB2002</a>';
      } else if (mode === 'craters') {
        disclaimerEl.innerHTML = 'Impact structure catalog. Data: <a href="https://www.passc.net/EarthImpactDatabase/" target="_blank" rel="noopener">Earth Impact Database (PASSC)</a>';
      } else {
        disclaimerEl.innerHTML = 'Educational visualization. Boundary model: <a href="http://peterbird.name/publications/2003_PB2002/2003_PB2002.htm" target="_blank" rel="noopener">Peter Bird (PB2002)</a>';
      }
    }

    if (prevMode === 'earthquakes' && mode !== 'earthquakes') {
      if (window.TPM_Earthquakes && typeof window.TPM_Earthquakes.deactivate === 'function') {
        window.TPM_Earthquakes.deactivate();
      }
    }

    if (window.location.hash || mode !== 'tectonic-plates') {
      document.title = MODES[mode].title;
      try {
        const targetHash = '#' + MODES[mode].hash;
        if (window.location.hash !== targetHash) {
          window.history.replaceState(null, '', targetHash);
        }
      } catch (e) {}
    }

    document.querySelectorAll('.map-mode-card').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.mode === mode);
    });

    if (mode === 'tectonic-plates') {
      window.toggleLayer('plates', true);
      window.toggleLayer('boundaries', true);
      window.toggleLayer('velocities', true);
      window.toggleLayer('volcanoes', false);
      window.toggleLayer('earthquakes', false);
      window.toggleLayer('hurricanes', false);
      window.toggleLayer('tornadoes', false);
      window.toggleLayer('aurora', false);
      window.toggleLayer('trenches', false);
      window.toggleLayer('craters', false);
      renderDefaultPlateLegend();
      hideModeFilterUI();
    } else if (mode === 'earthquakes') {
      window.toggleLayer('plates', true);
      window.toggleLayer('boundaries', true);
      window.toggleLayer('velocities', false);
      window.toggleLayer('volcanoes', false);
      window.toggleLayer('earthquakes', true);
      window.toggleLayer('hurricanes', false);
      window.toggleLayer('tornadoes', false);
      window.toggleLayer('aurora', false);
      window.toggleLayer('trenches', false);
      window.toggleLayer('craters', false);

      state.quakeTimeWindow = '24h';
      loadModule('earthquakes').then(eqMod => {
        eqMod.activate(true);
        renderEarthquakeLegend();
        renderEarthquakeFilterUI();
        if (typeof eqMod.centerOnPeakQuake === 'function') {
          eqMod.centerOnPeakQuake(1.25);
        }
      });
    } else {
      window.toggleLayer('plates', true);
      window.toggleLayer('boundaries', mode === 'volcanoes' || mode === 'trenches');
      window.toggleLayer('velocities', false);
      window.toggleLayer('volcanoes', mode === 'volcanoes');
      window.toggleLayer('earthquakes', false);
      window.toggleLayer('hurricanes', mode === 'hurricanes');
      window.toggleLayer('tornadoes', mode === 'tornadoes');
      window.toggleLayer('aurora', mode === 'aurora');
      window.toggleLayer('trenches', mode === 'trenches');
      window.toggleLayer('craters', mode === 'craters');

      loadModule('phenomena').then(pMod => {
        pMod.activate(mode);
      });
    }

    if (fromSearch) {
      const hub = document.getElementById('maps-hub-bar');
      if (hub && !hub.classList.contains('is-minimized')) {
        hub.classList.add('is-minimized');
      }
    }
  };

  // Helper stubs for Earthquake legends and filters until module loads
  function renderEarthquakeLegend() {
    if (window.TPM_Earthquakes && typeof window.TPM_Earthquakes.renderLegend === 'function') {
      window.TPM_Earthquakes.renderLegend();
      return;
    }
    const el = document.getElementById('dynamic-mode-legend');
    if (!el) return;
    const curMag = state.minMagFilter || 2.5;
    const win = state.quakeTimeWindow || '24h';
    el.innerHTML = `
      <div class="quake-dual-legend">
        <div class="legend-scale-row quake-time-row" role="group" aria-label="Earthquake Time Range Filters">
          <button type="button" class="legend-filter-btn ${win === '24h' ? 'is-active' : ''}" data-window="24h" onclick="window.setQuakeTimeWindow('24h')">
            <span class="quake-live-bolt" style="color:#ef4444;">⚡</span>
            <span class="legend-filter-label">Today</span>
            <span class="legend-alert-badge alert-red">...</span>
          </button>
          <button type="button" class="legend-filter-btn ${win === '7d' ? 'is-active' : ''}" data-window="7d" onclick="window.setQuakeTimeWindow('7d')">
            <span class="legend-filter-label">7 Days</span>
            <span class="legend-alert-badge alert-amber">...</span>
          </button>
          <button type="button" class="legend-filter-btn ${win === '30d' ? 'is-active' : ''}" data-window="30d" onclick="window.setQuakeTimeWindow('30d')">
            <span class="legend-filter-label">30 Days</span>
            <span class="legend-alert-badge alert-catalog">...</span>
          </button>
          <button type="button" class="legend-filter-btn ${win === '60d' ? 'is-active' : ''}" data-window="60d" onclick="window.setQuakeTimeWindow('60d')">
            <span class="legend-filter-label">60 Days</span>
            <span class="legend-alert-badge alert-catalog">...</span>
          </button>
          <button type="button" class="legend-filter-btn ${win === '90d' ? 'is-active' : ''}" data-window="90d" onclick="window.setQuakeTimeWindow('90d')">
            <span class="legend-filter-label">90 Days</span>
            <span class="legend-alert-badge alert-catalog">...</span>
          </button>
        </div>
        <div id="legend-depth-sec" class="quake-depth-row" style="cursor:help; margin-top:5px;">
          <div style="display:flex; justify-content:space-between; font-size:0.67rem; color:#94a3b8; margin-bottom:2px; font-family:var(--font-mono);">
            <span>0 km (Shallow)</span><span>35</span><span>70</span><span>150</span><span>300</span><span>700 km (Deep Mantle)</span>
          </div>
          <div class="legend-depth-bar"></div>
        </div>
      </div>
    `;
  }

  function renderEarthquakeFilterUI() {
    const filterBar = document.getElementById('mode-filter-bar');
    if (!filterBar) return;
    filterBar.classList.remove('is-hidden');
    filterBar.style.display = 'flex';
    const win = state.quakeTimeWindow || '24h';
    filterBar.innerHTML = `
      <div class="quake-controls-wrap" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <div class="quake-time-buttons" role="group" aria-label="Earthquake time range" style="display:flex; gap:3px;">
          <button type="button" class="quake-time-btn ${win === '24h' ? 'is-active' : ''}" onclick="window.setQuakeTimeWindow('24h')" aria-label="Today / past 24 hours">Today</button>
          <button type="button" class="quake-time-btn ${win === '7d' ? 'is-active' : ''}" onclick="window.setQuakeTimeWindow('7d')" aria-label="Past 7 days">7d</button>
          <button type="button" class="quake-time-btn ${win === '30d' ? 'is-active' : ''}" onclick="window.setQuakeTimeWindow('30d')" aria-label="Past 30 days">30d</button>
          <button type="button" class="quake-time-btn ${win === '60d' ? 'is-active' : ''}" onclick="window.setQuakeTimeWindow('60d')" aria-label="Past 60 days">60d</button>
          <button type="button" class="quake-time-btn ${win === '90d' ? 'is-active' : ''}" onclick="window.setQuakeTimeWindow('90d')" aria-label="Past 90 days">90d</button>
        </div>
        <div class="quake-mag-slider-wrap" style="display:flex; align-items:center; gap:5px;">
          <label for="quake-mag-slider" style="font-size:0.75rem; color:#cbd5e1; font-weight:600; white-space:nowrap;">M&ge;<span id="mag-slider-val" style="color:#fff; font-weight:700;">${(state.minMagFilter || 2.5).toFixed(1)}</span></label>
          <input type="range" id="quake-mag-slider" min="2.5" max="8.0" step="0.5" value="${state.minMagFilter || 2.5}" oninput="window.onQuakeMagChange(this.value)" aria-label="Minimum earthquake magnitude">
        </div>
        <span id="mode-filter-badge" class="mode-filter-badge" title="Matching active filters">0</span>
        <button type="button" id="btn-top-quakes" class="button is-small is-dark is-rounded" onclick="window.toggleTopQuakesDrawer()" style="font-size:0.74rem; font-weight:700; border:1px solid rgba(255,255,255,0.2); padding:0 8px; height:28px;" aria-label="View top 10 largest quakes">
          <i class="fa-solid fa-list-ol mr-1" aria-hidden="true"></i> Top 10
        </button>
      </div>
    `;
  }

  window.toggleBoundaryTypeFilter = function (type) {
    if (!state.activeBoundaryTypes) state.activeBoundaryTypes = ['convergent', 'divergent', 'transform'];
    const allOn = state.activeBoundaryTypes.length === 3;
    if (allOn) {
      state.activeBoundaryTypes = [type];
    } else {
      const idx = state.activeBoundaryTypes.indexOf(type);
      if (idx > -1) {
        state.activeBoundaryTypes.splice(idx, 1);
        if (state.activeBoundaryTypes.length === 0) {
          state.activeBoundaryTypes = ['convergent', 'divergent', 'transform'];
        }
      } else {
        state.activeBoundaryTypes.push(type);
      }
    }
    updateBoundaryFilterMap();
  };

  window.resetBoundaryTypeFilters = function () {
    state.activeBoundaryTypes = ['convergent', 'divergent', 'transform'];
    updateBoundaryFilterMap();
  };

  function updateBoundaryFilterMap() {
    if (!state.map) return;
    const types = state.activeBoundaryTypes || ['convergent', 'divergent', 'transform'];
    if (state.map.getLayer('boundaries-line')) {
      state.map.setFilter('boundaries-line', ['in', ['get', 'boundary_type'], ['literal', types]]);
    }
    if (state.map.getLayer('boundaries-line-glow')) {
      state.map.setFilter('boundaries-line-glow', ['in', ['get', 'boundary_type'], ['literal', types]]);
    }
    if (state.map.getLayer('boundaries-symbols')) {
      state.map.setFilter('boundaries-symbols', ['in', ['get', 'boundary_type'], ['literal', types]]);
    }

    const allThree = types.length === 3;
    ['convergent', 'divergent', 'transform'].forEach(t => {
      const on = types.includes(t);
      const btn = document.getElementById(`btn-boundary-${t}`);
      if (btn) {
        btn.classList.toggle('is-active', on);
        btn.classList.toggle('is-muted', !on && !allThree);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
      const topChip = document.getElementById(`btn-filter-${t}`);
      if (topChip) {
        topChip.classList.toggle('is-active', on);
        topChip.style.opacity = on ? '1' : '0.4';
      }
    });

    const btnAll = document.getElementById('btn-boundary-all');
    if (btnAll) {
      btnAll.classList.toggle('is-active', allThree);
    }

    state.boundaryFilters = {
      convergent: types.includes('convergent'),
      divergent: types.includes('divergent'),
      transform: types.includes('transform')
    };
    saveUserSettings();
  }

  function renderDefaultPlateLegend() {
    const el = document.getElementById('dynamic-mode-legend');
    if (!el) return;
    const active = state.activeBoundaryTypes || ['convergent', 'divergent', 'transform'];
    const isConv = active.includes('convergent');
    const isDiv = active.includes('divergent');
    const isTrans = active.includes('transform');
    const isMuted = active.length < 3;

    el.innerHTML = `
      <div class="legend-scale-row" role="group" aria-label="Tectonic Boundary Type Filters">
        <button type="button" 
                id="btn-boundary-convergent" 
                class="legend-filter-btn ${isConv ? 'is-active' : ''} ${(!isConv && isMuted) ? 'is-muted' : ''}" 
                data-type="convergent" 
                onclick="window.toggleBoundaryTypeFilter('convergent')" 
                onmouseenter="window.showGlobalLegendTooltip(this, 'boundary-convergent', event)" 
                onmouseleave="window.hideGlobalLegendTooltip()" 
                onfocus="window.showGlobalLegendTooltip(this, 'boundary-convergent', event)" 
                onblur="window.hideGlobalLegendTooltip()" 
                aria-pressed="${isConv}" 
                title="Convergent boundaries: Subduction & collision zones (99)">
          <span class="legend-line convergent" style="width:14px; height:3px; background:#ff3860; display:inline-block; border-radius:2px;"></span>
          <span class="legend-symbol-glyph" style="color:#ff3860; font-size:10px; margin-right:3px;">▲</span>
          <span class="legend-filter-label">Convergent</span>
          <span class="legend-alert-badge alert-red">99</span>
        </button>
        <button type="button" 
                id="btn-boundary-divergent" 
                class="legend-filter-btn ${isDiv ? 'is-active' : ''} ${(!isDiv && isMuted) ? 'is-muted' : ''}" 
                data-type="divergent" 
                onclick="window.toggleBoundaryTypeFilter('divergent')" 
                onmouseenter="window.showGlobalLegendTooltip(this, 'boundary-divergent', event)" 
                onmouseleave="window.hideGlobalLegendTooltip()" 
                onfocus="window.showGlobalLegendTooltip(this, 'boundary-divergent', event)" 
                onblur="window.hideGlobalLegendTooltip()" 
                aria-pressed="${isDiv}" 
                title="Divergent boundaries: Seafloor spreading ridges & rifts (89)">
          <span class="legend-line divergent" style="width:14px; height:3px; background:#ffb703; display:inline-block; border-radius:2px;"></span>
          <span class="legend-symbol-glyph" style="color:#ffb703; font-size:10px; margin-right:3px;">←|→</span>
          <span class="legend-filter-label">Divergent</span>
          <span class="legend-alert-badge alert-amber">89</span>
        </button>
        <button type="button" 
                id="btn-boundary-transform" 
                class="legend-filter-btn ${isTrans ? 'is-active' : ''} ${(!isTrans && isMuted) ? 'is-muted' : ''}" 
                data-type="transform" 
                onclick="window.toggleBoundaryTypeFilter('transform')" 
                onmouseenter="window.showGlobalLegendTooltip(this, 'boundary-transform', event)" 
                onmouseleave="window.hideGlobalLegendTooltip()" 
                onfocus="window.showGlobalLegendTooltip(this, 'boundary-transform', event)" 
                onblur="window.hideGlobalLegendTooltip()" 
                aria-pressed="${isTrans}" 
                title="Transform boundaries: Strike-slip fault lines (53)">
          <span class="legend-line transform" style="width:14px; height:3px; background:#00d1b2; display:inline-block; border-radius:2px;"></span>
          <span class="legend-symbol-glyph" style="color:#00d1b2; font-size:10px; margin-right:3px;">⇋</span>
          <span class="legend-filter-label">Transform</span>
          <span class="legend-alert-badge alert-catalog">53</span>
        </button>
        <button type="button" 
                id="btn-boundary-all" 
                class="legend-filter-btn legend-source-btn is-active" 
                data-type="all" 
                onclick="window.resetBoundaryTypeFilters()" 
                onmouseenter="window.showGlobalLegendTooltip(this, 'boundary-all', event)" 
                onmouseleave="window.hideGlobalLegendTooltip()" 
                onfocus="window.showGlobalLegendTooltip(this, 'boundary-all', event)" 
                onblur="window.hideGlobalLegendTooltip()" 
                aria-label="PB2002 Boundary Catalog - Click to show all" 
                title="PB2002 Fault Lines Catalog (241 segments)">
          <span class="legend-filter-label" style="color:#94a3b8; font-weight:600;">PB2002</span>
          <span class="legend-alert-badge alert-catalog">241</span>
        </button>
      </div>
    `;
  }

  function hideModeFilterUI() {
    const filterBar = document.getElementById('mode-filter-bar');
    if (filterBar) {
      filterBar.classList.add('is-hidden');
      filterBar.style.display = 'none';
    }
  }

  window.toggleMapsDrawer = function () {
    const hub = document.getElementById('maps-hub-bar');
    if (!hub) return;
    if (hub.classList.contains('is-hidden')) {
      hub.classList.remove('is-hidden');
    }
    hub.classList.toggle('is-minimized');
    saveUserSettings();
  };

  // Re-sync all overlay layers
  function updateLayersVisibility() {
    if (!state.map) return;
    Object.keys(state.layersVisibility).forEach(key => {
      window.toggleLayer(key, state.layersVisibility[key]);
    });
  }

  function ensureTectonicLayers() {
    if (!state.map) return;
    try {
      addTectonicSourcesAndLayers();
      updateLayersVisibility();
    } catch (e) {
      console.warn('ensureTectonicLayers error:', e);
    }
  }

  // --- Map Style Switcher ---
  window.setMapStyle = function (styleKey) {
    if (!config.styles[styleKey] || styleKey === state.currentStyle) return;
    state.currentStyle = styleKey;

    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.style === styleKey);
    });

    if (styleKey === 'offline' && (!window.TECTONIC_DATA || !window.TECTONIC_DATA.land)) {
      loadDataset('land');
    }

    const styleSpec = config.styles[styleKey].style;
    const styleParam = typeof styleSpec === 'object'
      ? JSON.parse(JSON.stringify(styleSpec))
      : styleSpec;

    if (styleKey === 'offline' && window.TECTONIC_DATA && window.TECTONIC_DATA.land) {
      if (styleParam.sources && styleParam.sources['offline-land']) {
        styleParam.sources['offline-land'].data = window.TECTONIC_DATA.land;
      }
    }

    state.map.setStyle(styleParam);
    invalidateInteractiveLayers();
    saveUserSettings();
  };

  // --- UI Helpers ---
  window.closeAllModals = function () {
    closeSmartPopup();
    document.querySelectorAll('.modal.is-active').forEach(m => m.classList.remove('is-active'));
    document.documentElement.classList.remove('is-clipped');
    if (typeof window.closeInspector === 'function') {
      window.closeInspector();
    }
    if (typeof window.closeComparisonModal === 'function') {
      window.closeComparisonModal();
    }
  };

  window.closeActivePopup = closeSmartPopup;

  window.toggleBoundaryType = function (type) {
    if (!state.activeBoundaryTypes) state.activeBoundaryTypes = ['convergent', 'divergent', 'transform'];
    const idx = state.activeBoundaryTypes.indexOf(type);
    if (idx > -1) {
      state.activeBoundaryTypes.splice(idx, 1);
      if (state.activeBoundaryTypes.length === 0) {
        state.activeBoundaryTypes = ['convergent', 'divergent', 'transform'];
      }
    } else {
      state.activeBoundaryTypes.push(type);
    }
    updateBoundaryFilterMap();
  };

  // Navbar earthquake button click delegate
  window.refreshLiveEarthquakes = function (isUserTriggered = false) {
    loadModule('earthquakes').then(eqMod => {
      eqMod.refresh(isUserTriggered);
    });
  };
  window.setQuakeTimeWindow = function (winKey, centerOnPeak = true) {
    loadModule('earthquakes').then(eqMod => eqMod.setTimeWindow(winKey, centerOnPeak));
  };
  window.onQuakeMagChange = function (val) {
    loadModule('earthquakes').then(eqMod => eqMod.setMinMag(val));
  };
  window.toggleTopQuakesDrawer = function (forceState) {
    loadModule('earthquakes').then(eqMod => eqMod.toggleDrawer(forceState));
  };
  window.toggleQuakeMagThreshold = function (threshold) {
    loadModule('earthquakes').then(eqMod => eqMod.toggleMagThreshold(threshold));
  };
  window.resetQuakeFilters = function () {
    loadModule('earthquakes').then(eqMod => eqMod.resetFilters());
  };
  window.centerOnPeakQuake = function () {
    loadModule('earthquakes').then(eqMod => {
      if (typeof eqMod.centerOnPeakQuake === 'function') eqMod.centerOnPeakQuake(1.25);
    });
  };

  // Helper to format geodetic coords
  function formatGeodeticCoords(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return '';
    const latStr = Math.abs(lat).toFixed(4) + '° ' + (lat >= 0 ? 'N' : 'S');
    const lngStr = Math.abs(lng).toFixed(4) + '° ' + (lng >= 0 ? 'E' : 'W');
    return `${latStr}, ${lngStr}`;
  }

  function getGoogleMapsButton(lat, lng, label) {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return '';
    const q = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${q}`;
    const text = label || 'Google Maps';
    return `
      <a href="${url}" target="_blank" rel="noopener" class="popup-btn popup-btn-maps" title="Open exact coordinates in Google Maps (satellite & terrain)">
        <i class="fa-solid fa-map-location-dot" style="font-size:0.75rem;" aria-hidden="true"></i>
        <span>${text} ↗</span>
      </a>
    `;
  }

  // PWA Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.info('[PWA] New version installed and ready.');
                }
              };
            }
          };
        })
        .catch(err => {
          console.warn('[PWA] Service worker registration skipped:', err);
        });
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSmartPopup();
      window.closeInspector();
      window.closeAllModals();
      const searchDropdown = document.getElementById('search-dropdown');
      if (searchDropdown) searchDropdown.classList.remove('is-active');
      const topQuakes = document.getElementById('top-quakes-drawer');
      if (topQuakes) topQuakes.classList.add('is-hidden');
    }
  });

  // Automatically close popups and update mode on hashchange
  window.addEventListener('hashchange', () => {
    closeSmartPopup();
    const mode = getModeFromUrl();
    if (mode && mode !== state.currentMode) {
      window.switchMapMode(mode, false);
    }
  });

  // Direct delegation on category hub buttons to guarantee popup closure immediately upon click
  document.addEventListener('click', (e) => {
    if (e.target.closest && (e.target.closest('.map-mode-card') || e.target.closest('.tool-chip-btn'))) {
      closeSmartPopup();
    }
  }, true);

  // Export Core API to global namespace for modules
  window.TPM = {
    state,
    config,
    loadDataset,
    showSmartPopup,
    closePopup: closeSmartPopup,
    closeSmartPopup,
    formatGeodeticCoords,
    getGoogleMapsButton,
    formatTimeAgo,
    updateHoverTooltipPosition,
    findPlateForCoordinate,
    selectPlate,
    renderEarthquakesForPlate,
    loadModule,
    phenomena: null,
    earthquakes: null,
    search: null
  };

  // Boot Core Map
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMap);
  } else {
    initMap();
  }
})();
