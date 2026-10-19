/**
 * Tectonic Plates Comparison Table Module (Lazy-Loaded)
 * Dynamically renders sorting, metrics, and zoom triggers for all 52 plates
 */

(function () {
  'use strict';

  window.loadAndRenderComparison = function () {
    const tbody = document.getElementById('comparison-table-body');
    if (!tbody) return;

    if (!window.TECTONIC_DATA || !window.TECTONIC_DATA.plates) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="has-text-centered py-5" style="color:#94a3b8;">
            <i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading tectonic plate registry...
          </td>
        </tr>
      `;
      // Check again shortly with leak-proof retry limit (max 50 attempts = 7.5 seconds)
      let retries = 0;
      const checkInterval = setInterval(() => {
        retries++;
        if (window.TECTONIC_DATA && window.TECTONIC_DATA.plates) {
          clearInterval(checkInterval);
          renderTable(tbody);
        } else if (retries >= 50) {
          clearInterval(checkInterval);
          tbody.innerHTML = `
            <tr>
              <td colspan="6" class="has-text-centered py-5" style="color:#ef4444;">
                <i class="fa-solid fa-triangle-exclamation mr-2"></i> Failed to load tectonic plates data.
                <button class="button is-small is-dark ml-3" onclick="window.loadAndRenderComparison()">Retry</button>
              </td>
            </tr>
          `;
        }
      }, 150);
      return;
    }

    renderTable(tbody);
  };

  function renderTable(tbody) {
    tbody.innerHTML = '';
    const sortedPlates = [...window.TECTONIC_DATA.plates.features].sort((a, b) => {
      return (a.properties.PlateName || '').localeCompare(b.properties.PlateName || '');
    });

    sortedPlates.forEach(p => {
      const props = p.properties;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:700; color:#fff;">${props.PlateName}</td>
        <td><span class="tag is-info is-light" style="font-family:var(--font-mono);">${props.Code || '-'}</span></td>
        <td>${props.size || 'N/A'}</td>
        <td style="color:#38bdf8; font-weight:600;">${props.speed || 'N/A'}</td>
        <td>${props.movement || 'Variable'}</td>
        <td>
          <button class="button is-small is-primary is-outlined" onclick="selectAndZoomPlate('${props.Code}')">
            View
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  if (typeof window.selectAndZoomPlate !== 'function') {
    window.selectAndZoomPlate = function (code) {
      if (typeof window.closeComparisonModal === 'function') {
        window.closeComparisonModal();
      }
      if (window.TECTONIC_DATA && window.TECTONIC_DATA.plates) {
        const feat = window.TECTONIC_DATA.plates.features.find(f => (f.properties.Code || '').toUpperCase() === (code || '').toUpperCase());
        if (feat) {
          if (window.TPM && typeof window.TPM.selectPlate === 'function') {
            window.TPM.selectPlate(feat);
          }
          if (typeof window.flyToSelectedPlate === 'function') {
            window.flyToSelectedPlate();
          }
        }
      }
    };
  }

})();
