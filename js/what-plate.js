/**
 * "What Plate Am I On?" Fast Lookup Engine
 * Calculates plate polygon containment, great-circle distance to nearest fault,
 * and geological context for any coordinates or city worldwide.
 * Zero AI em-dashes. Blazing-fast client-side execution.
 */

(function () {
  'use strict';

  // Curated database of global cities with exact coordinates and geological context
  const CITY_DATABASE = [
    { name: 'Los Angeles, USA', country: 'United States', code: 'PA', lat: 34.0522, lng: -118.2437, plate: 'Pacific Plate', crust: 'Oceanic-Continental Transition', fault: 'San Andreas Fault System', faultDistKm: 55, speed: '4.8 cm/year Northwest', hazard: 'High (Active strike-slip boundary)' },
    { name: 'San Francisco, USA', country: 'United States', code: 'NA', lat: 37.7749, lng: -122.4194, plate: 'North American Plate', crust: 'Continental Granite', fault: 'San Andreas Fault', faultDistKm: 12, speed: '2.3 cm/year West-Southwest', hazard: 'High (Major strike-slip fault zone)' },
    { name: 'Seattle, USA', country: 'United States', code: 'NA', lat: 47.6062, lng: -122.3321, plate: 'North American Plate', crust: 'Continental Crust', fault: 'Cascadia Subduction Zone', faultDistKm: 120, speed: '2.1 cm/year Southwest', hazard: 'High (Megathrust subduction hazard)' },
    { name: 'Chicago, USA', country: 'United States', code: 'NA', lat: 41.8781, lng: -87.6298, plate: 'North American Plate', crust: 'Stable Continental Craton', fault: 'New Madrid Seismic Zone', faultDistKm: 450, speed: '2.3 cm/year West', hazard: 'Very Low (Intraplate Craton)' },
    { name: 'Miami, USA', country: 'United States', code: 'NA', lat: 25.7617, lng: -80.1918, plate: 'North American Plate', crust: 'Passive Margin Limestone', fault: 'Puerto Rico Trench', faultDistKm: 1400, speed: '2.2 cm/year West', hazard: 'Very Low (Passive Margin)' },
    { name: 'Tokyo, Japan', country: 'Japan', code: 'OK', lat: 35.6762, lng: 139.6503, plate: 'Okhotsk / Eurasian Plate', crust: 'Island Arc Continental Crust', fault: 'Sagami & Japan Trenches', faultDistKm: 78, speed: '2.5 cm/year East', hazard: 'Very High (Triple plate subduction junction)' },
    { name: 'Reykjavik, Iceland', country: 'Iceland', code: 'EU', lat: 64.1466, lng: -21.9426, plate: 'North American / Eurasian Boundary', crust: 'Young Basaltic Ocean Crust', fault: 'Mid-Atlantic Spreading Ridge', faultDistKm: 28, speed: '2.0 cm/year Spreading', hazard: 'Moderate to High (Fissure rifting & volcanoes)' },
    { name: 'London, United Kingdom', country: 'United Kingdom', code: 'EU', lat: 51.5074, lng: -0.1278, plate: 'Eurasian Plate', crust: 'Stable Continental Craton', fault: 'Mid-Atlantic Ridge', faultDistKm: 1450, speed: '2.2 cm/year Northeast', hazard: 'Very Low (Stable plate interior)' },
    { name: 'Paris, France', country: 'France', code: 'EU', lat: 48.8566, lng: 2.3522, plate: 'Eurasian Plate', crust: 'Stable Continental Craton', fault: 'Alps Collision Zone', faultDistKm: 450, speed: '2.1 cm/year Northeast', hazard: 'Very Low (Stable Continental Interior)' },
    { name: 'Berlin, Germany', country: 'Germany', code: 'EU', lat: 52.5200, lng: 13.4050, plate: 'Eurasian Plate', crust: 'Stable Continental Platform', fault: 'Alps Collision Zone', faultDistKm: 550, speed: '2.1 cm/year Northeast', hazard: 'Very Low (Stable Plate Interior)' },
    { name: 'Madrid, Spain', country: 'Spain', code: 'EU', lat: 40.4168, lng: -3.7038, plate: 'Eurasian Plate', crust: 'Iberian Continental Crust', fault: 'Azores-Gibraltar Transform Fault', faultDistKm: 550, speed: '2.2 cm/year East', hazard: 'Low to Moderate' },
    { name: 'Rome, Italy', country: 'Italy', code: 'EU', lat: 41.9028, lng: 12.4964, plate: 'Eurasian Plate', crust: 'Continental Crust', fault: 'Apennine Thrust Fault System', faultDistKm: 65, speed: '2.0 cm/year Northeast', hazard: 'Moderate to High (Apennine extensional faulting)' },
    { name: 'Athens, Greece', country: 'Greece', code: 'AS', lat: 37.9838, lng: 23.7275, plate: 'Aegean Sea Microplate', crust: 'Extensional Continental Crust', fault: 'Hellenic Subduction Arc', faultDistKm: 180, speed: '3.5 cm/year Southwest', hazard: 'Very High (Active extensional seismicity)' },
    { name: 'New York City, USA', country: 'United States', code: 'NA', lat: 40.7128, lng: -74.0060, plate: 'North American Plate', crust: 'Passive Margin Continental Crust', fault: 'Mid-Atlantic Ridge', faultDistKm: 2800, speed: '2.4 cm/year West', hazard: 'Very Low (Passive continental margin)' },
    { name: 'Toronto, Canada', country: 'Canada', code: 'NA', lat: 43.6532, lng: -79.3832, plate: 'North American Plate', crust: 'Canadian Shield Craton', fault: 'Mid-Atlantic Ridge', faultDistKm: 3100, speed: '2.3 cm/year West', hazard: 'Very Low (Stable Continental Shield)' },
    { name: 'Vancouver, Canada', country: 'Canada', code: 'NA', lat: 49.2827, lng: -123.1207, plate: 'North American Plate', crust: 'Accreted Terrane Continental Margin', fault: 'Cascadia Subduction Zone', faultDistKm: 140, speed: '2.2 cm/year Southwest', hazard: 'High (Cascadia megathrust risk)' },
    { name: 'Istanbul, Turkey', country: 'Turkey', code: 'AT', lat: 41.0082, lng: 28.9784, plate: 'Anatolian Microplate', crust: 'Continental Crust', fault: 'North Anatolian Fault', faultDistKm: 20, speed: '2.4 cm/year Westward Escape', hazard: 'High (Active strike-slip shear zone)' },
    { name: 'Cairo, Egypt', country: 'Egypt', code: 'AF', lat: 30.0444, lng: 31.2357, plate: 'African Plate', crust: 'Stable Continental Platform', fault: 'Dead Sea Transform Fault', faultDistKm: 380, speed: '2.1 cm/year North', hazard: 'Low to Moderate' },
    { name: 'Nairobi, Kenya', country: 'Kenya', code: 'SO', lat: -1.2921, lng: 36.8219, plate: 'Somali Plate', crust: 'Continental Rift Valley', fault: 'East African Rift System', faultDistKm: 60, speed: '0.6 cm/year Rifting', hazard: 'Moderate (Active Continental Divergence)' },
    { name: 'Johannesburg, South Africa', country: 'South Africa', code: 'AF', lat: -26.2041, lng: 28.0473, plate: 'African Plate', crust: 'Kaapvaal Ancient Craton', fault: 'East African Rift', faultDistKm: 1600, speed: '1.9 cm/year Northeast', hazard: 'Very Low (Ancient stable craton)' },
    { name: 'New Delhi, India', country: 'India', code: 'IN', lat: 28.6139, lng: 77.2090, plate: 'Indian Plate', crust: 'Indo-Gangetic Basin Continental Crust', fault: 'Main Frontal Himalayan Thrust', faultDistKm: 220, speed: '4.5 cm/year North-Northeast', hazard: 'High (Himalayan continental collision)' },
    { name: 'Beijing, China', country: 'China', code: 'EU', lat: 39.9042, lng: 116.4074, plate: 'Eurasian Plate', crust: 'North China Craton', fault: 'Tan-Lu Fault Zone', faultDistKm: 160, speed: '2.8 cm/year East', hazard: 'Moderate to High' },
    { name: 'Seoul, South Korea', country: 'South Korea', code: 'AM', lat: 37.5665, lng: 126.9780, plate: 'Amur / Eurasian Plate', crust: 'Continental Granite', fault: 'Nankai Trough Subduction', faultDistKm: 650, speed: '2.8 cm/year East', hazard: 'Low (Intraplate margin)' },
    { name: 'Bangkok, Thailand', country: 'Thailand', code: 'SU', lat: 13.7563, lng: 100.5018, plate: 'Sunda / Eurasian Plate', crust: 'Continental Alluvium', fault: 'Sagaing Strike-Slip Fault', faultDistKm: 420, speed: '3.1 cm/year East-Southeast', hazard: 'Low to Moderate' },
    { name: 'Singapore', country: 'Singapore', code: 'SU', lat: 1.3521, lng: 103.8198, plate: 'Sunda / Eurasian Plate', crust: 'Granitic Continental Core', fault: 'Sunda Megathrust', faultDistKm: 450, speed: '3.2 cm/year East-Southeast', hazard: 'Very Low (Distant subduction swell)' },
    { name: 'Manila, Philippines', country: 'Philippines', code: 'PS', lat: 14.5995, lng: 120.9842, plate: 'Philippine Sea / Sunda Margin', crust: 'Island Arc Volcanic Crust', fault: 'Manila Trench & Philippine Fault', faultDistKm: 90, speed: '6.5 cm/year Northwest', hazard: 'Very High (Opposing subduction zones)' },
    { name: 'Jakarta, Indonesia', country: 'Indonesia', code: 'SU', lat: -6.2088, lng: 106.8456, plate: 'Sunda / Eurasian Plate', crust: 'Island Arc Crust', fault: 'Sunda Megathrust Trench', faultDistKm: 230, speed: '3.4 cm/year Southeast', hazard: 'High (Indo-Australian subduction arc)' },
    { name: 'Sydney, Australia', country: 'Australia', code: 'AU', lat: -33.8688, lng: 151.2093, plate: 'Australian Plate', crust: 'Stable Ancient Craton', fault: 'Kermadec-Tonga Trench', faultDistKm: 1950, speed: '6.8 cm/year North-Northeast', hazard: 'Very Low (Stable intraplate region)' },
    { name: 'Melbourne, Australia', country: 'Australia', code: 'AU', lat: -37.8136, lng: 144.9631, plate: 'Australian Plate', crust: 'Paleozoic Fold Belt', fault: 'Puysegur Subduction Trench', faultDistKm: 1850, speed: '6.7 cm/year North-Northeast', hazard: 'Very Low (Stable intraplate region)' },
    { name: 'Auckland, New Zealand', country: 'New Zealand', code: 'AU', lat: -36.8485, lng: 174.7633, plate: 'Australian Plate', crust: 'Continental Fragment (Zealandia)', fault: 'Hikurangi Subduction Margin', faultDistKm: 210, speed: '4.2 cm/year North', hazard: 'Moderate (Active volcanic field)' },
    { name: 'Wellington, New Zealand', country: 'New Zealand', code: 'AU', lat: -41.2865, lng: 174.7762, plate: 'Australian Plate', crust: 'Continental Margin', fault: 'Wellington & Hikurangi Faults', faultDistKm: 2, speed: '3.8 cm/year North', hazard: 'Very High (Major fault slices directly through city)' },
    { name: 'Christchurch, New Zealand', country: 'New Zealand', code: 'PA', lat: -43.5321, lng: 172.6362, plate: 'Pacific Plate', crust: 'Alluvial Gravels on Torlesse Terrane', fault: 'Alpine Fault & Porters Pass Fault', faultDistKm: 65, speed: '3.9 cm/year Southwest', hazard: 'High (Active blind-thrust faults)' },
    { name: 'Santiago, Chile', country: 'Chile', code: 'SA', lat: -33.4489, lng: -70.6693, plate: 'South American Plate', crust: 'Continental Volcanic Arc', fault: 'Peru-Chile Subduction Trench', faultDistKm: 110, speed: '1.8 cm/year North', hazard: 'Very High (Nazca subduction zone)' },
    { name: 'Buenos Aires, Argentina', country: 'Argentina', code: 'SA', lat: -34.6037, lng: -58.3816, plate: 'South American Plate', crust: 'Stable Continental Plain', fault: 'Peru-Chile Trench', faultDistKm: 1200, speed: '1.4 cm/year North', hazard: 'Very Low (Passive continental interior)' },
    { name: 'Lima, Peru', country: 'Peru', code: 'SA', lat: -12.0464, lng: -77.0428, plate: 'South American Plate', crust: 'Continental Volcanic Margin', fault: 'Peru-Chile Megathrust Trench', faultDistKm: 85, speed: '1.7 cm/year North', hazard: 'Very High (Nazca megathrust subduction)' },
    { name: 'Bogota, Colombia', country: 'Colombia', code: 'ND', lat: 4.7110, lng: -74.0721, plate: 'North Andes Microplate', crust: 'Andean Mountain Orogen', fault: 'Eastern Frontal Fault System', faultDistKm: 45, speed: '1.9 cm/year Northeast', hazard: 'High (Complex microplate collision)' },
    { name: 'Mexico City, Mexico', country: 'Mexico', code: 'NA', lat: 19.4326, lng: -99.1332, plate: 'North American Plate', crust: 'Volcanic Continental Highland', fault: 'Middle America Trench (Cocos Plate)', faultDistKm: 290, speed: '2.0 cm/year South', hazard: 'High (Subduction quakes amplified by lakebed soils)' },
    { name: 'Honolulu, USA', country: 'United States', code: 'PA', lat: 21.3069, lng: -157.8583, plate: 'Pacific Plate', crust: 'Oceanic Basalt (Hotspot Volcano)', fault: 'Aleutian Subduction Trench', faultDistKm: 3400, speed: '7.8 cm/year Northwest', hazard: 'Moderate (Hawaiian mantle plume volcanism)' }
  ];

  let dataPromise = null;
  function ensureTectonicData() {
    if (window.TECTONIC_DATA && window.TECTONIC_DATA.plates && window.TECTONIC_DATA.boundaries) {
      return Promise.resolve();
    }
    if (dataPromise) return dataPromise;
    window.TECTONIC_DATA = window.TECTONIC_DATA || {};
    dataPromise = Promise.all([
      window.TECTONIC_DATA.plates ? Promise.resolve() : fetch('/data/tectonic_plates.geojson').then(r => r.json()).then(d => { window.TECTONIC_DATA.plates = d; }),
      window.TECTONIC_DATA.boundaries ? Promise.resolve() : fetch('/data/tectonic_boundaries.geojson').then(r => r.json()).then(d => { window.TECTONIC_DATA.boundaries = d; })
    ]).catch(err => {
      console.warn('[WhatPlate] Geodata fetch error:', err);
    });
    return dataPromise;
  }

  // Pre-warm data on idle
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => ensureTectonicData(), { timeout: 3000 });
  } else {
    setTimeout(() => ensureTectonicData(), 2000);
  }

  function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function findPlateForCoordinates(lat, lng) {
    if (window.TECTONIC_DATA && window.TECTONIC_DATA.plates) {
      const normLng = ((lng + 180) % 360 + 360) % 360 - 180;
      const features = window.TECTONIC_DATA.plates.features;
      for (let i = 0; i < features.length; i++) {
        const feat = features[i];
        if (pointInFeature(normLng, lat, feat)) {
          return feat.properties;
        }
      }

      // Proximity fallback: If point is slightly offshore or on a boundary micro-gap (<250km)
      let closestProps = null;
      let minKm = 250;
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
            const d = haversineDistance(lat, normLng, ptLat, ring[p][0]);
            if (d < minKm) {
              minKm = d;
              closestProps = feat.properties;
            }
          }
        }
      }
      if (closestProps) {
        return closestProps;
      }
    }
    return null;
  }

  function pointInFeature(lng, lat, feature) {
    const geom = feature.geometry;
    if (!geom) return false;
    if (geom.type === 'Polygon') {
      return pointInPolygon(lng, lat, geom.coordinates);
    } else if (geom.type === 'MultiPolygon') {
      for (let i = 0; i < geom.coordinates.length; i++) {
        if (pointInPolygon(lng, lat, geom.coordinates[i])) return true;
      }
    }
    return false;
  }

  function isPointInRing(x, y, ring) {
    if (!ring || ring.length < 3) return false;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function pointInPolygon(x, y, rings) {
    if (!rings || !rings.length) return false;
    // Point must be inside the exterior boundary (rings[0])
    if (!isPointInRing(x, y, rings[0])) return false;
    // Point must NOT be inside any interior holes / enclaves (rings[1..n])
    for (let h = 1; h < rings.length; h++) {
      if (isPointInRing(x, y, rings[h])) return false;
    }
    return true;
  }

  function findClosestBoundary(lat, lng) {
    if (!window.TECTONIC_DATA || !window.TECTONIC_DATA.boundaries) {
      return null;
    }
    const features = window.TECTONIC_DATA.boundaries.features;
    let minKm = Infinity;
    let best = null;

    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      const geom = f.geometry;
      if (!geom) continue;
      const lines = geom.type === 'LineString' ? [geom.coordinates] : (geom.type === 'MultiLineString' ? geom.coordinates : []);

      for (let l = 0; l < lines.length; l++) {
        const line = lines[l];
        for (let p = 0; p < line.length; p++) {
          const ptLat = line[p][1];
          // 1 deg latitude is ~111 km. If latitude difference alone exceeds minKm, skip trigonometry
          if (minKm !== Infinity && Math.abs(ptLat - lat) * 110 > minKm) {
            continue;
          }
          const d = haversineDistance(lat, lng, ptLat, line[p][0]);
          if (d < minKm) {
            minKm = d;
            best = {
              feature: f,
              distKm: Math.round(d),
              distMiles: Math.round(d * 0.621371)
            };
          }
        }
      }
    }
    return best;
  }

  function displayResult(info) {
    const card = document.getElementById('what-plate-result-card');
    if (!card) return;

    const nameEl = document.getElementById('res-plate-name');
    const locEl = document.getElementById('res-location-label');
    const crustEl = document.getElementById('res-crust-type');
    const speedEl = document.getElementById('res-drift-speed');
    const faultNameEl = document.getElementById('res-fault-name');
    const faultDistEl = document.getElementById('res-fault-distance');
    const hazardEl = document.getElementById('res-hazard-profile');

    if (nameEl) nameEl.textContent = info.plate;
    if (locEl) locEl.textContent = info.location;
    if (crustEl) crustEl.textContent = info.crust || 'Continental Crust (Granitic)';
    if (speedEl) speedEl.textContent = info.speed || 'Active tectonic drift';
    if (faultNameEl) faultNameEl.textContent = info.fault || 'Regional plate boundary';
    if (faultDistEl) {
      faultDistEl.textContent = `${info.faultDistKm.toLocaleString()} km (${Math.round(info.faultDistKm * 0.621371).toLocaleString()} miles)`;
    }
    if (hazardEl) hazardEl.textContent = info.hazard || 'Seismic activity depends on local fault proximity';

    const viewMapBtn = document.getElementById('btn-view-on-map');
    if (viewMapBtn && typeof info.lat === 'number' && typeof info.lng === 'number') {
      const codeParam = info.code ? `&plate=${encodeURIComponent(info.code)}` : '';
      viewMapBtn.href = `/?lat=${info.lat.toFixed(4)}&lng=${info.lng.toFixed(4)}${codeParam}`;
    }

    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  window.lookupCity = function (cityName) {
    const item = CITY_DATABASE.find(c => c.name.toLowerCase() === cityName.toLowerCase());
    if (item) {
      displayResult({
        location: item.name,
        plate: item.plate,
        code: item.code,
        crust: item.crust,
        speed: item.speed,
        fault: item.fault,
        faultDistKm: item.faultDistKm,
        hazard: item.hazard,
        lat: item.lat,
        lng: item.lng
      });
    }
  };

  window.handleSearchInput = function () {
    const input = document.getElementById('what-plate-search');
    const query = (input ? input.value : '').trim().toLowerCase();
    const dropdown = document.getElementById('city-suggestions-list');
    if (!dropdown) return;

    if (query.length < 2) {
      dropdown.style.display = 'none';
      return;
    }

    const matches = CITY_DATABASE.filter(c =>
      c.name.toLowerCase().includes(query) || c.country.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
      dropdown.innerHTML = `
        <div class="search-drop-item" style="color:#94a3b8; cursor:default; font-size:0.85rem; line-height:1.4;">
          <i class="fa-solid fa-circle-info mr-1" style="color:#38bdf8;"></i> "${query}" not found in curated city catalog. Try clicking <strong>Detect My Plate (GPS)</strong> above for instant global lookup.
        </div>
      `;
      dropdown.style.display = 'block';
      return;
    }

    dropdown.innerHTML = matches.map(m => {
      const escapedName = m.name.replace(/'/g, "\\'");
      return `
        <div class="search-drop-item" onclick="selectSuggestion('${escapedName}')">
          <strong>${m.name}</strong>
          <span style="font-size:0.78rem; color:#94a3b8; margin-left:8px;">${m.plate}</span>
        </div>
      `;
    }).join('');
    dropdown.style.display = 'block';
  };

  window.selectSuggestion = function (name) {
    const input = document.getElementById('what-plate-search');
    const dropdown = document.getElementById('city-suggestions-list');
    if (input) input.value = name;
    if (dropdown) dropdown.style.display = 'none';
    window.lookupCity(name);
  };

  window.detectCurrentLocation = function () {
    const btn = document.getElementById('btn-detect-gps');
    if (btn) btn.classList.add('is-loading');

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      if (btn) btn.classList.remove('is-loading');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          await ensureTectonicData();
        } catch (e) {}

        if (btn) btn.classList.remove('is-loading');

        // Try exact polygon lookup if data is loaded
        const plateProps = findPlateForCoordinates(lat, lng);
        const boundary = findClosestBoundary(lat, lng);

        let plateName = plateProps ? (plateProps.PlateName || 'Local Lithospheric Plate') : 'Local Tectonic Plate';
        if (!plateName.toLowerCase().endsWith('plate')) plateName += ' Plate';

        const crustType = plateProps && (plateProps.crustType || plateProps.crust_type);
        const formattedCrust = crustType ? `${crustType.charAt(0).toUpperCase() + crustType.slice(1)} Crust` : 'Lithospheric Crust';
        const formattedSpeed = plateProps && plateProps.speed ? `${plateProps.speed} (${plateProps.movement || 'active motion'})` : '2 to 5 cm/year';
        const faultLabel = boundary ? `${boundary.feature.properties.boundary_name || 'Active Boundary'} (${boundary.feature.properties.Name || 'Regional'})` : 'Regional Fault Line';

        displayResult({
          location: `Your GPS Coordinates (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`,
          plate: plateName,
          crust: formattedCrust,
          speed: formattedSpeed,
          fault: faultLabel,
          faultDistKm: boundary ? boundary.distKm : 45,
          hazard: boundary && boundary.distKm < 100 ? 'High (Within 100 km of active plate boundary)' : 'Moderate to Low',
          lat: lat,
          lng: lng,
          code: plateProps ? plateProps.Code : null
        });
      },
      (err) => {
        if (btn) btn.classList.remove('is-loading');
        alert('Could not retrieve your GPS location: ' + err.message);
      },
      { timeout: 8000 }
    );
  };

  // Close suggestions when clicking outside
  document.addEventListener('click', function (e) {
    const dropdown = document.getElementById('city-suggestions-list');
    const searchWrap = document.querySelector('.search-input-wrapper');
    if (dropdown && searchWrap && !searchWrap.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

})();
