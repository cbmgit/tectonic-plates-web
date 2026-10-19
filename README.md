# Tectonic Plates Map & Geophysics Atlas (Web Client)

An interactive, high-performance web application visualizing Earth's tectonic plates, fault boundaries, real-time earthquakes (USGS), NOAA hurricane tracks, NWS severe weather alerts, and volcano locations.

🌐 **Live Website:** [tectonicplatemap.org](https://tectonicplatemap.org)

---

## ✨ Features

- **Interactive 3D & 2D Plates Map:** Explore major, minor, and micro-tectonic plates with plate motion vectors.
- **Live Geophysical Layers:** Real-time USGS earthquake feeds, NOAA National Hurricane Center tracks, and NWS tornado alerts.
- **Comprehensive Plate Directory:** Detailed geological descriptions, area, velocity, and boundary interactions.
- **Educational Worksheets & Quiz Mode:** Earth science study guides and interactive plate identification quizzes.
- **Mobile First & Offline-Ready:** Fast vanilla JavaScript architecture with Service Worker PWA support.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)

### Running Locally

1. Clone this repository:
   ```bash
   git clone https://github.com/cbmgit/tectonic-plates-web.git
   cd tectonic-plates-web
   ```

2. Start the local server:
   ```bash
   npm start
   ```
   *(or simply run `node server.js`)*

3. Open your browser and navigate to:
   ```
   http://localhost:8088
   ```

---

## 📊 Analytics & Privacy

The public codebase includes a dummy measurement ID placeholder (`G-XXXXXXXXXX`). If you deploy your own instance, replace `G-XXXXXXXXXX` in the HTML files with your own Google Analytics tag, or leave it blank to run without tracking.

---

## 📜 License & Attribution

- **Code:** Licensed under the [MIT License](LICENSE).
- **Geological Datasets:**
  - Plate boundaries based on Peter Bird's global model (PB2002).
  - Real-time seismic data courtesy of [USGS](https://earthquake.usgs.gov/).
  - Severe weather and cyclone data courtesy of [NOAA](https://www.noaa.gov/).
- **Brand Notice:** The design, branding, and domain name `tectonicplatemap.org` are reserved.
