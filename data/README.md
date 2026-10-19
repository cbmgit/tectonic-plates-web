# TectonicPlateMap.org Dataset Specification (PB2002)

## Authoritative Source of Truth: `data/plates.json`

This directory provides the authoritative scientific reference dataset for **TectonicPlateMap.org**. All plates, surface areas, motion vectors, crust classifications, and topological relationships are derived strictly from peer-reviewed geophysics models.

### Primary Data Sources & Citations
1. **Peter Bird (2003)**: *"An updated digital model of plate boundaries"*, *Geochemistry, Geophysics, Geosystems* ($G^3$), 4(3), 1027. DOI: [10.1029/2001GC000252](https://doi.org/10.1029/2001GC000252).
   - Global model of **52 tectonic plates** with closed boundary outlines (`PB2002_plates.dig`) and boundary segments (`PB2002_boundaries.dig`).
   - Relative Euler poles in Table 1 (`PB2002_poles.dat`).
2. **DeMets et al. (1994) / Argus & Gordon (1991)**: *NNR-NUVEL1A* (No-Net-Rotation reference frame).
   - Absolute rotation pole for the Pacific Plate (`PA`) at 63.04°S, 107.34°E with an angular velocity of 0.6410°/Ma CCW.
   - Used to transform relative PB2002 Euler rotation vectors into absolute velocities relative to No-Net-Rotation (NNR).

---

## Plate Classification Rule

In model PB2002, Peter Bird demonstrated that the cumulative-number/area distribution follows a power-law distribution over plate sizes from 0.002 to 1 steradians. To remove contradictory labels across literature and our website, plates are categorized deterministically according to their spherical surface area ($A$):

1. **Major Plates ($A \ge 20,000,000\text{ km}^2$, or $\ge 0.5\text{ steradians}$)**: **7 Plates**:
   - Pacific (`PA`, 104,594,030 km², oceanic)
   - African (`AF`, 58,475,731 km², mixed)
   - Antarctic (`AN`, 58,150,865 km², mixed)
   - North American (`NA`, 55,429,915 km², mixed)
   - Eurasian (`EU`, 48,564,251 km², mixed)
   - Australian (`AU`, 45,979,067 km², mixed)
   - South American (`SA`, 41,825,260 km², mixed)
   *(Total Area: 413,019,119 km² / 80.97% of Earth's surface)*

2. **Minor Plates ($1,000,000\text{ km}^2 \le A < 20,000,000\text{ km}^2$, or $0.025 \le \text{sr} < 0.5$)**: **13 Plates**:
   - Somali (`SO`, 19,146,816 km², mixed)
   - Nazca (`NZ`, 16,099,997 km², oceanic)
   - Indian (`IN`, 12,437,842 km², continental)
   - Sunda (`SU`, 8,924,960 km², mixed)
   - Philippine Sea (`PS`, 5,437,171 km², oceanic)
   - Amur (`AM`, 5,303,506 km², continental)
   - Arabian (`AR`, 4,896,826 km², continental)
   - Okhotsk (`OK`, 3,043,991 km², mixed)
   - Caribbean (`CA`, 2,964,254 km², mixed)
   - Cocos (`CO`, 2,931,784 km², oceanic)
   - Yangtze (`YA`, 2,196,523 km², continental)
   - Scotia (`SC`, 1,704,807 km², oceanic)
   - Caroline (`CL`, 1,534,975 km², oceanic)
   *(Total Area: 86,623,452 km² / 16.98% of Earth's surface)*

3. **Microplates ($A < 1,000,000\text{ km}^2$, or $< 0.025\text{ steradians}$)**: **32 Plates**:
   - Altiplano (`AP`), Anatolian (`AT`), Banda Sea (`BS`), Birds Head (`BH`), Balmoral Reef (`BR`), Burma (`BU`), Conway Reef (`CR`), Easter (`EA`), Futuna (`FT`), Galapagos (`GP`), Juan de Fuca (`JF`), Juan Fernandez (`JZ`), Kermadec (`KE`), Manus (`MN`), Maoke (`MO`), Mariana (`MA`), Molucca Sea (`MS`), New Hebrides (`NH`), Niuafo'ou (`NI`), North Andes (`ND`), North Bismarck (`NB`), Okinawa (`ON`), Panama (`PM`), Rivera (`RI`), Shetland (`SL`), Solomon Sea (`SS`), South Bismarck (`SB`), South Sandwich (`SW`), Timor (`TI`), Tonga (`TO`), Woodlark (`WL`), Aegean Sea (`AS`).
   *(Total Area: 10,423,313 km² / 2.04% of Earth's surface)*

**Total Earth Surface Area:** $510,065,884\text{ km}^2$ (Matches IUGG authalic sphere $4\pi R^2 = 510,065,881\text{ km}^2$ with $R = 6371.0088\text{ km}$ to within 0.0000%).

---

## Crustal Types
- **Oceanic**: Dominated by basaltic ocean floor (e.g. Pacific, Nazca, Cocos, Philippine Sea, Juan de Fuca).
- **Continental**: Dominated by granitic continental crust (e.g. Indian, Arabian, Amur, Yangtze, Anatolian).
- **Mixed**: Plates carrying both continental cratons and vast oceanic sectors (e.g. North American, Eurasian, African, Australian, South American, Antarctic, Somali).

---

## Kinematics & Reference Frame

Plate drift velocities and azimuths are computed at each plate's centroid in the **No-Net-Rotation (NNR)** reference frame:
$$\mathbf{\Omega}_i^{\text{NNR}} = \mathbf{\Omega}_i^{\text{PA}} + \mathbf{\Omega}_{\text{PA}}^{\text{NNR}}$$
$$\mathbf{v}_i = \mathbf{\Omega}_i^{\text{NNR}} \times \mathbf{r}_{\text{centroid}}$$
Speeds are presented as single deterministic values in centimeters per year ($\text{cm/yr}$), paired with the explicit label `"relative to No-Net-Rotation (NNR)"`.

---

## Schema per Plate in `plates.json`

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer | Unique identifier (1 to 52) |
| `code` | String | Peter Bird 2-letter PB2002 code |
| `slug` | String | URL-friendly slug identifier (`kebab-case`) |
| `name` | String | Formal geological plate name |
| `class` | String | `"major"`, `"minor"`, or `"microplate"` |
| `crustType` | String | `"oceanic"`, `"continental"`, or `"mixed"` |
| `areaKm2` | Integer | Surface area in $\text{km}^2$ from spherical excess integration |
| `centroid` | Object | Centroid `{ latitude, longitude }` |
| `speedCmPerYear` | Float | Linear drift velocity magnitude in $\text{cm/yr}$ |
| `direction` | String | Cardinal compass direction (16-point compass) |
| `azimuth` | Float | Azimuth in degrees from true North (0° to 360°) |
| `referenceFrame` | String | Reference frame identifier |
| `neighbors` | Array[String] | Array of neighboring 2-letter plate codes |
| `boundaryTypes` | Array[String] | Array of boundary types (`"convergent"`, `"divergent"`, `"transform"`) |
| `sources` | String | Literature citations for boundary and kinematics |
