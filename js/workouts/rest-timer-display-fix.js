import "./rest-alarm-phase1.js?v=rest-authority-1";
import "./rest-alarm-button-stability.js?v=rest-authority-1";
import "./rest-timer-authority.js?v=rest-timer-authority-1";
import "../core/workout-theme-guardrail.js?v=workout-theme-guardrail-2";
import { openActiveWorkout } from "./workout-session.js?v=workout-source-stats-1";

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

function timerLocation(active) {
  const timer = active?.restTimer || {};
  const exerciseIndex = Number.isFinite(Number(timer.exerciseIndex))
    ? Number(timer.exerciseIndex)
    : Number(active?.currentExerciseIndex) || 0;

  if (timer.sourceType === 'warmup' && Number.isFinite(Number(timer.warmupIndex))) {
    return {
      exerciseIndex,
      sourceType: 'warmup',
      itemIndex: Number(timer.warmupIndex),
      rowSelector: `.session-warmup-row[data-warmup-index="${Number(timer.warmupIndex)}"]`
    };
  }

  const setIndex = Number.isFinite(Number(timer.setIndex))
    ? Number(timer.setIndex)
    : Number(active?.currentSetIndex) || 0;
  return {
    exerciseIndex,
    sourceType: 'working',
    itemIndex: setIndex,
    rowSelector: `.session-set-row[data-set-index="${setIndex}"]`
  };
}

function ensureTimerLine(logger, active) {
  const location = timerLocation(active);
  const selector = `.inline-rest-timer[data-exercise-index="${location.exerciseIndex}"][data-source-type="${location.sourceType}"][data-item-index="${location.itemIndex}"]`;
  let line = logger.querySelector(selector);
  if (line) return line;

  const card = logger.querySelector(`.session-exercise-card[data-exercise-index="${location.exerciseIndex}"]`);
  if (!card) return null;

  let row = card.querySelector(location.rowSelector);
  if (!row && location.sourceType === 'working') {
    const completed = [...card.querySelectorAll('.session-set-row.completed')];
    row = completed[completed.length - 1] || card.querySelector('.session-set-row');
  }
  if (!row && location.sourceType === 'warmup') {
    const completed = [...card.querySelectorAll('.session-warmup-row.completed')];
    row = completed[completed.length - 1] || card.querySelector('.session-warmup-row');
  }
  if (!row) return null;

  line = document.createElement('div');
  line.className = 'inline-rest-timer';
  line.dataset.exerciseIndex = String(location.exerciseIndex);
  line.dataset.sourceType = location.sourceType;
  line.dataset.itemIndex = String(location.itemIndex);
  row.insertAdjacentElement('afterend', line);
  return line;
}

function syncVisibleTimer() {
  const logger = document.getElementById('workout-session-logger');
  const active = getActive();

  // The global alarm banner is workout state, not logger DOM state. Keep it
  // visible across logger re-renders and page changes whenever a timer exists.
  const banner = document.getElementById('level-up-rest-alarm-banner');
  if (active?.restTimer && banner) banner.hidden = false;

  if (!logger) return;

  logger.querySelectorAll('.inline-rest-timer').forEach(line => {
    line.hidden = true;
    line.textContent = '';
  });

  const ms = remainingMs(active?.restTimer);
  if (!active?.restTimer || active.restTimer.status === 'finished' || ms <= 0) return;

  const line = ensureTimerLine(logger, active);
  if (!line) return;
  line.hidden = false;
  line.textContent = `${active.restTimer.status === 'paused' ? 'Paused · ' : ''}${formatSeconds(ms / 1000)}`;
}

function resumeActiveWorkoutFromAlert() {
  document.querySelector('.nav-btn[data-page="workout"]')?.click();
  setTimeout(() => {
    openActiveWorkout();
    syncVisibleTimer();
  }, 90);
}

setInterval(syncVisibleTimer, 250);
document.addEventListener('click', event => {
  if (event.target.closest('.complete-set-btn, .complete-warmup-btn, .exercise-rest-duration, .exercise-timer-enabled')) {
    setTimeout(syncVisibleTimer, 30);
  }
});
window.addEventListener('levelup:rest-timer-started', syncVisibleTimer);
window.addEventListener('levelup:rest-timer-finished', syncVisibleTimer);
window.addEventListener('levelup:rest-timer-dismissed', syncVisibleTimer);
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
