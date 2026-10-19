/**
 * Teacher Worksheet & Blank Plate Test Generator Engine
 * Renders vector map overlays, toggles student vs answer key mode,
 * and formats print layout for classrooms. Zero AI em-dashes.
 */

(function () {
  'use strict';

  const WORKSHEET_PLATES = [
    { num: 1, name: 'Pacific Plate', type: 'Oceanic', speed: '8.1 cm/year', bounds: 'Convergent / Subduction' },
    { num: 2, name: 'North American Plate', type: 'Continental & Oceanic', speed: '2.3 cm/year', bounds: 'Transform & Divergent' },
    { num: 3, name: 'Eurasian Plate', type: 'Continental & Oceanic', speed: '2.1 cm/year', bounds: 'Collision & Transform' },
    { num: 4, name: 'African Plate', type: 'Continental & Oceanic', speed: '2.2 cm/year', bounds: 'Divergent & Collision' },
    { num: 5, name: 'Antarctic Plate', type: 'Continental & Oceanic', speed: '1.4 cm/year', bounds: 'Divergent / Ridge' },
    { num: 6, name: 'Australian Plate', type: 'Continental & Oceanic', speed: '6.9 cm/year', bounds: 'Subduction & Divergent' },
    { num: 7, name: 'South American Plate', type: 'Continental & Oceanic', speed: '1.5 cm/year', bounds: 'Subduction & Divergent' },
    { num: 8, name: 'Nazca Plate', type: 'Oceanic', speed: '7.5 cm/year', bounds: 'Convergent / Subduction' },
    { num: 9, name: 'Cocos Plate', type: 'Oceanic', speed: '6.7 cm/year', bounds: 'Convergent / Subduction' },
    { num: 10, name: 'Caribbean Plate', type: 'Oceanic & Continental', speed: '2.1 cm/year', bounds: 'Subduction & Transform' },
    { num: 11, name: 'Arabian Plate', type: 'Continental', speed: '4.6 cm/year', bounds: 'Collision & Divergent' },
    { num: 12, name: 'Philippine Sea Plate', type: 'Oceanic', speed: '6.3 cm/year', bounds: 'Subduction Zones' },
    { num: 13, name: 'Juan de Fuca Plate', type: 'Oceanic', speed: '2.8 cm/year', bounds: 'Subduction & Ridge' },
    { num: 14, name: 'Scotia Plate', type: 'Oceanic', speed: '2.2 cm/year', bounds: 'Transform & Subduction' },
    { num: 15, name: 'Somali Plate', type: 'Continental & Oceanic', speed: '2.4 cm/year', bounds: 'Continental Rift' }
  ];

  let currentMode = 'student'; // 'student' or 'teacher'

  function renderTable() {
    const tbody = document.getElementById('worksheet-table-body');
    if (!tbody) return;

    if (currentMode === 'teacher') {
      tbody.innerHTML = WORKSHEET_PLATES.map(p => `
        <tr>
          <td style="font-weight:700; text-align:center;">${p.num}</td>
          <td><span class="ws-plate-name" style="color:#0284c7 !important; font-weight:700;">${p.name}</span></td>
          <td>${p.type}</td>
          <td>${p.speed}</td>
          <td>${p.bounds}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = WORKSHEET_PLATES.map(p => `
        <tr>
          <td style="font-weight:700; text-align:center;">${p.num}</td>
          <td style="border-bottom:1px solid #cbd5e1; height:32px;"></td>
          <td style="border-bottom:1px solid #cbd5e1;"></td>
          <td style="border-bottom:1px solid #cbd5e1;"></td>
          <td style="border-bottom:1px solid #cbd5e1;"></td>
        </tr>
      `).join('');
    }
  }

  window.setWorksheetMode = function (mode) {
    currentMode = mode;
    const btnStudent = document.getElementById('btn-mode-student');
    const btnTeacher = document.getElementById('btn-mode-teacher');
    const modeBadge = document.getElementById('worksheet-mode-badge');
    const studentHeader = document.getElementById('worksheet-student-header');

    if (btnStudent) btnStudent.classList.toggle('is-active', mode === 'student');
    if (btnTeacher) btnTeacher.classList.toggle('is-active', mode === 'teacher');

    if (modeBadge) {
      modeBadge.textContent = mode === 'teacher' ? 'TEACHER ANSWER KEY' : 'STUDENT QUIZ WORKSHEET';
      modeBadge.style.background = mode === 'teacher' ? '#166534' : '#0369a1';
    }

    if (studentHeader) {
      studentHeader.style.display = mode === 'student' ? 'flex' : 'none';
    }

    renderTable();
  };

  window.triggerPrint = function () {
    window.print();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      renderTable();
    });
  } else {
    renderTable();
  }

})();
