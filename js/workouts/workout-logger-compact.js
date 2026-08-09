import { openActiveWorkout, ACTIVE_WORKOUT_STORAGE_KEY } from './workout-session.js?v=workout-session-4';

const TIMER_SETTINGS_KEY = 'level_up_exercise_rest_settings';

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

function enhanceLogger() {
  const logger = document.getElementById('workout-session-logger');
  if (!logger || logger.dataset.compactEnhanced === 'true') return;
  logger.dataset.compactEnhanced = 'true';

  logger.querySelector('.rest-timer-panel')?.remove();

  logger.querySelectorAll('.session-exercise-card[data-tracking-type="reps"]').forEach(card => {
    const exerciseIndex = Number(card.dataset.exerciseIndex);
    const exerciseId = card.dataset.exerciseId || `exercise-${exerciseIndex}`;
    const heading = card.querySelector('h4');
    if (!heading) return;

    const header = document.createElement('div');
    header.className = 'compact-exercise-header';
    heading.parentNode.insertBefore(header, heading);
    header.appendChild(heading);

    const menuButton = document.createElement('button');
    menuButton.type = 'button';
    menuButton.className = 'exercise-more-btn';
    menuButton.setAttribute('aria-label', 'Exercise options');
    menuButton.textContent = '•••';
    header.appendChild(menuButton);

    const menu = document.createElement('div');
    menu.className = 'exercise-options-popover';
    menu.hidden = true;
    const settings = getTimerSettings();
    const current = settings[exerciseId] || { enabled: false, seconds: 120 };
    menu.innerHTML = `
      <div class="exercise-option-row">
        <span>Rest timer</span>
        <label class="compact-switch">
          <input type="checkbox" class="exercise-timer-enabled" ${current.enabled ? 'checked' : ''}>
          <span></span>
        </label>
      </div>
      <label class="exercise-duration-row">
        <span>Duration</span>
        <select class="exercise-rest-duration">
          <option value="60" ${current.seconds === 60 ? 'selected' : ''}>1:00</option>
          <option value="90" ${current.seconds === 90 ? 'selected' : ''}>1:30</option>
          <option value="120" ${current.seconds === 120 ? 'selected' : ''}>2:00</option>
          <option value="180" ${current.seconds === 180 ? 'selected' : ''}>3:00</option>
        </select>
      </label>
    `;
    header.appendChild(menu);

    menuButton.addEventListener('click', event => {
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
    };
    timerToggle?.addEventListener('change', persistSetting);
    timerDuration?.addEventListener('change', persistSetting);

    card.querySelector('.session-target')?.classList.add('compact-target');
    card.querySelector('.previous-performance')?.remove();

    const rows = [...card.querySelectorAll('.session-set-row')];
    rows.forEach(row => {
      const setIndex = Number(row.dataset.setIndex);
      const complete = row.querySelector('.complete-set-btn');
      if (complete) {
        complete.textContent = row.classList.contains('completed') ? '✓' : '✓';
        complete.setAttribute('aria-label', `Complete set ${setIndex + 1}`);
      }

      const timerLine = document.createElement('div');
      timerLine.className = 'inline-rest-timer';
      timerLine.dataset.exerciseIndex = String(exerciseIndex);
      timerLine.dataset.setIndex = String(setIndex);
      timerLine.hidden = true;
      row.insertAdjacentElement('afterend', timerLine);

      complete?.addEventListener('click', () => {
        setTimeout(() => {
          const active = getActive();
          if (!active) return;
          const all = getTimerSettings();
          const setting = all[exerciseId] || { enabled: false, seconds: 120 };
          active.currentExerciseIndex = exerciseIndex;
          active.currentSetIndex = setIndex;
          if (setting.enabled && row.classList.contains('completed')) {
            const seconds = Number(setting.seconds) || 120;
            active.restTimer = {
              status: 'running',
              durationSeconds: seconds,
              endAt: new Date(Date.now() + seconds * 1000).toISOString(),
              remainingMs: seconds * 1000,
              notified: false
            };
          } else {
            active.restTimer = null;
          }
          saveActive(active);
          updateInlineTimers();
        }, 0);
      });
    });

    if (!logger.dataset.editingSessionId) {
      const addSet = document.createElement('button');
      addSet.type = 'button';
      addSet.className = 'compact-add-set-btn';
      const timerSetting = current.enabled ? ` (${formatSeconds(current.seconds)})` : '';
      addSet.textContent = `+ Add Set${timerSetting}`;
      card.appendChild(addSet);
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

  document.addEventListener('click', closeMenus, { once: true });
  updateInlineTimers();
}

function closeMenus() {
  document.querySelectorAll('.exercise-options-popover').forEach(menu => menu.hidden = true);
}

function updateInlineTimers() {
  const active = getActive();
  document.querySelectorAll('.inline-rest-timer').forEach(line => {
    line.hidden = true;
    line.textContent = '';
  });
  if (!active?.restTimer) return;

  let remainingMs = Number(active.restTimer.remainingMs) || 0;
  if (active.restTimer.status === 'running' && active.restTimer.endAt) {
    remainingMs = Math.max(0, new Date(active.restTimer.endAt).getTime() - Date.now());
  }
  if (remainingMs <= 0) return;

  const selector = `.inline-rest-timer[data-exercise-index="${active.currentExerciseIndex}"][data-set-index="${active.currentSetIndex}"]`;
  const line = document.querySelector(selector);
  if (!line) return;
  line.hidden = false;
  line.textContent = formatSeconds(remainingMs / 1000);
}

const observer = new MutationObserver(enhanceLogger);
observer.observe(document.body, { childList: true, subtree: true });
setInterval(updateInlineTimers, 500);
enhanceLogger();
