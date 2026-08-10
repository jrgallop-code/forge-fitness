import { openActiveWorkout, ACTIVE_WORKOUT_STORAGE_KEY } from './workout-session.js?v=workout-session-6';
import { getExerciseById } from './exercise-library.js?v=exercise-library-2';

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

function getRepRangeUpperBound(repTarget) {
  const values = String(repTarget || '')
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter(Number.isFinite) || [];
  return values.length ? Math.max(...values) : null;
}

function getRecommendedLoad(weight) {
  const current = Number(weight);
  if (!Number.isFinite(current) || current <= 0) return null;

  const lower = current * 1.02;
  const upper = current * 1.05;
  const increments = [5, 2.5, 1, 0.5];

  for (const increment of increments) {
    const candidate = Math.ceil((lower - 1e-9) / increment) * increment;
    if (candidate <= upper + 1e-9) {
      return Number(candidate.toFixed(1));
    }
  }

  return Number((Math.round(lower * 2) / 2).toFixed(1));
}

function formatLoad(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function updateProgressionPrompt(card, exerciseIndex) {
  const prompt = card.querySelector('.progression-prompt');
  if (!prompt) return;

  const active = getActive();
  const planned = active?.planSnapshot?.days?.[active.trainingDayIndex]?.exercises?.[exerciseIndex];
  const state = active?.exercises?.[exerciseIndex];
  const upperBound = getRepRangeUpperBound(planned?.reps);

  if (!active || !state || !upperBound || !Array.isArray(state.sets)) {
    prompt.hidden = true;
    return;
  }

  const qualifyingSets = state.sets.filter(set =>
    set?.completed &&
    Number(set.reps) >= upperBound &&
    Number(set.weight) > 0
  );

  if (!qualifyingSets.length) {
    prompt.hidden = true;
    return;
  }

  const qualifying = qualifyingSets.reduce((best, set) =>
    Number(set.weight) > Number(best.weight) ? set : best
  );
  const currentWeight = Number(qualifying.weight);
  const nextWeight = getRecommendedLoad(currentWeight);

  if (!nextWeight || nextWeight <= currentWeight) {
    prompt.hidden = true;
    return;
  }

  const increasePercent = ((nextWeight / currentWeight) - 1) * 100;
  const completedCount = state.sets.filter(set => set?.completed).length;
  const plannedCount = state.sets.length;

  prompt.innerHTML = `
    <span class="progression-arrow">↑</span>
    <div>
      <strong>Increase weight next session</strong>
      <p>You reached ${upperBound} reps at ${formatLoad(currentWeight)} lb${completedCount < plannedCount ? ` with ${completedCount} of ${plannedCount} sets completed` : ''}. Recommended next load: <b>${formatLoad(nextWeight)} lb</b> (+${increasePercent.toFixed(1)}%).</p>
      <small>Level Up recommendation: increase load by about 2–5% after reaching the top of your rep range.</small>
    </div>
  `;
  prompt.hidden = false;
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
      <p class="exercise-warmup-help">Adjust or skip any suggestion that does not feel appropriate. Calculated loads are rounded to practical 5 lb increments.</p>
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

function enhanceLogger(logger) {
  if (!logger) return;

  const initialEnhancement = logger.dataset.compactEnhanced !== 'true';
  const unenhancedCards = logger.querySelectorAll(
    '.session-exercise-card[data-tracking-type="reps"]:not([data-compact-card-enhanced="true"])'
  );

  if (!initialEnhancement && !unenhancedCards.length) return;

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
    headerActions.appendChild(warmupButton);

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

    card.querySelector('.session-target')?.classList.add('compact-target');
    card.querySelector('.previous-performance')?.remove();

    const progressionPrompt = document.createElement('div');
    progressionPrompt.className = 'progression-prompt';
    progressionPrompt.hidden = true;
    const target = card.querySelector('.session-target');
    if (target) target.insertAdjacentElement('afterend', progressionPrompt);
    else header.insertAdjacentElement('afterend', progressionPrompt);

    const setHeader = card.querySelector('.session-set-header');
    if (setHeader) {
      setHeader.innerHTML = '<span>Set</span><span>Previous</span><span>lbs</span><span>Reps</span><span>✓</span>';
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
            updateProgressionPrompt(card, exerciseIndex);
          }, 0);
        });
      }

      row.querySelector('.session-weight')?.addEventListener('input', () => {
        setTimeout(() => updateProgressionPrompt(card, exerciseIndex), 0);
      });
      row.querySelector('.session-reps')?.addEventListener('input', () => {
        setTimeout(() => updateProgressionPrompt(card, exerciseIndex), 0);
      });

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

    updateProgressionPrompt(card, exerciseIndex);
  });

  if (initialEnhancement) {
    logger.addEventListener('click', event => {
      if (!event.target.closest('.exercise-more-btn, .exercise-options-popover')) {
        logger.querySelectorAll('.exercise-options-popover').forEach(menu => menu.hidden = true);
      }
    });
  }

  updateInlineTimers();
}

function updateAddSetLabel(card, exerciseId) {
  const button = card.querySelector('.compact-add-set-btn');
  if (!button) return;
  const setting = getTimerSettings()[exerciseId] || { enabled: false, seconds: 120 };
  button.textContent = setting.enabled ? `+ Add Set (${formatSeconds(setting.seconds)})` : '+ Add Set';
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
