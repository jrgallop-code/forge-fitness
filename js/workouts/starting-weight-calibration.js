import { getExerciseById } from './exercise-library.js?v=exercise-library-3';
import { massUnit } from '../core/unit-system.js?v=unit-system-1';

const SESSION_STORAGE_KEY = 'forge_workout_sessions';
const STYLE_HREF = 'css/starting-weight-calibration.css?v=starting-weight-1';

let observer = null;
let activeCard = null;
let activeTargetInput = null;

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function ensureStyles() {
  if (document.querySelector('link[data-starting-weight-calibration-styles]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLE_HREF;
  link.dataset.startingWeightCalibrationStyles = '1';
  document.head.appendChild(link);
}

function findExercisePerformance(session, exerciseId) {
  const direct = (session?.exercises || []).find(item => item?.exerciseId === exerciseId);
  if (direct) return direct;

  const dayIndex = Number(session?.trainingDayIndex) || 0;
  const planned = session?.planSnapshot?.days?.[dayIndex]?.exercises || [];
  const index = planned.findIndex(item => item?.id === exerciseId);
  return index >= 0 ? session?.exercises?.[index] || null : null;
}

function hasPriorWeightedHistory(exerciseId) {
  const sessions = readJson(SESSION_STORAGE_KEY, []);
  if (!Array.isArray(sessions)) return false;

  return sessions.some(session => {
    const performance = findExercisePerformance(session, exerciseId);
    const sets = Array.isArray(performance?.sets) ? performance.sets : [];
    const sessionWasSaved = session?.status === 'completed' || Boolean(session?.completedAt);

    return sets.some(set => {
      const weight = Number(set?.weight);
      if (!Number.isFinite(weight) || weight <= 0) return false;
      return set?.completed === true || sessionWasSaved;
    });
  });
}

function isBodyweightOnly(exercise) {
  return String(exercise?.equipment || '').trim().toLowerCase() === 'bodyweight';
}

function cardIsEligible(card) {
  if (!card?.matches?.('.session-exercise-card[data-tracking-type="reps"]')) return false;
  const logger = card.closest('#workout-session-logger');
  if (!logger || logger.dataset.editingSessionId) return false;

  const exerciseId = card.dataset.exerciseId;
  const exercise = getExerciseById(exerciseId);
  if (!exercise || exercise.trackingType !== 'reps' || isBodyweightOnly(exercise)) return false;
  return !hasPriorWeightedHistory(exerciseId);
}

function hasCurrentWeight(card) {
  return [...card.querySelectorAll('.session-weight')]
    .some(input => String(input.value || '').trim() !== '');
}

function updateHelperVisibility(card) {
  const helper = card.querySelector('.starting-weight-helper');
  if (!helper) return;
  helper.hidden = !cardIsEligible(card) || hasCurrentWeight(card);
}

function decorateCard(card) {
  const existing = card.querySelector('.starting-weight-helper');

  if (!cardIsEligible(card)) {
    existing?.remove();
    return;
  }

  if (!existing) {
    const helper = document.createElement('div');
    helper.className = 'starting-weight-helper';
    helper.innerHTML = '<button class="starting-weight-helper-btn" type="button">Not sure? Find starting weight</button>';

    const previous = card.querySelector('.previous-performance');
    if (previous) previous.insertAdjacentElement('afterend', helper);
    else card.querySelector('.session-target')?.insertAdjacentElement('afterend', helper);

    if (!card.dataset.startingWeightHelperBound) {
      card.dataset.startingWeightHelperBound = '1';
      card.addEventListener('input', () => updateHelperVisibility(card));
    }
  }

  updateHelperVisibility(card);
}

function decorateLogger() {
  document
    .querySelectorAll('#workout-session-logger .session-exercise-card[data-tracking-type="reps"]')
    .forEach(decorateCard);
}

function getPracticalIncrement(exerciseId) {
  const exercise = getExerciseById(exerciseId);
  const equipment = String(exercise?.equipment || '').toLowerCase();
  if (equipment.includes('cable')) return 2.5;
  if (equipment.includes('dumbbell')) return 5;
  if (equipment.includes('barbell')) return 5;
  if (equipment.includes('machine')) return 5;
  return 5;
}

function roundToIncrement(value, increment) {
  return Number((Math.round(Number(value) / increment) * increment).toFixed(1));
}

function calculateSuggestion(testWeight, difficulty, exerciseId) {
  const current = Number(testWeight);
  if (!Number.isFinite(current) || current <= 0) return null;

  const increment = getPracticalIncrement(exerciseId);
  const multiplier = difficulty === 'too-light'
    ? 1.10
    : difficulty === 'too-heavy'
      ? 0.90
      : 1;

  let suggested = roundToIncrement(current * multiplier, increment);

  if (difficulty === 'too-light' && suggested <= current) {
    suggested = Number((suggested + increment).toFixed(1));
  }

  if (difficulty === 'too-heavy' && suggested >= current) {
    suggested = Number((suggested - increment).toFixed(1));
  }

  if (difficulty === 'too-heavy') suggested = Math.max(increment, suggested);
  else suggested = Math.max(increment, suggested);

  return {
    suggested,
    increment
  };
}

function formatLoad(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function ensureModal() {
  let backdrop = document.querySelector('.starting-weight-calibration-backdrop');
  if (backdrop) return backdrop;

  backdrop = document.createElement('div');
  backdrop.className = 'starting-weight-calibration-backdrop';
  backdrop.hidden = true;
  backdrop.innerHTML = `
    <section class="starting-weight-calibration-sheet" role="dialog" aria-modal="true" aria-labelledby="starting-weight-calibration-title">
      <div class="starting-weight-calibration-head">
        <div>
          <span class="eyebrow">STARTING WEIGHT</span>
          <h3 id="starting-weight-calibration-title">Find a starting weight</h3>
        </div>
        <button class="starting-weight-calibration-close" type="button" aria-label="Close">×</button>
      </div>
      <p class="starting-weight-calibration-copy">Use one light test set. Enter what you actually did, then tell Level Up how it felt.</p>
      <div class="starting-weight-calibration-fields">
        <label>Test weight (<span data-starting-weight-unit>${massUnit()}</span>)
          <input class="starting-weight-test-load" type="number" inputmode="decimal" min="0" step="0.5" placeholder="Weight">
        </label>
        <label>Test reps
          <input class="starting-weight-test-reps" type="number" inputmode="numeric" min="1" step="1" placeholder="Reps">
        </label>
      </div>
      <p class="starting-weight-calibration-question">How did that set feel?</p>
      <div class="starting-weight-difficulty" role="group" aria-label="Test set difficulty">
        <button type="button" data-starting-weight-difficulty="too-light">Too light<small>5+ reps left</small></button>
        <button type="button" data-starting-weight-difficulty="about-right">About right<small>1–3 reps left</small></button>
        <button type="button" data-starting-weight-difficulty="too-heavy">Too heavy<small>0 reps left</small></button>
      </div>
      <p class="starting-weight-calibration-message" aria-live="polite"></p>
      <div class="starting-weight-calibration-result" hidden>
        <span>Suggested starting weight</span>
        <strong data-starting-weight-result></strong>
        <div class="starting-weight-calibration-actions">
          <button class="primary-btn" type="button" data-use-starting-weight>Use this weight</button>
          <button class="secondary-btn" type="button" data-cancel-starting-weight>Cancel</button>
        </div>
      </div>
    </section>
  `;
  document.body.appendChild(backdrop);
  return backdrop;
}

function resetModal(modal) {
  modal.querySelector('.starting-weight-test-load').value = '';
  modal.querySelector('.starting-weight-test-reps').value = '';
  modal.querySelectorAll('[data-starting-weight-difficulty]').forEach(button => button.classList.remove('selected'));
  modal.querySelector('.starting-weight-calibration-message').textContent = '';
  modal.querySelector('.starting-weight-calibration-result').hidden = true;
  modal.querySelector('[data-starting-weight-result]').textContent = '';
  modal.querySelector('[data-use-starting-weight]').textContent = 'Use this weight';
  delete modal.dataset.suggestedLoad;
}

function openCalibration(card) {
  const exercise = getExerciseById(card.dataset.exerciseId);
  const targetInput = card.querySelector('.session-set-row .session-weight');
  if (!exercise || !targetInput || !cardIsEligible(card)) return;

  activeCard = card;
  activeTargetInput = targetInput;
  const modal = ensureModal();
  resetModal(modal);
  modal.querySelector('[data-starting-weight-unit]').textContent = massUnit();
  modal.querySelector('#starting-weight-calibration-title').textContent = `Find a starting weight · ${exercise.name}`;
  modal.hidden = false;
  document.body.classList.add('starting-weight-calibration-open');
  requestAnimationFrame(() => modal.querySelector('.starting-weight-test-load')?.focus());
}

function closeCalibration() {
  const modal = document.querySelector('.starting-weight-calibration-backdrop');
  if (modal) modal.hidden = true;
  document.body.classList.remove('starting-weight-calibration-open');
  activeCard = null;
  activeTargetInput = null;
}

function chooseDifficulty(button) {
  const modal = button.closest('.starting-weight-calibration-backdrop');
  if (!modal || !activeCard) return;

  const testWeight = Number(modal.querySelector('.starting-weight-test-load')?.value);
  const testReps = Number(modal.querySelector('.starting-weight-test-reps')?.value);
  const message = modal.querySelector('.starting-weight-calibration-message');
  const result = modal.querySelector('.starting-weight-calibration-result');

  if (!Number.isFinite(testWeight) || testWeight <= 0 || !Number.isFinite(testReps) || testReps <= 0) {
    message.textContent = 'Enter the test weight and reps first.';
    result.hidden = true;
    return;
  }

  const calculation = calculateSuggestion(testWeight, button.dataset.startingWeightDifficulty, activeCard.dataset.exerciseId);
  if (!calculation) return;

  modal.querySelectorAll('[data-starting-weight-difficulty]').forEach(item => item.classList.toggle('selected', item === button));
  message.textContent = '';
  modal.dataset.suggestedLoad = String(calculation.suggested);
  modal.querySelector('[data-starting-weight-result]').textContent = `${formatLoad(calculation.suggested)} lb`;
  modal.querySelector('[data-use-starting-weight]').textContent = `Use ${formatLoad(calculation.suggested)} lb`;
  result.hidden = false;
}

function applySuggestion(modal) {
  const suggested = Number(modal.dataset.suggestedLoad);
  if (!Number.isFinite(suggested) || !activeTargetInput || !activeTargetInput.isConnected) return;

  activeTargetInput.value = formatLoad(suggested);
  activeTargetInput.dispatchEvent(new Event('input', { bubbles: true }));
  activeTargetInput.dispatchEvent(new Event('change', { bubbles: true }));
  updateHelperVisibility(activeCard);
  closeCalibration();
}

function handleClick(event) {
  const helperButton = event.target.closest('.starting-weight-helper-btn');
  if (helperButton) {
    const card = helperButton.closest('.session-exercise-card');
    if (card) openCalibration(card);
    return;
  }

  const modal = event.target.closest('.starting-weight-calibration-backdrop');
  if (!modal) return;

  if (event.target === modal || event.target.closest('.starting-weight-calibration-close,[data-cancel-starting-weight]')) {
    closeCalibration();
    return;
  }

  const difficulty = event.target.closest('[data-starting-weight-difficulty]');
  if (difficulty) {
    chooseDifficulty(difficulty);
    return;
  }

  if (event.target.closest('[data-use-starting-weight]')) applySuggestion(modal);
}

function initializeStartingWeightCalibration() {
  ensureStyles();
  document.addEventListener('click', handleClick);
  decorateLogger();

  observer = new MutationObserver(() => decorateLogger());
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.body) initializeStartingWeightCalibration();
else document.addEventListener('DOMContentLoaded', initializeStartingWeightCalibration, { once: true });
