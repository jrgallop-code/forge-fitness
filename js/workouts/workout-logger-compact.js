import { openActiveWorkout, ACTIVE_WORKOUT_STORAGE_KEY } from './workout-session.js?v=workout-source-stats-1';
import "./exercise-library-expansion.js?v=exercise-library-expansion-1";
import { getExerciseById } from './exercise-library.js?v=exercise-library-catalogue-2';
import { removeWorkoutSet, setHasRecordedData } from './logger-set-removal.js?v=logger-set-removal-1';

const TIMER_SETTINGS_KEY = 'level_up_exercise_rest_settings';
let inlineTimerInterval = null;
let observer = null;
let audioContext = null;
let previousTimerHadTime = false;

function getTimerSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TIMER_SETTINGS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveTimerSettings(settings) {
  localStorage.setItem(TIMER_SETTINGS_KEY, JSON.stringify(settings));
}

function getActive() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveActive(active) {
  if (!active) return;
  active.updatedAt = new Date().toISOString();
  localStorage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(active));
}

function formatSeconds(seconds) {
  const value = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(value / 60);
  const s = value % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getAudioContext() {
  if (audioContext) return audioContext;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  audioContext = new AudioCtx();
  return audioContext;
}

function unlockAlarmAudio() {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === 'suspended') context.resume().catch(() => {});
}

function playRestAlarm() {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === 'suspended') {
    context.resume().then(playRestAlarm).catch(() => {});
    return;
  }

  const start = context.currentTime;
  [0, 0.2, 0.4].forEach((offset, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = index === 2 ? 1046 : 880;
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(0.18, start + offset + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.15);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + 0.17);
  });
}

function ensureHiddenRestSelect(logger) {
  let select = logger.querySelector('#rest-duration-select');
  if (!select) {
    select = document.createElement('select');
    select.id = 'rest-duration-select';
    select.hidden = true;
    select.innerHTML = '<option value="60">60</option><option value="90">90</option><option value="120">120</option><option value="180">180</option>';
    logger.appendChild(select);
  }
  return select;
}

function applyExerciseTimerToCore(logger, exerciseId) {
  const setting = getTimerSettings()[exerciseId] || { enabled: false, seconds: 120 };
  const select = ensureHiddenRestSelect(logger);
  select.value = String(setting.enabled ? setting.seconds : 0);
  if (!setting.enabled) {
    let off = select.querySelector('option[value="0"]');
    if (!off) {
      off = document.createElement('option');
      off.value = '0';
      off.textContent = 'Off';
      select.appendChild(off);
    }
    select.value = '0';
  }
  return setting;
}

function formatLoad(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getSavedWorkoutSessions() {
  try {
    const parsed = JSON.parse(localStorage.getItem('forge_workout_sessions') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getWarmupWorkingLoad(exerciseId, exerciseIndex) {
  const active = getActive();
  const currentSets = active?.exercises?.[exerciseIndex]?.sets || [];
  const currentLoad = currentSets
    .map(set => Number(set?.weight))
    .find(weight => Number.isFinite(weight) && weight > 0);

  if (currentLoad) {
    return { load: currentLoad, source: "today's entered working load" };
  }

  const previous = getSavedWorkoutSessions()
    .filter(session => session?.planId === active?.planId)
    .sort((a, b) => String(b.completedAt || b.updatedAt || b.date || '')
      .localeCompare(String(a.completedAt || a.updatedAt || a.date || '')))
    .map(session => (session.exercises || []).find(exercise =>
      (exercise.exerciseId || exercise.id) === exerciseId
    ))
    .find(exercise => (exercise?.sets || []).some(set =>
      set?.completed &&
      Number.isFinite(Number(set?.weight)) &&
      Number(set.weight) > 0
    ));

  const previousLoad = (previous?.sets || [])
    .filter(set => set?.completed)
    .map(set => Number(set?.weight))
    .find(weight => Number.isFinite(weight) && weight > 0);

  return previousLoad
    ? { load: previousLoad, source: 'your last completed working load' }
    : null;
}

function roundWarmupLoad(load) {
  const rounded = Math.round(Number(load) / 5) * 5;
  return Math.max(5, rounded);
}

function getWarmupSteps(workingLoad, exerciseType) {
  const scheme = exerciseType === 'isolation'
    ? [
        { percent: 50, reps: 5 }
      ]
    : [
        { percent: 50, reps: 8 },
        { percent: 75, reps: 5 }
      ];

  return scheme.map(step => ({
    ...step,
    load: roundWarmupLoad(workingLoad * step.percent / 100)
  }));
}

function renderWarmupCalculator(panel, workingLoad, exerciseType, source) {
  if (!workingLoad) {
    panel.innerHTML = `
      <div class="exercise-warmup-title">
        <div>
          <strong>Optional warm-up</strong>
          <small>Not recorded</small>
        </div>
        <button class="warmup-close-btn" type="button" aria-label="Hide optional warm-up">×</button>
      </div>
      <p class="exercise-warmup-optional">You may do all, some, or none of these warm-up sets.</p>
      <form class="warmup-load-form">
        <label>
          Expected working weight
          <span class="warmup-load-entry">
            <input class="warmup-working-load" type="number" inputmode="decimal" min="1" step="0.5" placeholder="Weight in lb" required>
            <button class="primary-btn" type="submit">Calculate</button>
          </span>
        </label>
      </form>
      <p class="exercise-warmup-help">No previous working load was found. This number is used only for the temporary calculation and is not saved.</p>
    `;

    panel.querySelector('.warmup-load-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const load = Number(panel.querySelector('.warmup-working-load')?.value);
      if (!Number.isFinite(load) || load <= 0) return;
      renderWarmupCalculator(panel, load, exerciseType, 'the working weight you entered');
    });
  } else {
    const steps = getWarmupSteps(workingLoad, exerciseType);
    panel.innerHTML = `
      <div class="exercise-warmup-title">
        <div>
          <strong>Optional warm-up suggestions</strong>
          <small>Based on ${source}</small>
        </div>
        <button class="warmup-close-btn" type="button" aria-label="Hide optional warm-up">×</button>
      </div>
      <p class="exercise-warmup-optional"><b>Do all, some, or none.</b> These sets are optional and are not recorded.</p>
      <div class="warmup-suggestion-list">
        ${steps.map((step, index) => `
          <div class="warmup-suggestion-row">
            <span>Set ${index + 1}</span>
            <strong>${formatLoad(step.load)} lb</strong>
            <span>${step.reps} reps</span>
            <small>${step.percent}%</small>
          </div>
        `).join('')}
      </div>
      <div class="warmup-panel-actions">
        <button class="warmup-change-load secondary-btn" type="button">Change working weight</button>
        <button class="warmup-done-btn primary-btn" type="button">Hide</button>
      </div>
      <p class="exercise-warmup-help">For adults. Adjust or skip any suggestion that does not feel appropriate. Calculated loads are rounded to practical 5 lb increments.</p>
    `;

    panel.querySelector('.warmup-change-load')?.addEventListener('click', () => {
      renderWarmupCalculator(panel, null, exerciseType, '');
    });
  }

  const hide = () => {
    panel.hidden = true;
    const button = panel.closest('.session-exercise-card')?.querySelector('.exercise-warmup-btn');
    button?.setAttribute('aria-expanded', 'false');
  };
  panel.querySelector('.warmup-close-btn')?.addEventListener('click', hide);
  panel.querySelector('.warmup-done-btn')?.addEventListener('click', hide);
}

function setupExerciseCarousel(logger) {
  const container = logger.querySelector('#session-exercises');
  const cards = [...(container?.querySelectorAll('.session-exercise-card') || [])];
  if (!container || !cards.length) return;

  let controls = container.querySelector('.exercise-carousel-controls');
  if (!controls) {
    controls = document.createElement('div');
    controls.className = 'exercise-carousel-controls';
    controls.innerHTML = `
      <button class="exercise-carousel-prev secondary-btn" type="button" aria-label="Show previous exercise">← Previous</button>
      <div class="exercise-carousel-position" aria-live="polite"></div>
      <button class="exercise-carousel-next primary-btn" type="button" aria-label="Show next exercise">Next →</button>
    `;
    cards[0].insertAdjacentElement('beforebegin', controls);
  }

  const showExercise = requestedIndex => {
    const latestCards = [...container.querySelectorAll('.session-exercise-card')];
    if (!latestCards.length) return;

    const index = Math.max(0, Math.min(Number(requestedIndex) || 0, latestCards.length - 1));
    logger.dataset.carouselExerciseIndex = String(index);

    latestCards.forEach((card, cardIndex) => {
      card.hidden = cardIndex !== index;
      card.classList.toggle('active-exercise-card', cardIndex === index);
    });

    const currentControls = container.querySelector('.exercise-carousel-controls');
    const position = currentControls?.querySelector('.exercise-carousel-position');
    if (position) {
      position.innerHTML = `<strong>Exercise ${index + 1} of ${latestCards.length}</strong><small>Swipe right for next</small>`;
    }

    const previousButton = currentControls?.querySelector('.exercise-carousel-prev');
    const nextButton = currentControls?.querySelector('.exercise-carousel-next');
    if (previousButton) previousButton.disabled = index === 0;
    if (nextButton) nextButton.disabled = index === latestCards.length - 1;

    if (!logger.dataset.editingSessionId) {
      const active = getActive();
      if (active) {
        active.currentExerciseIndex = Number(latestCards[index].dataset.exerciseIndex) || index;
        saveActive(active);
      }
    }
  };

  const savedIndex = Number(logger.dataset.carouselExerciseIndex);
  const activeIndex = Number(getActive()?.currentExerciseIndex);
  showExercise(Number.isFinite(savedIndex) ? savedIndex : (Number.isFinite(activeIndex) ? activeIndex : 0));

  if (container.dataset.exerciseCarouselBound === 'true') return;
  container.dataset.exerciseCarouselBound = 'true';

  container.addEventListener('click', event => {
    const current = Number(logger.dataset.carouselExerciseIndex) || 0;
    if (event.target.closest('.exercise-carousel-next')) showExercise(current + 1);
    if (event.target.closest('.exercise-carousel-prev')) showExercise(current - 1);
  });

  let swipeStart = null;
  container.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || event.target.closest('button, input, select, textarea, label')) return;
    swipeStart = { x: event.clientX, y: event.clientY };
  });

  container.addEventListener('pointerup', event => {
    if (!swipeStart || event.pointerType !== 'touch') return;
    const deltaX = event.clientX - swipeStart.x;
    const deltaY = event.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(deltaX) < 55 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    const current = Number(logger.dataset.carouselExerciseIndex) || 0;
    showExercise(deltaX > 0 ? current + 1 : current - 1);
  });

  container.addEventListener('pointercancel', () => {
    swipeStart = null;
  });
}

function createEffortGuide() {
  const root = document.createElement('div');
  root.className = 'exercise-effort-guide';
  root.innerHTML = `
    <button class="effort-guide-toggle" type="button" aria-expanded="false">
      <span><strong>Target effort: 1–3 reps in reserve</strong><small>How to choose your working weight</small></span>
      <span aria-hidden="true">⌄</span>
    </button>
    <div class="effort-guide-panel" hidden>
      <p>Choose a load or variation that lets you finish the target rep range with consistent technique and about 1–3 good repetitions still possible.</p>
      <div class="effort-guide-scale">
        <span><strong>4+</strong> Consider slightly more resistance</span>
        <span><strong>1–3</strong> Target effort for most working sets</span>
        <span><strong>0</strong> Technical failure; not routinely required</span>
      </div>
      <p class="effort-guide-safety">Stop when another repetition would require substantially changing technique. Use appropriate supervision or safety equipment where a failed repetition could be unsafe.</p>
    </div>
    <div class="effort-rir-check" hidden>
      <strong>How many good repetitions did you have left?</strong>
      <div class="effort-rir-options" role="group" aria-label="Repetitions remaining">
        <button type="button" data-rir="0">0</button>
        <button type="button" data-rir="1">1</button>
        <button type="button" data-rir="2">2</button>
        <button type="button" data-rir="3">3</button>
        <button type="button" data-rir="4">4+</button>
        <button type="button" data-rir="unknown">Not sure</button>
      </div>
      <p class="effort-rir-feedback" aria-live="polite"></p>
    </div>
  `;

  const toggle = root.querySelector('.effort-guide-toggle');
  const panel = root.querySelector('.effort-guide-panel');
  const check = root.querySelector('.effort-rir-check');
  const feedback = root.querySelector('.effort-rir-feedback');

  toggle?.addEventListener('click', () => {
    const opening = panel.hidden;
    panel.hidden = !opening;
    toggle.setAttribute('aria-expanded', String(opening));
  });

  root.querySelector('.effort-rir-options')?.addEventListener('click', event => {
    const button = event.target.closest('button[data-rir]');
    if (!button || !feedback) return;
    root.querySelectorAll('.effort-rir-options button').forEach(option => {
      option.classList.toggle('selected', option === button);
    });

    const value = button.dataset.rir;
    feedback.textContent = value === '0'
      ? 'You reached technical failure. Consider leaving 1–3 repetitions on the next set.'
      : value === '1' || value === '2' || value === '3'
        ? 'Target effort reached.'
          : value === '4'
            ? 'This was below the target effort. Consider a small resistance increase when appropriate.'
            : 'That is okay. Estimating repetitions remaining becomes easier with practice.';
  });

  return {
    root,
    showFinalSetCheck() {
      if (check) check.hidden = false;
    }
  };
}

function enhanceEffortGuide(card) {
  if (!card || card.dataset.effortGuideEnhanced === 'true') return;
  card.dataset.effortGuideEnhanced = 'true';

  const target = card.querySelector('.session-target');
  const header = card.querySelector('.compact-exercise-header') || card.querySelector('h4');
  if (!target && !header) return;

  const effortGuide = createEffortGuide();
  if (target) target.insertAdjacentElement('afterend', effortGuide.root);
  else header.insertAdjacentElement('afterend', effortGuide.root);

  card.addEventListener('click', event => {
    const complete = event.target.closest('.complete-set-btn');
    if (!complete) return;
    const row = complete.closest('.session-set-row');
    if (!row) return;

    setTimeout(() => {
      const setRows = [...card.querySelectorAll('.session-set-row')];
      if (row.classList.contains('completed') && row === setRows.at(-1)) {
        effortGuide.showFinalSetCheck();
      }
    }, 0);
  });
}

function enhanceLoggerFormGuides(logger) {
  logger
    .querySelectorAll('.session-exercise-card:not([data-logger-form-guide-enhanced="true"])')
    .forEach(card => {
      card.dataset.loggerFormGuideEnhanced = 'true';

      const exerciseIndex = Number(card.dataset.exerciseIndex);
      const exerciseId = card.dataset.exerciseId || `exercise-${exerciseIndex}`;
      const anchor = card.querySelector('.compact-exercise-header') || card.querySelector('h4');
      if (!anchor || !getExerciseById(exerciseId)) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'logger-form-guide-btn';
      button.textContent = 'Form Guide';
      button.setAttribute('aria-label', `Open form guide for ${getExerciseById(exerciseId)?.name || 'exercise'}`);

      button.addEventListener('click', () => {
        document.dispatchEvent(
          new CustomEvent('levelup:open-exercise-guide', {
            detail: {
              exerciseId,
              sourceSelector: '#workout-session-logger',
              backLabel: '← Workout',
              focusGuideStart: true
            }
          })
        );
      });

      anchor.insertAdjacentElement('afterend', button);
    });
}

function enhanceLogger(logger) {
  if (!logger) return;

  enhanceLoggerFormGuides(logger);

  logger.querySelectorAll(
    '.session-exercise-card[data-tracking-type="reps"]:not([data-effort-guide-enhanced="true"])'
  ).forEach(enhanceEffortGuide);

  const initialEnhancement = logger.dataset.compactEnhanced !== 'true';
  const unenhancedCards = logger.querySelectorAll(
    '.session-exercise-card[data-tracking-type="reps"]:not([data-compact-card-enhanced="true"])'
  );

  if (!initialEnhancement && !unenhancedCards.length) {
    setupExerciseCarousel(logger);
    return;
  }

  if (initialEnhancement) {
    logger.dataset.compactEnhanced = 'true';
    logger.classList.add('compact-workout-logger');
    logger.addEventListener('pointerdown', unlockAlarmAudio, { once: true });
    logger.querySelector('.rest-timer-panel')?.remove();
    ensureHiddenRestSelect(logger);
  }

  unenhancedCards.forEach(card => {
    card.dataset.compactCardEnhanced = 'true';
    const exerciseIndex = Number(card.dataset.exerciseIndex);
    const exerciseId = card.dataset.exerciseId || `exercise-${exerciseIndex}`;
    const heading = card.querySelector('h4');
    if (!heading) return;

    const header = document.createElement('div');
    header.className = 'compact-exercise-header';
    heading.parentNode.insertBefore(header, heading);
    header.appendChild(heading);

    const headerActions = document.createElement('div');
    headerActions.className = 'compact-exercise-actions';

    const warmupButton = document.createElement('button');
    warmupButton.type = 'button';
    warmupButton.className = 'exercise-warmup-btn';
    warmupButton.textContent = 'Warm-up';
    warmupButton.setAttribute('aria-label', 'Show optional warm-up suggestions');
    warmupButton.setAttribute('aria-expanded', 'false');

    const equipment = String(getExerciseById(exerciseId)?.equipment || '').toLowerCase();
    const isBodyweightOnly = equipment === 'bodyweight';
    if (!isBodyweightOnly) headerActions.appendChild(warmupButton);

    const menuButton = document.createElement('button');
    menuButton.type = 'button';
    menuButton.className = 'exercise-more-btn';
    menuButton.setAttribute('aria-label', 'Exercise options and rest timer');
    menuButton.textContent = '•••';
    headerActions.appendChild(menuButton);
    header.appendChild(headerActions);

    const warmupPanel = document.createElement('div');
    warmupPanel.className = 'exercise-warmup-panel';
    warmupPanel.hidden = true;
    header.insertAdjacentElement('afterend', warmupPanel);

    warmupButton.addEventListener('click', () => {
      const opening = warmupPanel.hidden;
      warmupPanel.hidden = !opening;
      warmupButton.setAttribute('aria-expanded', String(opening));
      if (!opening) return;

      const exerciseType = getExerciseById(exerciseId)?.type === 'isolation'
        ? 'isolation'
        : 'compound';
      const working = getWarmupWorkingLoad(exerciseId, exerciseIndex);
      renderWarmupCalculator(
        warmupPanel,
        working?.load || null,
        exerciseType,
        working?.source || ''
      );
    });

    const settings = getTimerSettings();
    const current = settings[exerciseId] || { enabled: false, seconds: 120 };

    const menu = document.createElement('div');
    menu.className = 'exercise-options-popover';
    menu.hidden = true;
    menu.innerHTML = `
      <div class="exercise-option-row">
        <span>Rest timer</span>
        <label class="compact-switch">
          <input type="checkbox" class="exercise-timer-enabled" ${current.enabled ? 'checked' : ''}>
          <span></span>
        </label>
      </div>
      <label class="exercise-duration-row">
        <span>Rest period</span>
        <select class="exercise-rest-duration" aria-label="Suggested rest period">
          <option value="60" ${current.seconds === 60 ? 'selected' : ''}>1:00</option>
          <option value="90" ${current.seconds === 90 ? 'selected' : ''}>1:30</option>
          <option value="120" ${current.seconds === 120 ? 'selected' : ''}>2:00</option>
          <option value="180" ${current.seconds === 180 ? 'selected' : ''}>3:00 (optimal for hypertrophy)</option>
        </select>
      </label>
    `;
    header.appendChild(menu);

    menuButton.addEventListener('click', event => {
      unlockAlarmAudio();
      event.stopPropagation();
      logger.querySelectorAll('.exercise-options-popover').forEach(other => {
        if (other !== menu) other.hidden = true;
      });
      menu.hidden = !menu.hidden;
    });

    const timerToggle = menu.querySelector('.exercise-timer-enabled');
    const timerDuration = menu.querySelector('.exercise-rest-duration');
    const persistSetting = () => {
      const all = getTimerSettings();
      all[exerciseId] = {
        enabled: Boolean(timerToggle?.checked),
        seconds: Number(timerDuration?.value) || 120
      };
      saveTimerSettings(all);
      updateAddSetLabel(card, exerciseId);
    };
    timerToggle?.addEventListener('change', persistSetting);
    timerDuration?.addEventListener('change', persistSetting);

    const target = card.querySelector('.session-target');
    target?.classList.add('compact-target');
    card.querySelector('.previous-performance')?.remove();

    const progressionPrompt = card.querySelector('.progression-prompt') || document.createElement('div');
    progressionPrompt.className = 'progression-prompt';
    if (!progressionPrompt.isConnected) {
      progressionPrompt.hidden = true;
      if (target) target.insertAdjacentElement('afterend', progressionPrompt);
      else header.insertAdjacentElement('afterend', progressionPrompt);
    }

    const setHeader = card.querySelector('.session-set-header');
    if (setHeader) {
      setHeader.innerHTML = '<span>Set</span><span>Previous</span><span>lbs</span><span>Reps</span><span>✓</span><span aria-label="Remove set">−</span>';
    }

    [...card.querySelectorAll('.session-set-row')].forEach(row => {
      const setIndex = Number(row.dataset.setIndex);
      const complete = row.querySelector('.complete-set-btn');
      if (complete) {
        complete.textContent = '✓';
        complete.setAttribute('aria-label', `Complete set ${setIndex + 1}`);

        complete.addEventListener('pointerdown', () => {
          unlockAlarmAudio();
          applyExerciseTimerToCore(logger, exerciseId);
        }, true);

        complete.addEventListener('click', () => {
          setTimeout(() => {
            const setting = getTimerSettings()[exerciseId] || { enabled: false, seconds: 120 };
            const active = getActive();
            if (!active) return;
            active.currentExerciseIndex = exerciseIndex;
            active.currentSetIndex = setIndex;
            if (!setting.enabled && row.classList.contains('completed')) {
              active.restTimer = null;
              saveActive(active);
            }
            updateInlineTimers();
          }, 0);
        });
      }

      if (!logger.dataset.editingSessionId) {
        const removeSet = document.createElement('button');
        removeSet.type = 'button';
        removeSet.className = 'logger-remove-set-btn';
        removeSet.textContent = '−';
        removeSet.disabled = card.querySelectorAll('.session-set-row').length <= 1;
        removeSet.setAttribute('aria-label', `Remove set ${setIndex + 1}`);
        removeSet.addEventListener('click', () => {
          const active = getActive();
          const set = active?.exercises?.[exerciseIndex]?.sets?.[setIndex];
          if (!active || !set) return;
          if (setHasRecordedData(set) && !window.confirm(`Remove set ${setIndex + 1} and its recorded data?`)) return;
          if (!removeWorkoutSet(active, exerciseIndex, setIndex)) return;
          saveActive(active);
          openActiveWorkout();
        });
        row.appendChild(removeSet);
      }

      const timerLine = document.createElement('div');
      timerLine.className = 'inline-rest-timer';
      timerLine.dataset.exerciseIndex = String(exerciseIndex);
      timerLine.dataset.setIndex = String(setIndex);
      timerLine.hidden = true;
      row.insertAdjacentElement('afterend', timerLine);
    });

    if (!logger.dataset.editingSessionId) {
      const addSet = document.createElement('button');
      addSet.type = 'button';
      addSet.className = 'compact-add-set-btn';
      card.appendChild(addSet);
      updateAddSetLabel(card, exerciseId);
      addSet.addEventListener('click', () => {
        const active = getActive();
        const state = active?.exercises?.[exerciseIndex];
        if (!state || !Array.isArray(state.sets)) return;
        state.sets.push({ weight: null, reps: null, completed: false });
        const planned = active.planSnapshot?.days?.[active.trainingDayIndex]?.exercises?.[exerciseIndex];
        if (planned) planned.sets = state.sets.length;
        saveActive(active);
        openActiveWorkout();
      });
    }
  });

  if (initialEnhancement) {
    logger.addEventListener('click', event => {
      if (!event.target.closest('.exercise-more-btn, .exercise-options-popover')) {
        logger.querySelectorAll('.exercise-options-popover').forEach(menu => menu.hidden = true);
      }
    });
  }

  setupExerciseCarousel(logger);
  updateInlineTimers();
}

function updateAddSetLabel(card, exerciseId) {
  const button = card.querySelector('.compact-add-set-btn');
  if (!button) return;
  button.textContent = '+ Add Set';
}

function updateInlineTimers() {
  const active = getActive();
  document.querySelectorAll('.inline-rest-timer').forEach(line => {
    line.hidden = true;
    line.textContent = '';
  });
  if (!active?.restTimer) {
    previousTimerHadTime = false;
    return;
  }

  let remainingMs = Number(active.restTimer.remainingMs) || 0;
  if (active.restTimer.status === 'running' && active.restTimer.endAt) {
    remainingMs = Math.max(0, new Date(active.restTimer.endAt).getTime() - Date.now());
  }

  if (remainingMs <= 0) {
    if (previousTimerHadTime) playRestAlarm();
    previousTimerHadTime = false;
    return;
  }

  previousTimerHadTime = true;
  const selector = `.inline-rest-timer[data-exercise-index="${active.currentExerciseIndex}"][data-set-index="${active.currentSetIndex}"]`;
  const line = document.querySelector(selector);
  if (!line) return;
  line.hidden = false;
  line.textContent = formatSeconds(remainingMs / 1000);
}

function scanForLogger() {
  const logger = document.getElementById('workout-session-logger');
  if (logger) enhanceLogger(logger);
}

observer = new MutationObserver(mutations => {
  const needsScan = mutations.some(mutation =>
    [...mutation.addedNodes].some(node =>
      node.nodeType === 1 && (
        node.id === 'workout-session-logger' ||
        node.matches?.('.session-exercise-card') ||
        node.querySelector?.('#workout-session-logger, .session-exercise-card')
      )
    )
  );
  if (needsScan) scanForLogger();
});
observer.observe(document.body, { childList: true, subtree: true });

inlineTimerInterval = setInterval(updateInlineTimers, 500);
scanForLogger();
