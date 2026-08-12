import { openActiveWorkout, ACTIVE_WORKOUT_STORAGE_KEY } from './workout-session.js?v=workout-session-6';
import { getAllExercises, getExerciseById } from './exercise-library.js?v=exercise-library-catalogue-2';

function readActiveWorkout() {
  try {
    const active = JSON.parse(localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY) || 'null');
    return active?.status === 'in_progress' ? active : null;
  } catch {
    return null;
  }
}

function saveActiveWorkout(active) {
  if (!active) return;
  active.updatedAt = new Date().toISOString();
  localStorage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(active));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getCurrentExercise(card) {
  return getExerciseById(card?.dataset?.exerciseId || '');
}

function hasEnteredData(state) {
  if (!state) return false;
  if (state.trackingType === 'notes') {
    return Boolean(Number(state.durationMinutes) > 0 || String(state.distance || '').trim() || String(state.notes || '').trim());
  }
  return (state.sets || []).some(set => Number(set?.weight) > 0 || Number(set?.reps) > 0 || set?.completed);
}

function createReplacementState(exercise, priorState) {
  if (exercise?.trackingType === 'notes') {
    return { exerciseId: exercise.id, trackingType: 'notes', durationMinutes: null, distance: '', notes: '', sets: [] };
  }
  const setCount = Math.max(1, Number(priorState?.sets?.length) || 1);
  return { exerciseId: exercise.id, trackingType: 'reps', sets: Array.from({ length: setCount }, () => ({ weight: null, reps: null, completed: false })) };
}

function getEligibleExercises(currentExercise) {
  const trackingType = currentExercise?.trackingType || 'reps';
  return getAllExercises()
    .filter(exercise => exercise?.id && exercise.id !== currentExercise?.id)
    .filter(exercise => (exercise.trackingType || 'reps') === trackingType)
    .sort((a, b) => {
      const aSame = a.muscleGroup === currentExercise?.muscleGroup ? 0 : 1;
      const bSame = b.muscleGroup === currentExercise?.muscleGroup ? 0 : 1;
      return aSame - bSame || String(a.name).localeCompare(String(b.name));
    });
}

function buildSwapOptions(currentExercise) {
  const choices = getEligibleExercises(currentExercise);
  const sameGroup = choices.filter(item => item.muscleGroup === currentExercise?.muscleGroup);
  const others = choices.filter(item => item.muscleGroup !== currentExercise?.muscleGroup);
  const renderOptions = items => items.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} · ${escapeHtml(item.equipment || '')}</option>`).join('');
  return `${sameGroup.length ? `<optgroup label="${escapeHtml(currentExercise?.muscleGroup || 'Similar')} options">${renderOptions(sameGroup)}</optgroup>` : ''}${others.length ? `<optgroup label="Other exercises">${renderOptions(others)}</optgroup>` : ''}`;
}

function closeSwapSheet(sheet) {
  if (!sheet) return;
  sheet.hidden = true;
  sheet.dataset.exerciseIndex = '';
}

function ensureSwapSheet(logger) {
  let sheet = logger.querySelector('#session-exercise-swap-sheet');
  if (sheet) return sheet;
  sheet = document.createElement('div');
  sheet.id = 'session-exercise-swap-sheet';
  sheet.className = 'session-exercise-swap-sheet';
  sheet.hidden = true;
  sheet.innerHTML = `<div class="session-exercise-swap-panel" role="dialog" aria-modal="true" aria-labelledby="session-swap-title"><div class="session-swap-heading"><div><span class="eyebrow">TODAY ONLY</span><h4 id="session-swap-title">Swap Exercise</h4></div><button class="session-swap-close" type="button" aria-label="Close swap exercise">×</button></div><p class="session-swap-note">Your saved workout plan will not be changed.</p><label class="session-swap-field"><span>Replace with</span><select class="session-swap-select"></select></label><div class="session-swap-actions"><button class="secondary-btn session-swap-cancel" type="button">Cancel</button><button class="primary-btn session-swap-confirm" type="button">Swap for Today</button></div></div>`;
  logger.appendChild(sheet);
  const close = () => closeSwapSheet(sheet);
  sheet.querySelector('.session-swap-close')?.addEventListener('click', close);
  sheet.querySelector('.session-swap-cancel')?.addEventListener('click', close);
  sheet.addEventListener('click', event => { if (event.target === sheet) close(); });
  sheet.querySelector('.session-swap-confirm')?.addEventListener('click', () => applySwap(sheet));
  return sheet;
}

function openSwapSheet(card, logger) {
  const active = readActiveWorkout();
  if (!active) return;
  const exerciseIndex = Number(card.dataset.exerciseIndex);
  const currentExercise = getCurrentExercise(card);
  if (!Number.isInteger(exerciseIndex) || !currentExercise) return;
  const sheet = ensureSwapSheet(logger);
  const select = sheet.querySelector('.session-swap-select');
  const title = sheet.querySelector('#session-swap-title');
  sheet.dataset.exerciseIndex = String(exerciseIndex);
  if (title) title.textContent = `Swap ${currentExercise.name}`;
  if (select) select.innerHTML = buildSwapOptions(currentExercise);
  sheet.hidden = false;
  select?.focus();
}

function applySwap(sheet) {
  const active = readActiveWorkout();
  const exerciseIndex = Number(sheet?.dataset?.exerciseIndex);
  const replacementId = sheet?.querySelector('.session-swap-select')?.value;
  if (!active || !Number.isInteger(exerciseIndex) || !replacementId) return;
  const dayIndex = Number(active.trainingDayIndex) || 0;
  const day = active.planSnapshot?.days?.[dayIndex];
  const plannedExercise = day?.exercises?.[exerciseIndex];
  const priorState = active.exercises?.[exerciseIndex];
  const replacement = getExerciseById(replacementId);
  if (!plannedExercise || !priorState || !replacement) return;
  if (hasEnteredData(priorState)) {
    const confirmed = window.confirm('Swapping this exercise will clear the data already entered for it today. Continue?');
    if (!confirmed) return;
  }
  plannedExercise.id = replacement.id;
  active.exercises[exerciseIndex] = createReplacementState(replacement, priorState);
  active.currentExerciseIndex = exerciseIndex;
  active.currentSetIndex = 0;
  saveActiveWorkout(active);
  closeSwapSheet(sheet);
  openActiveWorkout();
}

function removeExerciseForToday(card) {
  const active = readActiveWorkout();
  if (!active) return;
  const exerciseIndex = Number(card.dataset.exerciseIndex);
  const dayIndex = Number(active.trainingDayIndex) || 0;
  const day = active.planSnapshot?.days?.[dayIndex];
  if (!Number.isInteger(exerciseIndex) || !day?.exercises?.[exerciseIndex]) return;
  if ((day.exercises || []).length <= 1) {
    window.alert('Keep at least one exercise in the active workout.');
    return;
  }
  const exerciseName = getExerciseById(day.exercises[exerciseIndex].id)?.name || 'this exercise';
  const confirmed = window.confirm(`Remove ${exerciseName} from today's workout only? Your saved plan will stay unchanged.`);
  if (!confirmed) return;
  day.exercises.splice(exerciseIndex, 1);
  active.exercises.splice(exerciseIndex, 1);
  active.currentExerciseIndex = Math.min(exerciseIndex, day.exercises.length - 1);
  active.currentSetIndex = 0;
  saveActiveWorkout(active);
  openActiveWorkout();
}

function ensureActionMenu(card, logger) {
  if (card.dataset.sessionActionsEnhanced === 'true' || logger.dataset.editingSessionId) return;
  const current = getCurrentExercise(card);
  if (!current) return;
  let menu = card.querySelector('.exercise-options-popover');
  if (!menu) {
    if ((card.dataset.trackingType || 'reps') === 'reps') return;
    const heading = card.querySelector('h4');
    if (!heading) return;
    let header = heading.closest('.compact-exercise-header');
    if (!header) {
      header = document.createElement('div');
      header.className = 'compact-exercise-header';
      heading.parentNode.insertBefore(header, heading);
      header.appendChild(heading);
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'exercise-more-btn';
    button.setAttribute('aria-label', 'Exercise options');
    button.textContent = '•••';
    menu = document.createElement('div');
    menu.className = 'exercise-options-popover';
    menu.hidden = true;
    header.append(button, menu);
    button.addEventListener('click', event => { event.stopPropagation(); menu.hidden = !menu.hidden; });
  }
  const actions = document.createElement('div');
  actions.className = 'session-exercise-actions';
  actions.innerHTML = `<button class="session-swap-exercise" type="button">Swap Exercise</button><button class="session-remove-exercise" type="button">Remove for Today</button>`;
  menu.appendChild(actions);
  actions.querySelector('.session-swap-exercise')?.addEventListener('click', event => { event.stopPropagation(); menu.hidden = true; openSwapSheet(card, logger); });
  actions.querySelector('.session-remove-exercise')?.addEventListener('click', event => { event.stopPropagation(); menu.hidden = true; removeExerciseForToday(card); });
  card.dataset.sessionActionsEnhanced = 'true';
}

function enhanceActiveLogger() {
  const logger = document.getElementById('workout-session-logger');
  if (!logger || logger.dataset.editingSessionId || !readActiveWorkout()) return;
  logger.querySelectorAll('.session-exercise-card').forEach(card => ensureActionMenu(card, logger));
}

const observer = new MutationObserver(mutations => {
  if (mutations.some(mutation => [...mutation.addedNodes].some(node => node.nodeType === 1 && (node.id === 'workout-session-logger' || node.matches?.('.session-exercise-card, .exercise-options-popover') || node.querySelector?.('#workout-session-logger, .session-exercise-card, .exercise-options-popover'))))) {
    setTimeout(enhanceActiveLogger, 0);
  }
});
observer.observe(document.body, { childList: true, subtree: true });
document.addEventListener('click', event => { if (event.target.closest('#begin-session-btn')) setTimeout(enhanceActiveLogger, 50); });
enhanceActiveLogger();
