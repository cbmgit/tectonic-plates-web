/**
 * Interactive Tectonic Plates & Geophysics Quiz Engine
 * Human-written questions and detailed scientific explanations.
 * Zero AI em-dashes. Blazing-fast client-side execution.
 */

(function () {
  'use strict';

  const QUESTIONS = [
    {
      id: 1,
      category: 'plates',
      question: 'Which of the following is the fastest-moving tectonic plate on Earth today?',
      options: [
        'Antarctic Plate',
        'Pacific Plate',
        'Eurasian Plate',
        'North American Plate'
      ],
      correct: 1,
      explanation: 'The Pacific Plate races along at roughly 7 to 10 centimeters per year, driven by slab-pull forces along subduction zones circling its perimeter. In contrast, the Antarctic Plate creeps along at barely 1 to 2 centimeters annually.'
    },
    {
      id: 2,
      category: 'boundaries',
      question: 'California\'s famous San Andreas Fault is an example of which type of plate boundary?',
      options: [
        'Convergent subduction zone',
        'Divergent oceanic rift',
        'Transform strike-slip fault',
        'Continental collision suture'
      ],
      correct: 2,
      explanation: 'The San Andreas Fault is a classic transform boundary where the Pacific Plate slides horizontally northwest past the North American Plate at roughly 35 to 50 millimeters per year.'
    },
    {
      id: 3,
      category: 'hazards',
      question: 'Why does the Pacific Ring of Fire host roughly 90% of the world\'s earthquakes?',
      options: [
        'The Pacific Ocean has heavy water pushing down on the crust',
        'It is encircled by massive subduction zones where plates grind together',
        'Underwater volcanoes heat up the rock and make it brittle',
        'The moon\'s tidal forces are concentrated over the Pacific basin'
      ],
      correct: 1,
      explanation: 'The Ring of Fire is a 40,000 kilometer perimeter dominated by subduction zones. As heavy oceanic lithosphere plunges beneath surrounding continental plates, friction locks the rock until it snaps in immense megathrust earthquakes.'
    },
    {
      id: 4,
      category: 'plates',
      question: 'Iceland is uniquely situated because it sits directly on top of which geological feature?',
      options: [
        'A subduction zone between Africa and Europe',
        'The spreading Mid-Atlantic Ridge combined with a mantle hotspot',
        'A single stagnant continental craton',
        'A transform fault between South America and Antarctica'
      ],
      correct: 1,
      explanation: 'Iceland is one of the rare places on Earth where a mid-ocean spreading ridge rises above sea level. The North American and Eurasian plates pull apart across the island while a deep mantle plume fuels intense volcanic activity.'
    },
    {
      id: 5,
      category: 'hazards',
      question: 'What is the primary physical mechanism that drives tectonic plate motion across Earth\'s mantle?',
      options: [
        'Slab pull from sinking cold oceanic crust and mantle convection',
        'Centrifugal force from Earth spinning on its axis',
        'Gravitational pull from the Moon and Sun',
        'Solar heating of surface rocks causing thermal expansion'
      ],
      correct: 0,
      explanation: 'Most geophysicists agree that slab pull is the dominant driving force. As dense, chilled oceanic lithosphere sinks into the warmer asthenosphere at subduction zones, its weight pulls the rest of the plate along like a tablecloth falling off a table.'
    },
    {
      id: 6,
      category: 'boundaries',
      question: 'The soaring Himalayan mountain range was created by which type of plate collision?',
      options: [
        'Oceanic plate diving beneath another oceanic plate',
        'Oceanic plate sliding past a continental plate',
        'Two buoyant continental plates colliding with neither subducting',
        'A rift valley tearing a continent into two separate landmasses'
      ],
      correct: 2,
      explanation: 'Roughly 50 million years ago, the Indian Plate slammed into the Eurasian Plate. Because both landmasses consist of light, buoyant continental granite, neither could sink into the mantle. The crust crumpled upward to forge the world\'s highest peaks.'
    },
    {
      id: 7,
      category: 'plates',
      question: 'Which of the following small tectonic plates is subducting beneath the US Pacific Northwest, fueling Mount St. Helens and Mount Rainier?',
      options: [
        'Juan de Fuca Plate',
        'Scotia Plate',
        'Caribbean Plate',
        'Somali Plate'
      ],
      correct: 0,
      explanation: 'The Juan de Fuca Plate is a remnant of the ancient Farallon Plate. It dives beneath the North American Plate along the Cascadia Subduction Zone, producing the volcanic Cascade Range.'
    },
    {
      id: 8,
      category: 'boundaries',
      question: 'What happens along the central rift of a mid-ocean spreading ridge like the Mid-Atlantic Ridge?',
      options: [
        'Old crust melts down into deep ocean trenches',
        'Plates push together to create tall mountain peaks',
        'Magma rises through fissures to solidify into brand new oceanic crust',
        'Earthquakes are strictly absent because rock is molten'
      ],
      correct: 2,
      explanation: 'Mid-ocean ridges are divergent boundaries. As tectonic tension pulls the seafloor apart, basaltic magma wells up from the mantle, cools against frigid seawater, and adds new oceanic lithosphere to the planet.'
    },
    {
      id: 9,
      category: 'plates',
      question: 'Which African geological feature represents an active continental rift that will eventually split the continent and create a new ocean?',
      options: [
        'The Atlas Mountains',
        'The East African Rift Valley',
        'The Congo River Basin',
        'The Sahara Desert Escarpment'
      ],
      correct: 1,
      explanation: 'The East African Rift is an active continental breakup where the Somali Plate is peeling away from the Nubian portion of the African Plate. Over millions of years, seawater will flood the rift to form a new ocean basin.'
    },
    {
      id: 10,
      category: 'hazards',
      question: 'What is the Wadati-Benioff zone in seismology?',
      options: [
        'A quiet zone around volcanoes where earthquakes never happen',
        'A dipping plane of earthquakes marking a descending oceanic plate',
        'The exact spot on Earth directly opposite an earthquake focus',
        'The molten boundary between Earth\'s outer and inner core'
      ],
      correct: 1,
      explanation: 'Named after seismologists Kiyoo Wadati and Hugo Benioff, this zone is a dipping band of earthquakes tracing the path of a cold oceanic slab plunging into the mantle, with foci reaching depths down to 650 kilometers.'
    },
    {
      id: 11,
      category: 'plates',
      question: 'How many major tectonic plates make up the majority of Earth\'s surface area?',
      options: [
        '3 plates',
        '7 plates',
        '24 plates',
        '52 plates'
      ],
      correct: 1,
      explanation: 'Geologists classify Earth\'s crust into 7 major plates (Pacific, North American, Eurasian, African, Antarctic, Australian, and South American), along with 13 minor plates and dozens of microplates.'
    },
    {
      id: 12,
      category: 'hazards',
      question: 'Which historical megathrust earthquake released the most seismic energy ever measured by modern scientific instruments?',
      options: [
        '1906 San Francisco Earthquake (M7.9)',
        '1960 Valdivia, Chile Earthquake (M9.5)',
        '2004 Indian Ocean Earthquake (M9.1)',
        '2011 Tohoku, Japan Earthquake (M9.1)'
      ],
      correct: 1,
      explanation: 'The May 22, 1960 earthquake in southern Chile registered an unprecedented magnitude of 9.5. The rupture ruptured nearly 1,000 kilometers of the Nazca-South American plate boundary and triggered a deadly Pacific-wide tsunami.'
    }
  ];

  let currentCategory = 'all';
  let activeQuestions = [];
  let currentIndex = 0;
  let score = 0;
  let streak = 0;
  let maxStreak = 0;
  let selectedOption = null;
  let answered = false;

  function shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function initQuiz(category) {
    currentCategory = category || 'all';
    currentIndex = 0;
    score = 0;
    streak = 0;
    maxStreak = 0;
    answered = false;

    let filtered = QUESTIONS;
    if (currentCategory !== 'all') {
      filtered = QUESTIONS.filter(q => q.category === currentCategory);
    }
    activeQuestions = shuffle(filtered);

    const quizView = document.getElementById('quiz-active-view');
    const resultView = document.getElementById('quiz-result-view');
    if (quizView) quizView.style.display = 'block';
    if (resultView) resultView.style.display = 'none';

    renderCurrentQuestion();
    updateStatsBar();
  }

  function updateStatsBar() {
    const qCount = document.getElementById('stat-question-num');
    const qTotal = document.getElementById('stat-question-total');
    const scoreEl = document.getElementById('stat-score-val');
    const streakEl = document.getElementById('stat-streak-val');
    const progressEl = document.getElementById('quiz-progress-bar');

    if (qCount) qCount.textContent = currentIndex + 1;
    if (qTotal) qTotal.textContent = activeQuestions.length;
    if (scoreEl) scoreEl.textContent = score;
    if (streakEl) streakEl.textContent = streak;

    if (progressEl) {
      const pct = ((currentIndex) / activeQuestions.length) * 100;
      progressEl.style.width = pct + '%';
    }
  }

  function renderCurrentQuestion() {
    if (currentIndex >= activeQuestions.length) {
      showResults();
      return;
    }

    answered = false;
    selectedOption = null;
    const q = activeQuestions[currentIndex];

    const qText = document.getElementById('quiz-question-text');
    const catBadge = document.getElementById('quiz-category-badge');
    const optionsContainer = document.getElementById('quiz-options-container');
    const feedbackBox = document.getElementById('quiz-feedback-box');
    const nextBtn = document.getElementById('btn-quiz-next');

    if (qText) qText.textContent = q.question;
    if (catBadge) {
      const catLabels = {
        plates: 'Plate Identification',
        boundaries: 'Plate Boundaries',
        hazards: 'Seismology & Hazards'
      };
      catBadge.textContent = catLabels[q.category] || 'General Tectonics';
    }

    if (feedbackBox) {
      feedbackBox.style.display = 'none';
      feedbackBox.className = 'box quiz-feedback';
    }
    if (nextBtn) {
      nextBtn.style.display = 'none';
    }

    if (optionsContainer) {
      optionsContainer.innerHTML = '';
      q.options.forEach((optText, idx) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option-btn';
        btn.setAttribute('data-idx', idx);
        btn.innerHTML = `
          <span class="quiz-option-letter">${String.fromCharCode(65 + idx)}</span>
          <span class="quiz-option-text">${optText}</span>
        `;
        btn.onclick = () => selectAnswer(idx);
        optionsContainer.appendChild(btn);
      });
    }

    updateStatsBar();
  }

  function selectAnswer(chosenIdx) {
    if (answered) return;
    answered = true;
    selectedOption = chosenIdx;

    const q = activeQuestions[currentIndex];
    const isCorrect = chosenIdx === q.correct;

    if (isCorrect) {
      score += 10;
      streak += 1;
      if (streak > maxStreak) maxStreak = streak;
    } else {
      streak = 0;
    }

    // Highlight options
    const optionBtns = document.querySelectorAll('.quiz-option-btn');
    optionBtns.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === q.correct) {
        btn.classList.add('is-correct');
      } else if (idx === chosenIdx && !isCorrect) {
        btn.classList.add('is-wrong');
      }
    });

    // Show explanation feedback
    const feedbackBox = document.getElementById('quiz-feedback-box');
    const feedbackTitle = document.getElementById('quiz-feedback-title');
    const feedbackText = document.getElementById('quiz-feedback-text');
    const nextBtn = document.getElementById('btn-quiz-next');

    if (feedbackBox && feedbackTitle && feedbackText) {
      feedbackBox.style.display = 'block';
      if (isCorrect) {
        feedbackBox.classList.add('feedback-correct');
        feedbackTitle.innerHTML = '<i class="fa-solid fa-circle-check mr-2"></i> Correct Answer!';
      } else {
        feedbackBox.classList.add('feedback-wrong');
        feedbackTitle.innerHTML = '<i class="fa-solid fa-circle-xmark mr-2"></i> Incorrect Choice';
      }
      feedbackText.textContent = q.explanation;
    }

    if (nextBtn) {
      nextBtn.style.display = 'inline-flex';
      nextBtn.textContent = currentIndex + 1 < activeQuestions.length ? 'Next Question' : 'View Final Score';
    }

    updateStatsBar();
  }

  function nextQuestion() {
    currentIndex++;
    renderCurrentQuestion();
  }

  function showResults() {
    const quizView = document.getElementById('quiz-active-view');
    const resultView = document.getElementById('quiz-result-view');
    if (quizView) quizView.style.display = 'none';
    if (resultView) resultView.style.display = 'block';

    const maxScore = activeQuestions.length * 10;
    const pct = Math.round((score / maxScore) * 100);

    const scoreNum = document.getElementById('result-score-num');
    const scorePct = document.getElementById('result-score-pct');
    const titleEl = document.getElementById('result-title');
    const descEl = document.getElementById('result-desc');
    const maxStreakEl = document.getElementById('result-max-streak');

    if (scoreNum) scoreNum.textContent = `${score} / ${maxScore} pts`;
    if (scorePct) scorePct.textContent = `${pct}% Accuracy`;
    if (maxStreakEl) maxStreakEl.textContent = `${maxStreak} in a row`;

    let rankTitle = 'Geology Apprentice';
    let rankDesc = 'You have got the basics down! Spend some time exploring the 3D map and fault lines to sharpen your knowledge of boundary interactions.';

    if (pct >= 90) {
      rankTitle = 'Master Geophysicist';
      rankDesc = 'Phenomenal performance! You have an expert grasp of lithospheric dynamics, boundary mechanisms, and global seismology.';
    } else if (pct >= 75) {
      rankTitle = 'Senior Seismologist';
      rankDesc = 'Great work! You clearly understand how Earth\'s plates move, where hazards cluster, and how subduction zones operate.';
    } else if (pct >= 50) {
      rankTitle = 'Field Geologist';
      rankDesc = 'Solid foundation! You know the major plates well, though a few subtle boundary nuances and historical quakes caught you off guard.';
    }

    if (titleEl) titleEl.textContent = rankTitle;
    if (descEl) descEl.textContent = rankDesc;
  }

  // Global functions for inline HTML event hooks
  window.setQuizCategory = function (cat) {
    document.querySelectorAll('.quiz-cat-tab').forEach(t => {
      t.classList.toggle('is-active', t.getAttribute('data-cat') === cat);
    });
    initQuiz(cat);
  };

  window.handleNextQuestion = nextQuestion;
  window.restartQuiz = function () {
    initQuiz(currentCategory);
  };

  // Auto-init on page load or immediate execution if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initQuiz('all');
    });
  } else {
    initQuiz('all');
  }

})();
