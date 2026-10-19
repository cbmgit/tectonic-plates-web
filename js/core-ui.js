/**
 * Tectonic Plates Map - Core UI & Fast First Paint Controller
 * Lightweight, zero-dependency script for instant interactivity and SEO Core Web Vitals
 */

(function () {
  'use strict';

  // 1. Mobile State Initialization & Navbar Burger Toggle
  function initNavbarAndState() {
    const burger = document.getElementById('nav-burger');
    const menu = document.getElementById('nav-menu');

    // Restore Explorer Hub & Layers Panel state from localStorage
    try {
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      const savedExplorer = localStorage.getItem('tpm_explorer_minimized');
      const hub = document.getElementById('maps-hub-bar');
      if (savedExplorer !== null && hub) {
        hub.classList.toggle('is-minimized', JSON.parse(savedExplorer));
      } else if (isMobile && hub) {
        hub.classList.add('is-minimized');
      }

      const savedPanel = localStorage.getItem('tpm_layers_panel_collapsed');
      const layersPanel = document.getElementById('floating-layers-panel');
      if (savedPanel !== null && layersPanel) {
        layersPanel.classList.toggle('is-collapsed', JSON.parse(savedPanel));
      } else if (isMobile && layersPanel) {
        layersPanel.classList.add('is-collapsed');
      }
    } catch (e) {}

    if (burger && menu) {
      burger.addEventListener('click', (e) => {
        e.stopPropagation();
        burger.classList.toggle('is-active');
        menu.classList.toggle('is-active');
      });

      // Close mobile menu on clicking any navigation action (except search)
      menu.querySelectorAll('.navbar-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target && (e.target.id === 'search-input' || e.target.closest('#search-dropdown'))) return;
          burger.classList.remove('is-active');
          menu.classList.remove('is-active');
        });
      });

      // Click outside to close mobile dropdown menu
      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !burger.contains(e.target) && menu.classList.contains('is-active')) {
          burger.classList.remove('is-active');
          menu.classList.remove('is-active');
        }
      });
    }

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbarAndState);
  } else {
    initNavbarAndState();
  }

  // 2. Maps Hub Drawer Smart Toggle (Desktop vs Mobile Bottom Dock) with LocalStorage
  window.toggleMapsDrawer = function () {
    const hub = document.getElementById('maps-hub-bar');
    if (!hub) return;

    if (window.matchMedia('(max-width: 768px)').matches) {
      if (hub.classList.contains('is-hidden')) {
        hub.classList.remove('is-hidden');
      }
      hub.classList.toggle('is-minimized');
    } else {
      hub.classList.toggle('is-minimized');
    }

    try {
      localStorage.setItem('tpm_explorer_minimized', JSON.stringify(hub.classList.contains('is-minimized')));
    } catch (e) {}
  };

  // 2b. Layers Panel Collapse Toggle with LocalStorage
  window.toggleLayersPanel = function () {
    const panel = document.getElementById('floating-layers-panel');
    if (!panel) return;
    panel.classList.toggle('is-collapsed');
    try {
      localStorage.setItem('tpm_layers_panel_collapsed', JSON.stringify(panel.classList.contains('is-collapsed')));
    } catch (e) {}
  };

  // 3. Guide Modal Controls
  window.openGuideModal = function () {
    const modal = document.getElementById('guide-modal');
    if (modal) {
      if (modal.classList.contains('is-active')) {
        window.closeGuideModal();
        return;
      }
      window.closeComparisonModal();
      modal.classList.add('is-active');
      document.documentElement.classList.add('is-clipped');
    }
  };

  window.closeGuideModal = function () {
    const modal = document.getElementById('guide-modal');
    if (modal) {
      modal.classList.remove('is-active');
      document.documentElement.classList.remove('is-clipped');
    }
  };

  // 4. Comparison Modal Shell (Delegates to lazy-loaded table renderer)
  window.openComparisonModal = function () {
    const modal = document.getElementById('comparison-modal');
    const btnAllPlates = document.getElementById('btn-all-plates');
    const chipPlateCount = document.getElementById('chip-plate-count');
    if (modal) {
      if (modal.classList.contains('is-active')) {
        window.closeComparisonModal();
        return;
      }
      window.closeGuideModal();
      modal.classList.add('is-active');
      document.documentElement.classList.add('is-clipped');
      if (btnAllPlates) btnAllPlates.classList.add('is-active');
      if (chipPlateCount) chipPlateCount.classList.add('is-active');

      if (typeof window.loadAndRenderComparison === 'function') {
        window.loadAndRenderComparison();
      } else {
        // Dynamically inject js/comparison.min.js on-demand
        const s = document.createElement('script');
        s.src = 'js/comparison.min.js?v=41';
        s.onload = () => {
          if (typeof window.loadAndRenderComparison === 'function') {
            window.loadAndRenderComparison();
          }
        };
        document.body.appendChild(s);
      }
    }
  };

  window.closeComparisonModal = function () {
    const modal = document.getElementById('comparison-modal');
    const btnAllPlates = document.getElementById('btn-all-plates');
    const chipPlateCount = document.getElementById('chip-plate-count');
    if (modal) {
      modal.classList.remove('is-active');
      document.documentElement.classList.remove('is-clipped');
    }
    if (btnAllPlates) btnAllPlates.classList.remove('is-active');
    if (chipPlateCount) chipPlateCount.classList.remove('is-active');
  };

  window.closeAllModals = function () {
    window.closeComparisonModal();
    window.closeGuideModal();
    document.querySelectorAll('.modal.is-active').forEach(m => {
      m.classList.remove('is-active');
    });
    document.documentElement.classList.remove('is-clipped');
  };

  // 5. Keyboard Modal Dismissal (Escape Key)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeAllModals();
      if (typeof window.closeInspector === 'function') {
        window.closeInspector();
      }
    }
  });

  // 6. PWA Install Prompt Listener
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
    }
  });

  window.installPWA = function () {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] User installed the application');
        }
        deferredPrompt = null;
        const installBtn = document.getElementById('btn-pwa-install');
        if (installBtn) installBtn.style.display = 'none';
      });
    }
  };

  // 7. Online / Offline Status Indicators
  window.addEventListener('online', () => {
    console.log('[Network] Connected online');
    const badge = document.getElementById('quake-count-badge');
    if (badge) badge.classList.remove('is-warning');
    if (typeof window.refreshLiveEarthquakes === 'function') {
      window.refreshLiveEarthquakes(false);
    }
  });

  window.addEventListener('offline', () => {
    console.log('[Network] Running in offline standalone mode');
    const badge = document.getElementById('quake-count-badge');
    if (badge) {
      badge.innerHTML = '<span class="icon is-small"><i class="fa-solid fa-cloud" aria-hidden="true"></i></span><span>Offline</span>';
      badge.classList.add('is-warning');
    }
  });

  // 8. Initial Fast Stat Counters (Zero Cumulative Layout Shift)
  document.addEventListener('DOMContentLoaded', () => {
    const elPlates = document.getElementById('stat-plate-count');
    if (elPlates && !elPlates.textContent.trim()) {
      elPlates.textContent = '52';
    }
  });

  // 9. Map Poster Overlay Dismissal & MapLibre Activation
  window.triggerMapLibreInit = function () {
    const poster = document.getElementById('map-poster');
    if (poster) {
      poster.style.transition = 'opacity 0.3s ease, visibility 0.3s ease';
      poster.style.opacity = '0';
      poster.style.pointerEvents = 'none';
      setTimeout(() => {
        if (poster && poster.parentNode) {
          poster.parentNode.removeChild(poster);
        }
      }, 350);
    }
    const mapInstance = (window.TPM && window.TPM.state && window.TPM.state.map) || (window.state && window.state.map);
    if (mapInstance && typeof mapInstance.resize === 'function') {
      mapInstance.resize();
    }
  };

  // 10. Explorer Toolbar Hover Tooltip (Numbers & Rich Geological Details)
  const HUB_MODE_TOOLTIP_DATA = {
    'tectonic-plates': {
      title: 'Tectonic Plates',
      count: '52 Plates',
      badgeClass: 'badge-theme-plates',
      subtitle: '7 Major • 13 Minor • 32 Microplates',
      desc: 'PB2002 global lithospheric model covering ~510M km² with plate boundaries, relative motion vectors & drift rates.',
      source: 'Peter Bird (2002) Model'
    },
    'earthquakes': {
      title: 'Earthquakes',
      count: 'Live USGS Feed',
      badgeClass: 'badge-theme-quakes',
      subtitle: 'Real-Time Global Seismicity',
      desc: 'Live USGS feed displaying epicenters, seismic depth, Moment magnitudes (Mw / USGS M2.5+), and tsunami alerts.',
      source: 'USGS Earthquake Hazards Feed'
    },
    'volcanoes': {
      title: 'Holocene Volcanoes',
      count: '1,217 Volcanoes',
      badgeClass: 'badge-theme-volcanoes',
      subtitle: 'Active & Dormant Eruption Sites',
      desc: 'Smithsonian GVP catalogue highlighting Pacific Ring of Fire, subduction zone stratovolcanoes & VEI ratings.',
      source: 'Smithsonian Global Volcanism Program'
    },
    'hurricanes': {
      title: 'Hurricanes & Cyclones',
      count: 'Active Storms',
      badgeClass: 'badge-theme-hurricanes',
      subtitle: 'NOAA NHC & JTWC Tropical Systems',
      desc: 'Active tropical storms and historical monster cyclones with Category 1 to 5 wind speeds, track cones & central pressure.',
      source: 'NOAA National Hurricane Center'
    },
    'aurora': {
      title: 'Northern & Southern Lights',
      count: '25 Observatories',
      badgeClass: 'badge-theme-aurora',
      subtitle: 'Geomagnetic Auroral Zones',
      desc: 'Borealis and Australis auroral ovals with 25 polar observatory stations & geomagnetic solar wind Kp indices.',
      source: 'NOAA Space Weather Prediction Center'
    },
    'trenches': {
      title: 'Deep Ocean Trenches',
      count: '7 Deepest Chasms',
      badgeClass: 'badge-theme-trenches',
      subtitle: 'Subduction Depths up to 10,994m',
      desc: "Earth's deepest oceanic abysses formed by subducting oceanic crust, including Mariana Trench (Challenger Deep).",
      source: 'GEBCO & Woods Hole Oceanographic'
    },
    'craters': {
      title: 'Impact Craters',
      count: '5 Major Bolides',
      badgeClass: 'badge-theme-craters',
      subtitle: 'Ancient Asteroid Impact Sites',
      desc: "Earth's largest preserved meteorite impact structures, including Chicxulub (dinosaur extinction event, ~66 Ma).",
      source: 'Earth Impact Database (EID)'
    },
    'tornadoes': {
      title: 'Tornadoes & Storms',
      count: 'Active Warnings',
      badgeClass: 'badge-theme-tornadoes',
      subtitle: 'Severe Weather & Mesoscale Watches',
      desc: 'Active tornado warning polygons, severe thunderstorm clusters, and historical outbreak tracks from NOAA NWS.',
      source: 'NOAA Storm Prediction Center'
    }
  };

  function initExplorerHoverTooltips() {
    const tooltip = document.getElementById('hub-card-tooltip');
    const cards = document.querySelectorAll('.map-mode-card');
    if (!tooltip || cards.length === 0) return;

    function showTooltip(card) {
      const mode = card.dataset.mode;
      const info = HUB_MODE_TOOLTIP_DATA[mode];
      if (!info) return;

      const badgeEl = card.querySelector('.map-card-badge');
      let badgeCount = (badgeEl && badgeEl.textContent.trim()) || info.count;
      if (mode === 'earthquakes' && badgeCount !== '...' && !isNaN(parseInt(badgeCount, 10))) {
        badgeCount = `${badgeCount} Today`;
      }
      const badgeTitle = (badgeEl && badgeEl.getAttribute('title')) || '';

      tooltip.innerHTML = `
        <div class="hub-tooltip-header">
          <span class="hub-tooltip-title">${info.title}</span>
          <span class="hub-tooltip-badge ${info.badgeClass}">${badgeCount}</span>
        </div>
        <div class="hub-tooltip-subtitle">${badgeTitle || info.subtitle}</div>
        <div class="hub-tooltip-desc">${info.desc}</div>
        <div class="hub-tooltip-source"><i class="fa-solid fa-database mr-1"></i>${info.source}</div>
      `;

      tooltip.style.display = 'block';

      const cardRect = card.getBoundingClientRect();
      const tipWidth = tooltip.offsetWidth || 260;
      const tipHeight = tooltip.offsetHeight || 110;

      let left = cardRect.left + (cardRect.width / 2) - (tipWidth / 2);
      left = Math.max(10, Math.min(window.innerWidth - tipWidth - 10, left));

      let top = cardRect.bottom + 8;
      if (cardRect.bottom + tipHeight > window.innerHeight - 20) {
        top = cardRect.top - tipHeight - 8;
      }

      tooltip.style.left = `${Math.round(left)}px`;
      tooltip.style.top = `${Math.round(top)}px`;
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateY(0)';
    }

    function hideTooltip() {
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'translateY(-4px)';
      setTimeout(() => {
        if (tooltip.style.opacity === '0') {
          tooltip.style.display = 'none';
        }
      }, 160);
    }

    cards.forEach(card => {
      card.addEventListener('mouseenter', () => showTooltip(card));
      card.addEventListener('mouseleave', hideTooltip);
      card.addEventListener('focus', () => showTooltip(card));
      card.addEventListener('blur', hideTooltip);
      card.addEventListener('click', hideTooltip);
    });

    const hub = document.getElementById('maps-hub-bar');
    if (hub) {
      hub.addEventListener('mouseleave', hideTooltip);
    }
  }

  // 11. Interactive Legend Hover Tooltip (Category Metrics & Filtering Guide)
  const LEGEND_TOOLTIP_DATA = {
    'volcano-active': {
      title: 'Active Volcanoes',
      icon: '🌋',
      badge: '359 Sites • 29.5%',
      badgeClass: 'alert-red',
      subtitle: 'Modern Instrumental Era (≥1950 CE)',
      desc: 'Volcanoes with documented eruptions from 1950 to present day, including ongoing and recent eruptive phases monitored in real-time by seismology, satellite InSAR, and gas spectrometry.',
      action: 'Click to isolate & narrow down to Active Volcanoes'
    },
    'volcano-recent': {
      title: 'Recent Dormant',
      icon: '🌋',
      badge: '319 Sites • 26.2%',
      badgeClass: 'alert-amber',
      subtitle: 'Recorded Historic Era (0 to 1949 CE)',
      desc: 'Volcanoes with verified written historical eruption accounts during the common era. Currently dormant but geothermally alive, capable of explosive reawakening.',
      action: 'Click to isolate & narrow down to Recent Dormant'
    },
    'volcano-ancient': {
      title: 'Ancient Dormant',
      icon: '🌋',
      badge: '539 Sites • 44.3%',
      badgeClass: 'alert-slate',
      subtitle: 'Prehistoric Holocene (<0 CE / BCE)',
      desc: 'Prehistoric Holocene volcanoes with last known eruptions dated prior to 0 CE (up to 11,700 years ago) identified via tephrochronology, radiometric dating, and lava flow stratigraphy.',
      action: 'Click to isolate & narrow down to Ancient Dormant'
    },
    'volcano-magma': {
      title: 'Magma Arc & Boundaries',
      icon: '🔥',
      badge: '52 Lithospheric Boundaries',
      badgeClass: 'alert-magma',
      subtitle: 'Subduction Zone Volcanic Arcs',
      desc: 'Volcanic arc chains created where hydrating oceanic plates dive into the mantle. Flux melting produces explosive calc-alkaline magma feeding the Pacific Ring of Fire.',
      action: 'Click to toggle Plate Boundary lines on / off'
    },
    'volcano-all': {
      title: 'Smithsonian GVP Catalog',
      icon: '🏛️',
      badge: '1,217 Holocene Sites',
      badgeClass: 'alert-catalog',
      subtitle: 'Smithsonian Global Volcanism Program',
      desc: "The world's definitive scientific database of Earth's volcanoes active during the Holocene epoch (past 11,700 years), curated by the Smithsonian Institution.",
      action: 'Click to show all categories & reset filters'
    },
    'boundary-convergent': {
      title: 'Convergent Boundaries',
      icon: '▲',
      badge: '99 Segments • 41%',
      badgeClass: 'alert-red',
      subtitle: 'Subduction Zones (Teeth ▲) & Collisions',
      desc: 'Plates collide under massive compressive stress. Displayed on the map with directional sawteeth pointing into the overriding plate. Oceanic crust plunges down into trenches, or continents buckle into mountain belts.',
      action: 'Click to isolate Convergent boundaries'
    },
    'boundary-divergent': {
      title: 'Divergent Boundaries',
      icon: '←|→',
      badge: '89 Segments • 37%',
      badgeClass: 'alert-amber',
      subtitle: 'Spreading Ridges (Outward Arrows ←|→)',
      desc: 'Tensional forces pull plates apart. Displayed on the map with perpendicular outward spreading arrows. Basaltic magma wells up from the mantle to create new oceanic crust along mid-ocean ridges and rift valleys.',
      action: 'Click to isolate Divergent boundaries'
    },
    'boundary-transform': {
      title: 'Transform Boundaries',
      icon: '⇋',
      badge: '53 Segments • 22%',
      badgeClass: 'alert-catalog',
      subtitle: 'Strike-Slip Faults (Shear Arrows ⇋)',
      desc: 'Plates grind past one another horizontally. Displayed on the map with parallel opposing shear arrows showing lateral displacement (e.g. San Andreas, Alpine Fault) without creating or destroying crust.',
      action: 'Click to isolate Transform boundaries'
    },
    'boundary-all': {
      title: 'PB2002 Plate Boundaries',
      icon: '🌐',
      badge: '241 Total Segments',
      badgeClass: 'alert-catalog',
      subtitle: 'Peter Bird (2003) Global Boundaries',
      desc: "Complete lithospheric boundary dataset mapping the active fault lines that delineate Earth's 52 tectonic plates.",
      action: 'Click to show all boundary types'
    },
    'quake-time-today': {
      title: "Today's Earthquakes",
      icon: '⚡',
      badge: 'Past 24 Hours',
      badgeClass: 'alert-red',
      subtitle: 'Live Real-Time Seismicity (M2.5+)',
      desc: 'Real-time seismic tremors recorded globally in the past 24 hours by USGS seismograph networks, tracing fresh active rupture zones.',
      action: "Click to filter earthquakes from Today (Default)"
    },
    'quake-time-7d': {
      title: 'Past 7 Days (1 Week)',
      icon: '📅',
      badge: 'Weekly Clusters',
      badgeClass: 'alert-amber',
      subtitle: 'Active Fault Tremor Swarms',
      desc: 'Cumulative seismicity over the past 7 days, capturing active tectonic aftershock swarms along plate margins.',
      action: 'Click to filter earthquakes past 7 days'
    },
    'quake-time-30d': {
      title: 'Past 30 Days (1 Month)',
      icon: '🗓️',
      badge: 'Monthly Catalog',
      badgeClass: 'alert-catalog',
      subtitle: 'Global Background Stress Field',
      desc: 'Standard 30-day USGS global earthquake catalog illustrating plate boundaries and mid-ocean ridges.',
      action: 'Click to filter earthquakes past 30 days'
    },
    'quake-time-60d': {
      title: 'Past 60 Days (2 Months)',
      icon: '🌐',
      badge: 'Bi-Monthly Feed',
      badgeClass: 'alert-catalog',
      subtitle: 'Extended Regional Seismicity',
      desc: 'Extended 60-day earthquake record from the USGS Earthquake Hazards API, revealing broader fault strain patterns.',
      action: 'Click to load & filter earthquakes past 60 days'
    },
    'quake-time-90d': {
      title: 'Past 90 Days (Quarter)',
      icon: '🌍',
      badge: 'Quarterly Record',
      badgeClass: 'alert-catalog',
      subtitle: 'Wadati-Benioff Subduction Zones',
      desc: 'Quarterly global seismic catalog mapping deep mantle subduction zones and large regional megathrust ruptures.',
      action: 'Click to load & filter earthquakes past 90 days'
    },
    'quake-time-1y': {
      title: 'Past 1 Year (Major)',
      icon: '🏛️',
      badge: 'Annual Record',
      badgeClass: 'alert-catalog',
      subtitle: 'Major Global Earthquakes (M4.5+)',
      desc: 'Annual global seismic catalog showing major energy-releasing tectonic ruptures worldwide.',
      action: 'Click to load & filter earthquakes past 1 year'
    },
    'quake-m3': {
      title: 'Minor to Moderate (M3.0+)',
      icon: '〰️',
      badge: 'Felt Seismicity',
      badgeClass: 'alert-slate',
      subtitle: 'Noticeable Tremors',
      desc: 'Noticeable vibrations felt near the epicenter. Recorded daily by global seismic stations, illustrating ongoing background crustal deformation.',
      action: 'Click to filter earthquakes M≥3.0'
    },
    'quake-m5': {
      title: 'Moderate to Strong (M5.0+)',
      icon: '⚠️',
      badge: 'Potentially Damaging',
      badgeClass: 'alert-amber',
      subtitle: 'Significant Energy Release',
      desc: 'Energetic seismic ruptures capable of cracking foundations and causing structural damage in populated areas.',
      action: 'Click to filter earthquakes M≥5.0'
    },
    'quake-m7': {
      title: 'Major to Great (M7.0+)',
      icon: '🚨',
      badge: 'Severe / Tsunami Hazard',
      badgeClass: 'alert-red',
      subtitle: 'Catastrophic Megathrust Quakes',
      desc: 'Violent fault ruptures extending over 100+ km, causing widespread destruction and capable of triggering Pacific-wide tsunamis.',
      action: 'Click to filter earthquakes M≥7.0'
    },
    'quake-peak-focus': {
      title: 'Peak Event Spotlight',
      icon: '👑',
      badge: 'Highest Energy',
      badgeClass: 'alert-amber',
      subtitle: 'Dominant Seismic Release in View',
      desc: 'Spotlights the single largest earthquake currently visible under the active filters. Highlights its epicenter on the map with a golden beacon halo.',
      action: 'Click to fly to epicenter & inspect'
    },
    'quake-depth': {
      title: 'Hypocenter Depth Profile',
      icon: '🔻',
      badge: '0 to 700 km',
      badgeClass: 'alert-catalog',
      subtitle: 'Wadati-Benioff Zone Profile',
      desc: 'Shallow crustal earthquakes (<35 km) in warm orange/red transition into deep subduction earthquakes (>300 km) in deep blue, tracing the plunging slab into the mantle.',
      action: 'Hypocenter depth color indicator'
    },
    'cyclone-td': {
      title: 'Tropical Depression (TD)',
      icon: '🌀',
      badge: '<39 mph',
      badgeClass: 'alert-neutral',
      subtitle: 'Saffir-Simpson Wind Scale',
      desc: 'Organized tropical cyclonic circulation with sustained maximum surface winds under 39 mph (34 knots) and heavy localized convective rain.',
      action: 'Click to isolate and filter Tropical Depressions'
    },
    'cyclone-ts': {
      title: 'Tropical Storm (TS)',
      icon: '🌀',
      badge: '39 to 73 mph',
      badgeClass: 'alert-neutral',
      subtitle: 'Saffir-Simpson Wind Scale',
      desc: 'Organized cyclonic surface circulation with sustained gale-force winds (34 to 63 knots) and heavy localized rain bands.',
      action: 'Click to isolate and filter Tropical Storms'
    },
    'cyclone-cat1': {
      title: 'Category 1 Hurricane',
      icon: '🌀',
      badge: '74 to 95 mph',
      badgeClass: 'alert-neutral',
      subtitle: 'Saffir-Simpson Wind Scale',
      desc: 'Dangerous sustained winds (64 to 82 knots) producing damage to roofs, shingles, siding, and power poles.',
      action: 'Click to isolate and filter Category 1 storms'
    },
    'cyclone-cat2': {
      title: 'Category 2 Hurricane',
      icon: '🌀',
      badge: '96 to 110 mph',
      badgeClass: 'alert-amber',
      subtitle: 'Saffir-Simpson Wind Scale',
      desc: 'Extremely dangerous sustained winds (83 to 95 knots) causing major roof/siding damage, uprooted trees, and coastal surge.',
      action: 'Click to isolate and filter Category 2 storms'
    },
    'cyclone-cat3': {
      title: 'Category 3 Major Hurricane',
      icon: '🌀',
      badge: '111 to 129 mph',
      badgeClass: 'alert-amber',
      subtitle: 'Major Hurricane Status',
      desc: 'Devastating sustained winds (96 to 112 knots) with structural damage to frame houses, massive power outages, and coastal flooding.',
      action: 'Click to isolate and filter Category 3 storms'
    },
    'cyclone-cat4': {
      title: 'Category 4 Major Hurricane',
      icon: '🌀',
      badge: '130 to 156 mph',
      badgeClass: 'alert-red',
      subtitle: 'Catastrophic Major Hurricane',
      desc: 'Catastrophic sustained winds (113 to 136 knots) causing severe structural destruction, flattened homes, and prolonged isolation.',
      action: 'Click to isolate and filter Category 4 storms'
    },
    'cyclone-cat5': {
      title: 'Category 5 Major Hurricane',
      icon: '🌀',
      badge: '157+ mph',
      badgeClass: 'alert-red',
      subtitle: 'Highest Saffir-Simpson Tier',
      desc: 'Total catastrophic sustained winds (137+ knots) with complete roof and wall collapses, extreme storm surge scouring coastlines.',
      action: 'Click to isolate and filter Category 5 storms'
    },
    'cyclone-all': {
      title: 'NOAA National Hurricane Center',
      icon: '🌀',
      badge: 'Live ATCF Feeds',
      badgeClass: 'alert-catalog',
      subtitle: 'Automated Tropical Cyclone Forecasting',
      desc: 'Official tropical cyclone track cones, central atmospheric pressure, and sustained wind radii feeds from NOAA NHC.',
      action: 'Click to show all storm categories and reset filters'
    }
  };

  window.showGlobalLegendTooltip = function (targetEl, key, e) {
    const tooltip = document.getElementById('legend-hover-tooltip');
    if (!tooltip || !targetEl) return;
    const data = LEGEND_TOOLTIP_DATA[key];
    if (!data) return;

    tooltip.innerHTML = `
      <div class="legend-tip-header">
        <div class="legend-tip-title">
          <span class="legend-tip-icon">${data.icon}</span>
          <span>${data.title}</span>
        </div>
        <span class="legend-alert-badge ${data.badgeClass}">${data.badge}</span>
      </div>
      <div class="legend-tip-subtitle">${data.subtitle}</div>
      <div class="legend-tip-desc">${data.desc}</div>
      <div class="legend-tip-action"><i class="fa-solid fa-arrow-pointer mr-1"></i> ${data.action}</div>
    `;

    tooltip.classList.add('is-active');

    const rect = targetEl.getBoundingClientRect();
    const tipWidth = tooltip.offsetWidth || 290;
    const tipHeight = tooltip.offsetHeight || 135;

    let left = rect.left + (rect.width / 2) - (tipWidth / 2);
    left = Math.max(12, Math.min(window.innerWidth - tipWidth - 12, left));

    let top = rect.top - tipHeight - 12;
    if (top < 10) {
      top = rect.bottom + 12;
      tooltip.classList.add('is-inverted');
    } else {
      tooltip.classList.remove('is-inverted');
    }

    const arrowX = Math.round(rect.left + (rect.width / 2) - left);
    tooltip.style.setProperty('--arrow-left', `${arrowX}px`);

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
    tooltip.style.opacity = '1';
    tooltip.style.transform = 'translateY(0)';
  };

  window.hideGlobalLegendTooltip = function () {
    const tooltip = document.getElementById('legend-hover-tooltip');
    if (tooltip) {
      tooltip.classList.remove('is-active');
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'translateY(4px)';
    }
  };

  document.addEventListener('scroll', () => {
    if (window.hideGlobalLegendTooltip) window.hideGlobalLegendTooltip();
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (window.hideGlobalLegendTooltip) window.hideGlobalLegendTooltip();
  }, { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExplorerHoverTooltips);
  } else {
    initExplorerHoverTooltips();
  }

})();
//# sourceMappingURL=core-ui.js.map
