import "./rest-alarm-phase1.js?v=rest-alarm-phase1-1";
import "./rest-alarm-button-stability.js?v=rest-alarm-global-top-2";
import { openActiveWorkout } from "./workout-session.js?v=workout-session-6";

const ACTIVE_WORKOUT_STORAGE_KEY = 'level_up_active_workout';

function getActive() {
  try {
    const value = JSON.parse(localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY) || 'null');
    return value && value.status === 'in_progress' ? value : null;
  } catch {
    return null;
  }
}

function formatSeconds(seconds) {
  const value = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(value / 60);
  const secs = value % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function remainingMs(timer) {
  if (!timer) return 0;
  if (timer.status === 'running' && timer.endAt) {
    return Math.max(0, new Date(timer.endAt).getTime() - Date.now());
  }
  return Math.max(0, Number(timer.remainingMs) || 0);
}

function ensureTimerLine(logger, active) {
  const exerciseIndex = Number(active.currentExerciseIndex);
  const setIndex = Number(active.currentSetIndex);

  let line = logger.querySelector(`.inline-rest-timer[data-exercise-index="${exerciseIndex}"][data-set-index="${setIndex}"]`);
  if (line) return line;

  const card = logger.querySelector(`.session-exercise-card[data-exercise-index="${exerciseIndex}"]`);
  if (!card) return null;

  let row = card.querySelector(`.session-set-row[data-set-index="${setIndex}"]`);
  if (!row) {
    const completed = [...card.querySelectorAll('.session-set-row.completed')];
    row = completed[completed.length - 1] || card.querySelector('.session-set-row');
  }
  if (!row) return null;

  line = document.createElement('div');
  line.className = 'inline-rest-timer';
  line.dataset.exerciseIndex = String(exerciseIndex);
  line.dataset.setIndex = String(setIndex);
  row.insertAdjacentElement('afterend', line);
  return line;
}

function syncVisibleTimer() {
  const logger = document.getElementById('workout-session-logger');
  if (!logger) return;

  const active = getActive();
  logger.querySelectorAll('.inline-rest-timer').forEach(line => {
    line.hidden = true;
    line.textContent = '';
  });

  const ms = remainingMs(active?.restTimer);
  if (!active?.restTimer || ms <= 0) return;

  const line = ensureTimerLine(logger, active);
  if (!line) return;
  line.hidden = false;
  line.textContent = formatSeconds(ms / 1000);
}

function resumeActiveWorkoutFromAlert() {
  document.querySelector('.nav-btn[data-page="workout"]')?.click();
  setTimeout(() => {
    openActiveWorkout();
    syncVisibleTimer();
  }, 90);
}

// The core timer remains the source of truth. This small display sync only
// ensures the countdown is visible even if a logger enhancement rendered late.
setInterval(syncVisibleTimer, 250);
document.addEventListener('click', event => {
  if (event.target.closest('.complete-set-btn, .exercise-rest-duration, .exercise-timer-enabled')) {
    setTimeout(syncVisibleTimer, 30);
  }
});
window.addEventListener('focus', syncVisibleTimer);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) syncVisibleTimer();
});
navigator.serviceWorker?.addEventListener('message', event => {
  if (event.data?.type !== 'levelup:open-active-workout') return;
  resumeActiveWorkoutFromAlert();
});

const resumeFromLaunch = new URLSearchParams(window.location.search).get('resumeWorkout') === '1';
if (resumeFromLaunch) {
  const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`;
  window.history.replaceState({}, '', cleanUrl);
  setTimeout(resumeActiveWorkoutFromAlert, 180);
}

syncVisibleTimer();