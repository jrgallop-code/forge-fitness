const ACTIVE_WORKOUT_STORAGE_KEY = 'level_up_active_workout';

function ensureWorkoutModeStyles() {
  if (document.querySelector('link[data-workout-mode-styles]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/workout-mode.css?v=standalone-workout-mode-1';
  link.dataset.workoutModeStyles = 'true';
  document.head.appendChild(link);
}

function hasActiveWorkout() {
  try {
    const active = JSON.parse(localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY) || 'null');
    return active?.status === 'in_progress';
  } catch {
    return false;
  }
}

function handleWorkoutModeBack() {
  const mode = document.getElementById('levelup-workout-mode');
  if (!mode) return;

  const guideBack = mode.querySelector('.exercise-guide-screen .exercise-guide-back');
  if (guideBack) {
    guideBack.click();
    return;
  }

  closeWorkoutMode();
}

function ensureWorkoutMode() {
  ensureWorkoutModeStyles();
  let mode = document.getElementById('levelup-workout-mode');
  if (mode) return mode;

  mode = document.createElement('section');
  mode.id = 'levelup-workout-mode';
  mode.hidden = true;
  mode.setAttribute('aria-label', 'Workout logger');
  mode.innerHTML = `
    <div id="levelup-workout-mode-content" class="workout-page levelup-workout-mode-page"></div>
  `;
  document.body.appendChild(mode);
  return mode;
}

function openWorkoutMode(logger) {
  if (!logger || logger.dataset.editingSessionId) return;
  const mode = ensureWorkoutMode();
  const content = mode.querySelector('#levelup-workout-mode-content');
  if (!content || logger.parentElement === content) return;

  content.replaceChildren(logger);
  mode.hidden = false;
  document.body.classList.add('levelup-workout-mode-active');
  mode.scrollTop = 0;
}

function closeWorkoutMode() {
  const mode = document.getElementById('levelup-workout-mode');
  if (!mode) return;

  mode.querySelector('.exercise-guide-screen')?.remove();
  mode.querySelector('#workout-session-logger')?.remove();
  mode.hidden = true;
  document.body.classList.remove('levelup-workout-mode-active');

  const destination = hasActiveWorkout()
    ? document.querySelector('.active-workout-banner, [data-active-workout-banner]')
    : document.querySelector('[data-workout-home], .workout-page:not(.levelup-workout-mode-page)');
  destination?.scrollIntoView({ block: 'start' });
}

function syncWorkoutMode() {
  const logger = document.getElementById('workout-session-logger');
  const mode = document.getElementById('levelup-workout-mode');

  if (logger && !logger.dataset.editingSessionId) {
    openWorkoutMode(logger);
    return;
  }

  if (mode && !logger && !mode.hidden) {
    mode.hidden = true;
    document.body.classList.remove('levelup-workout-mode-active');
  }
}

const observer = new MutationObserver(() => requestAnimationFrame(syncWorkoutMode));
observer.observe(document.body, { childList: true, subtree: true });

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !document.getElementById('levelup-workout-mode')?.hidden) {
    handleWorkoutModeBack();
  }
});

document.addEventListener('click', event => {
  const navButton = event.target.closest?.('.bottom-nav .nav-btn');
  if (!navButton || navButton.dataset.page === 'workout') return;
  const mode = document.getElementById('levelup-workout-mode');
  if (mode && !mode.hidden) closeWorkoutMode();
}, true);

ensureWorkoutModeStyles();
syncWorkoutMode();
