/**
 * Interactive Geological Boundary Cross-Section Engine
 * Lazy-loaded on demand when a user clicks "View Cross-Section" on any fault line.
 * Renders SVG cutaways of subduction, mid-ocean rifting, transform faults, and continental collisions.
 */

(function () {
  'use strict';

  const CROSS_SECTIONS = {
    convergent: {
      title: 'Convergent Boundary: Subduction Zone',
      subtitle: 'Dense oceanic crust plunges beneath continental lithosphere',
      depthRange: '0 to 650 km Depth',
      summary: 'When a dense oceanic plate collides with a lighter continental plate, the ocean floor gets forced downward into the mantle. This diving slab sweats water and volatile gases, lowering the melting temperature of overlying mantle rock. The resulting magma bubbles up to feed violent volcanic arcs, while friction along the interface triggers Earth\'s deepest and most powerful earthquakes along the Wadati-Benioff zone.',
      features: [
        { label: 'Deep Ocean Trench', desc: 'A narrow, V-shaped seafloor depression where the oceanic plate begins its descent.' },
        { label: 'Subducting Oceanic Slab', desc: 'Cold, water-saturated basaltic lithosphere diving into the hot asthenosphere at angles between 30 and 70 degrees.' },
        { label: 'Magma Generation & Volcanic Arc', desc: 'Flux melting creates magma chambers that punch upward through the continental crust to build volcanoes.' },
        { label: 'Wadati-Benioff Earthquake Zone', desc: 'Seismic foci descending from shallow offshore tremors to deep mantle shocks down to 650 km.' }
      ],
      svg: `
        <svg viewBox="0 0 760 380" width="100%" height="auto" class="cross-section-svg" style="background:#090d16; border-radius:10px;">
          <defs>
            <linearGradient id="oceanGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0284c7" stop-opacity="0.75"/>
              <stop offset="100%" stop-color="#0c4a6e" stop-opacity="0.95"/>
            </linearGradient>
            <linearGradient id="oceanCrustGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#334155"/>
              <stop offset="100%" stop-color="#1e293b"/>
            </linearGradient>
            <linearGradient id="contCrustGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#a16207"/>
              <stop offset="40%" stop-color="#78350f"/>
              <stop offset="100%" stop-color="#451a03"/>
            </linearGradient>
            <linearGradient id="mantleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#7c2d12"/>
              <stop offset="50%" stop-color="#991b1b"/>
              <stop offset="100%" stop-color="#450a0a"/>
            </linearGradient>
            <radialGradient id="magmaGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fbbf24"/>
              <stop offset="40%" stop-color="#ef4444"/>
              <stop offset="100%" stop-color="#991b1b" stop-opacity="0"/>
            </radialGradient>
          </defs>

          <!-- Mantle Asthenosphere -->
          <rect x="0" y="140" width="760" height="240" fill="url(#mantleGrad)"/>
          <text x="380" y="360" fill="#fca5a5" font-size="12" font-family="Plus Jakarta Sans, sans-serif" text-anchor="middle" letter-spacing="1">HOT DUCTILE ASTHENOSPHERE (MANTLE)</text>

          <!-- Oceanic Water Layer -->
          <path d="M0 60 L320 60 L350 95 L320 100 L0 100 Z" fill="url(#oceanGrad)"/>
          <text x="120" y="80" fill="#bae6fd" font-size="11" font-weight="600" font-family="Plus Jakarta Sans, sans-serif">Pacific Ocean Trench</text>

          <!-- Continental Crust -->
          <path d="M360 45 Q430 20 480 25 Q530 15 580 40 L760 55 L760 170 L400 170 L360 105 Z" fill="url(#contCrustGrad)"/>
          <text x="610" y="85" fill="#fef08a" font-size="13" font-weight="700" font-family="Plus Jakarta Sans, sans-serif">Continental Crust</text>
          <text x="610" y="103" fill="#cbd5e1" font-size="10" font-family="Plus Jakarta Sans, sans-serif">Thickness: 35-70 km (Granite)</text>

          <!-- Subducting Oceanic Slab -->
          <path d="M0 100 L320 100 L490 280 L440 330 L290 145 L0 145 Z" fill="url(#oceanCrustGrad)" stroke="#475569" stroke-width="1.5"/>
          <text x="120" y="125" fill="#94a3b8" font-size="12" font-weight="700" font-family="Plus Jakarta Sans, sans-serif">Oceanic Crust (Basalt, 7 km)</text>

          <!-- Motion Arrows -->
          <!-- Oceanic push right -->
          <path d="M140 120 L210 120" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
          <polygon points="215,120 203,114 203,126" fill="#38bdf8"/>
          <text x="175" y="112" fill="#38bdf8" font-size="9" text-anchor="middle" font-weight="700">DRIFT 8 cm/yr</text>

          <!-- Continental resistance left -->
          <path d="M680 75 L620 75" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
          <polygon points="615,75 627,69 627,81" fill="#f59e0b"/>

          <!-- Slab descent angle arrow -->
          <path d="M370 180 L410 230" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
          <polygon points="414,235 403,225 413,217" fill="#38bdf8"/>

          <!-- Magma Chamber & Volcano -->
          <ellipse cx="510" cy="190" rx="36" ry="24" fill="url(#magmaGlow)"/>
          <ellipse cx="510" cy="140" rx="20" ry="35" fill="url(#magmaGlow)"/>
          <!-- Volcano peak -->
          <polygon points="510,12 470,45 550,45" fill="#57534e" stroke="#78716c" stroke-width="1.5"/>
          <!-- Magma conduit and eruption plume -->
          <line x1="510" y1="140" x2="510" y2="18" stroke="#f97316" stroke-width="4" stroke-linecap="round"/>
          <circle cx="510" cy="10" r="7" fill="#ef4444"/>
          <path d="M505 8 Q510 -4 522 2 Q532 8 522 14 Z" fill="#f59e0b" opacity="0.9"/>
          <text x="510" y="0" fill="#f97316" font-size="11" font-weight="700" text-anchor="middle">Volcanic Arc</text>

          <!-- Earthquake Hypocenters (Benioff Zone) -->
          <g id="benioff-quakes">
            <circle cx="340" cy="115" r="4" fill="#fbbf24" stroke="#ffffff" stroke-width="1.2"/>
            <circle cx="370" cy="150" r="5" fill="#f97316" stroke="#ffffff" stroke-width="1.2"/>
            <circle cx="405" cy="195" r="6" fill="#ef4444" stroke="#ffffff" stroke-width="1.2"/>
            <circle cx="440" cy="245" r="5" fill="#dc2626" stroke="#ffffff" stroke-width="1.2"/>
            <circle cx="475" cy="295" r="4.5" fill="#b91c1c" stroke="#ffffff" stroke-width="1.2"/>
          </g>
          <text x="440" y="275" fill="#fca5a5" font-size="9" font-weight="600">Benioff Seismic Zone</text>

          <!-- Depth Markers on Right -->
          <line x1="740" y1="55" x2="755" y2="55" stroke="#64748b" stroke-width="1"/>
          <text x="735" y="58" fill="#94a3b8" font-size="9" text-anchor="end">0 km</text>
          <line x1="740" y1="170" x2="755" y2="170" stroke="#64748b" stroke-width="1"/>
          <text x="735" y="174" fill="#94a3b8" font-size="9" text-anchor="end">100 km</text>
          <line x1="740" y1="280" x2="755" y2="280" stroke="#64748b" stroke-width="1"/>
          <text x="735" y="284" fill="#94a3b8" font-size="9" text-anchor="end">300 km</text>
          <line x1="740" y1="350" x2="755" y2="350" stroke="#64748b" stroke-width="1"/>
          <text x="735" y="354" fill="#94a3b8" font-size="9" text-anchor="end">600 km</text>
        </svg>
      `
    },
    divergent: {
      title: 'Divergent Boundary: Mid-Ocean Ridge & Rift Valley',
      subtitle: 'Plates pull apart as molten mantle wells up to forge new crust',
      depthRange: '0 to 40 km Depth',
      summary: 'At divergent boundaries, tectonic forces pull adjacent plates apart in opposite directions. As the crust thins and tears open, pressure on the underlying asthenosphere drops, causing decompression melting. Basaltic magma surges upward along central rift fissures, cooling against cold ocean water to build fresh oceanic floor at rates between 2 and 15 cm each year.',
      features: [
        { label: 'Central Rift Valley', desc: 'A faulted chasm in the middle of the ridge where the crust actively fractures and subsides.' },
        { label: 'Upwelling Magma Chamber', desc: 'Molten mantle rock that rises through decompression melting to fill the widening gap.' },
        { label: 'Pillow Basalts & Sheeted Dykes', desc: 'Rapidly quenched bulbous lava structures that form the uppermost layers of oceanic crust.' },
        { label: 'Hydrothermal Black Smokers', desc: 'Superheated mineral-rich vents that spew sulfur and metallic compounds into the abyss.' }
      ],
      svg: `
        <svg viewBox="0 0 760 380" width="100%" height="auto" class="cross-section-svg" style="background:#090d16; border-radius:10px;">
          <defs>
            <linearGradient id="divOceanGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0369a1" stop-opacity="0.8"/>
              <stop offset="100%" stop-color="#082f49" stop-opacity="0.95"/>
            </linearGradient>
            <linearGradient id="crustDivGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#334155"/>
              <stop offset="100%" stop-color="#1e293b"/>
            </linearGradient>
            <radialGradient id="divMagmaGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#f59e0b"/>
              <stop offset="50%" stop-color="#dc2626"/>
              <stop offset="100%" stop-color="#7f1d1d" stop-opacity="0"/>
            </radialGradient>
          </defs>

          <!-- Mantle Layer -->
          <rect x="0" y="160" width="760" height="220" fill="#7f1d1d"/>

          <!-- Water Layer -->
          <rect x="0" y="30" width="760" height="100" fill="url(#divOceanGrad)"/>
          <text x="380" y="65" fill="#bae6fd" font-size="12" font-weight="600" text-anchor="middle">Deep Ocean (3,000 m Depth)</text>

          <!-- Left Oceanic Plate -->
          <path d="M0 130 L320 130 L350 160 L350 200 L0 200 Z" fill="url(#crustDivGrad)" stroke="#475569" stroke-width="1.5"/>
          <!-- Right Oceanic Plate -->
          <path d="M440 130 L760 130 L760 200 L410 200 L410 160 Z" fill="url(#crustDivGrad)" stroke="#475569" stroke-width="1.5"/>

          <!-- Central Rift Valley Floor -->
          <polygon points="350,160 380,180 410,160 410,210 350,210" fill="#1e1b4b"/>
          <text x="380" y="150" fill="#facc15" font-size="11" font-weight="700" text-anchor="middle">Central Rift Valley</text>

          <!-- Drift Motion Arrows (Spreading Left and Right) -->
          <path d="M240 165 L160 165" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
          <polygon points="155,165 167,159 167,171" fill="#38bdf8"/>
          <text x="200" y="155" fill="#38bdf8" font-size="10" text-anchor="middle" font-weight="700">SPREADING WEST</text>

          <path d="M520 165 L600 165" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
          <polygon points="605,165 593,159 593,171" fill="#38bdf8"/>
          <text x="560" y="155" fill="#38bdf8" font-size="10" text-anchor="middle" font-weight="700">SPREADING EAST</text>

          <!-- Rising Magma Column -->
          <ellipse cx="380" cy="270" rx="90" ry="80" fill="url(#divMagmaGlow)"/>
          <path d="M370 240 Q380 190 380 178 Q380 190 390 240 Z" fill="#f59e0b"/>
          <text x="380" y="280" fill="#fef08a" font-size="12" font-weight="700" text-anchor="middle">Decompression Magma Upwelling</text>

          <!-- Hydrothermal Vents (Black Smokers) -->
          <line x1="365" y1="160" x2="365" y2="135" stroke="#94a3b8" stroke-width="2"/>
          <circle cx="365" cy="130" r="5" fill="#38bdf8" opacity="0.8"/>
          <line x1="395" y1="160" x2="395" y2="138" stroke="#94a3b8" stroke-width="2"/>
          <circle cx="395" cy="133" r="4" fill="#38bdf8" opacity="0.8"/>
          <text x="380" y="115" fill="#7dd3fc" font-size="9" text-anchor="middle">Hydrothermal Vents</text>

          <!-- Shallow Earthquakes on Fault Blocks -->
          <circle cx="335" cy="145" r="4.5" fill="#fbbf24" stroke="#ffffff" stroke-width="1"/>
          <circle cx="425" cy="145" r="4.5" fill="#fbbf24" stroke="#ffffff" stroke-width="1"/>
          <text x="380" y="345" fill="#fca5a5" font-size="11" text-anchor="middle">Shallow Tension Earthquakes (Depth under 20 km)</text>
        </svg>
      `
    },
    transform: {
      title: 'Transform Boundary: Strike-Slip Fault',
      subtitle: 'Plates grind past one another horizontally along vertical fracture planes',
      depthRange: '0 to 25 km Depth',
      summary: 'At transform boundaries, tectonic plates slide past each other horizontally rather than moving toward or away from one another. Because rock surfaces are rough and jagged, friction prevents smooth motion. The plates lock together at sticky spots called asperities. Strain accumulates over decades or centuries until the rock exceeds its shear limit and snaps, sending shockwaves across the surface.',
      features: [
        { label: 'Vertical Fault Plane', desc: 'A near-vertical fracture slicing cleanly through the upper continental or oceanic lithosphere.' },
        { label: 'Frictional Locking Zone (Asperities)', desc: 'Rough rock patches where kinetic energy converts into elastic strain energy for centuries.' },
        { label: 'Offset Surface Topography', desc: 'Streams, fences, roads, and valleys physically sheared and displaced along the fault line.' },
        { label: 'Shallow Focal Depths', desc: 'Almost all earthquakes occur within the top 15 to 25 km where rock behaves in a brittle manner.' }
      ],
      svg: `
        <svg viewBox="0 0 760 380" width="100%" height="auto" class="cross-section-svg" style="background:#090d16; border-radius:10px;">
          <!-- Left Block (Moving Northwest) -->
          <polygon points="100,120 380,80 380,320 100,360" fill="#1e293b" stroke="#334155" stroke-width="2"/>
          <text x="240" y="160" fill="#93c5fd" font-size="14" font-weight="700" text-anchor="middle">Pacific Plate Block</text>
          <text x="240" y="180" fill="#94a3b8" font-size="11" text-anchor="middle">Moving Northwest</text>

          <!-- Right Block (Moving Southeast) -->
          <polygon points="380,80 660,120 660,360 380,320" fill="#334155" stroke="#475569" stroke-width="2"/>
          <text x="520" y="160" fill="#fcd34d" font-size="14" font-weight="700" text-anchor="middle">North American Plate</text>
          <text x="520" y="180" fill="#94a3b8" font-size="11" text-anchor="middle">Moving Southeast</text>

          <!-- Strike-Slip Fault Plane (Center vertical boundary) -->
          <line x1="380" y1="80" x2="380" y2="320" stroke="#ef4444" stroke-width="4" stroke-dasharray="6 3"/>
          <text x="380" y="65" fill="#f87171" font-size="12" font-weight="700" text-anchor="middle">San Andreas Fault Plane</text>

          <!-- Left Block Arrow (pointing into page / up-left) -->
          <path d="M240 250 L200 210" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
          <polygon points="196,206 208,212 202,222" fill="#38bdf8"/>
          <text x="220" y="275" fill="#38bdf8" font-size="11" font-weight="700" text-anchor="middle">SLIP: 48 mm/year</text>

          <!-- Right Block Arrow (pointing down-right) -->
          <path d="M520 210 L560 250" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>
          <polygon points="564,254 558,242 552,252" fill="#fbbf24"/>
          <text x="540" y="275" fill="#fbbf24" font-size="11" font-weight="700" text-anchor="middle">RELATIVE SHEAR</text>

          <!-- Offset stream demonstration on top surface -->
          <path d="M180 135 L380 115" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
          <path d="M380 85 L580 105" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
          <text x="380" y="103" fill="#67e8f9" font-size="9" text-anchor="middle">Offset River Bed</text>

          <!-- Locked Asperity Hypocenters -->
          <circle cx="380" cy="170" r="7" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"/>
          <circle cx="380" cy="230" r="8" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5"/>
          <text x="395" y="174" fill="#fca5a5" font-size="10" font-weight="600">Locked Asperity (M7.8 Focus)</text>
          <text x="395" y="234" fill="#fde68a" font-size="10" font-weight="600">Shallow Rupture Zone</text>
        </svg>
      `
    },
    collision: {
      title: 'Convergent Boundary: Continental Collision',
      subtitle: 'Two thick, buoyant continental landmasses crumple upward into mountain roots',
      depthRange: '0 to 80 km Depth',
      summary: 'When two continental landmasses meet (such as the Indian and Eurasian plates), neither block is dense enough to subduct into the heavy mantle. Instead, immense horizontal tectonic forces fold, fracture, and crumple the rock layers. The crust thickens upward to construct soaring peaks like the Himalayas and bulges downward into a deep crustal mountain root.',
      features: [
        { label: 'Folded Mountain Chain', desc: 'Thickened sedimentary and metamorphic rocks stacked in massive thrust sheets.' },
        { label: 'Deep Mountain Root', desc: 'Buoyant continental crust protruding down up to 75 km into the upper mantle like an iceberg.' },
        { label: 'Suture Zone', desc: 'The crushed scar where ancient ocean floor was trapped between the colliding continents.' },
        { label: 'Wide Crustal Seismicity', desc: 'Earthquakes spread over thousands of square kilometers throughout the collision zone.' }
      ],
      svg: `
        <svg viewBox="0 0 760 380" width="100%" height="auto" class="cross-section-svg" style="background:#090d16; border-radius:10px;">
          <!-- Mantle Layer -->
          <rect x="0" y="200" width="760" height="180" fill="#78350f"/>
          <text x="380" y="350" fill="#fde68a" font-size="11" text-anchor="middle">Rigid Lithospheric Mantle</text>

          <!-- Thickened Crust / Deep Mountain Root -->
          <path d="M0 120 L260 120 Q380 40 500 120 L760 120 L760 220 L520 220 Q380 300 240 220 L0 220 Z" fill="#451a03" stroke="#92400e" stroke-width="2"/>

          <!-- High Mountain Peaks (Himalayas) -->
          <polygon points="320,120 350,50 380,120" fill="#78716c"/>
          <polygon points="360,120 400,30 440,120" fill="#a8a29e"/>
          <polygon points="420,120 450,60 480,120" fill="#78716c"/>
          <!-- Snow caps -->
          <polygon points="390,52 400,30 410,52" fill="#ffffff"/>
          <polygon points="345,64 350,50 355,64" fill="#ffffff"/>
          <polygon points="445,72 450,60 455,72" fill="#ffffff"/>
          <text x="400" y="20" fill="#ffffff" font-size="13" font-weight="800" text-anchor="middle">Mount Everest / Himalayan Uplift</text>

          <!-- Thrust Fault Slices -->
          <line x1="280" y1="180" x2="360" y2="90" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 2"/>
          <line x1="330" y1="200" x2="410" y2="100" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 2"/>
          <text x="310" y="160" fill="#fde68a" font-size="9">Main Thrust Fault</text>

          <!-- Collision Pressure Arrows -->
          <path d="M120 160 L220 160" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
          <polygon points="225,160 213,154 213,166" fill="#38bdf8"/>
          <text x="170" y="150" fill="#38bdf8" font-size="10" font-weight="700">INDIA CRUST (5 cm/yr)</text>

          <path d="M640 160 L540 160" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
          <polygon points="535,160 547,154 547,166" fill="#f59e0b"/>
          <text x="590" y="150" fill="#f59e0b" font-size="10" font-weight="700">EURASIAN PLATE</text>

          <!-- Crustal Root Label -->
          <text x="380" y="260" fill="#fed7aa" font-size="11" font-weight="700" text-anchor="middle">Deep Crustal Root (75 km Thick)</text>

          <!-- Scattered Shallow Earthquakes -->
          <circle cx="340" cy="110" r="4.5" fill="#ef4444" stroke="#ffffff" stroke-width="1"/>
          <circle cx="380" cy="130" r="5" fill="#ef4444" stroke="#ffffff" stroke-width="1"/>
          <circle cx="430" cy="115" r="4.5" fill="#ef4444" stroke="#ffffff" stroke-width="1"/>
          <circle cx="360" cy="150" r="5.5" fill="#fbbf24" stroke="#ffffff" stroke-width="1"/>
          <text x="380" y="175" fill="#fca5a5" font-size="9" text-anchor="middle">Intense Shallow Seismicity Across Entire Range</text>
        </svg>
      `
    }
  };

  function normalizeType(rawType) {
    if (!rawType) return 'convergent';
    const lower = rawType.toLowerCase();
    if (lower.includes('diverg') || lower.includes('osr') || lower.includes('ridge') || lower.includes('rift')) return 'divergent';
    if (lower.includes('transf') || lower.includes('otd') || lower.includes('strike') || lower.includes('slip')) return 'transform';
    if (lower.includes('collis') || lower.includes('ccb') || lower.includes('himalaya')) return 'collision';
    return 'convergent';
  }

  function ensureModalContainer() {
    let modal = document.getElementById('cross-section-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'cross-section-modal';
      modal.className = 'modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'cross-section-title');
      modal.innerHTML = `
        <div class="modal-background" onclick="window.closeCrossSectionModal()"></div>
        <div class="modal-card" style="max-width:880px; width:95%;">
          <header class="modal-card-head" style="background:#0f172a; border-bottom:1px solid rgba(255,255,255,0.1);">
            <div style="flex:1;">
              <p id="cross-section-title" class="modal-card-title" style="color:#ffffff; font-size:1.15rem; font-weight:800; margin:0;"></p>
              <p id="cross-section-subtitle" style="color:#38bdf8; font-size:0.85rem; margin-top:2px;"></p>
            </div>
            <button class="delete" aria-label="close" onclick="window.closeCrossSectionModal()"></button>
          </header>
          <section class="modal-card-body" style="background:#0b1329; color:#cbd5e1; padding:1.25rem;">
            <div id="cross-section-svg-container" style="margin-bottom:1.25rem; box-shadow:0 10px 25px -5px rgba(0,0,0,0.5);"></div>
            <div class="box" style="background:#1e293b; border:1px solid rgba(255,255,255,0.08); margin-bottom:1rem;">
              <h4 style="color:#ffffff; font-size:0.95rem; font-weight:700; margin-bottom:0.5rem;">Geological Mechanism</h4>
              <p id="cross-section-summary" style="font-size:0.88rem; line-height:1.6; color:#cbd5e1; margin:0;"></p>
            </div>
            <div id="cross-section-features-grid" class="columns is-multiline is-variable is-2"></div>
          </section>
          <footer class="modal-card-foot" style="background:#0f172a; border-top:1px solid rgba(255,255,255,0.1); justify-content:space-between;">
            <span id="cross-section-depth" style="font-size:0.8rem; color:#94a3b8; font-weight:600;"></span>
            <button class="button is-small is-dark" onclick="window.closeCrossSectionModal()">Close Diagram</button>
          </footer>
        </div>
      `;
      document.body.appendChild(modal);
    }
    return modal;
  }

  window.renderCrossSectionModal = function (rawType, customName) {
    const modal = ensureModalContainer();
    const typeKey = normalizeType(rawType);
    const data = CROSS_SECTIONS[typeKey] || CROSS_SECTIONS.convergent;

    const titleEl = document.getElementById('cross-section-title');
    const subtitleEl = document.getElementById('cross-section-subtitle');
    const svgWrap = document.getElementById('cross-section-svg-container');
    const summaryEl = document.getElementById('cross-section-summary');
    const depthEl = document.getElementById('cross-section-depth');
    const gridEl = document.getElementById('cross-section-features-grid');

    if (titleEl) {
      titleEl.innerHTML = `<i class="fa-solid fa-mountain-sun mr-2" style="color:#fbbf24;"></i> ${customName ? customName + ': ' : ''}${data.title}`;
    }
    if (subtitleEl) subtitleEl.textContent = data.subtitle;
    if (svgWrap) svgWrap.innerHTML = data.svg;
    if (summaryEl) summaryEl.textContent = data.summary;
    if (depthEl) depthEl.textContent = `Vertical Scale: ${data.depthRange}`;

    if (gridEl) {
      gridEl.innerHTML = data.features.map(f => `
        <div class="column is-6">
          <div style="background:rgba(15,23,42,0.6); border-left:3px solid #38bdf8; padding:8px 12px; border-radius:4px; height:100%;">
            <strong style="color:#f8fafc; font-size:0.85rem; display:block; margin-bottom:2px;">${f.label}</strong>
            <span style="font-size:0.8rem; color:#94a3b8; line-height:1.4;">${f.desc}</span>
          </div>
        </div>
      `).join('');
    }

    modal.classList.add('is-active');
  };

  window.closeCrossSectionModal = function () {
    const modal = document.getElementById('cross-section-modal');
    if (modal) modal.classList.remove('is-active');
  };

  // Allow closing via Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      window.closeCrossSectionModal();
    }
  });

  // Export module interface for TPM dynamic module loader
  window['TPM_Cross-section'] = {
    render: window.renderCrossSectionModal,
    close: window.closeCrossSectionModal,
    sections: CROSS_SECTIONS
  };

})();
