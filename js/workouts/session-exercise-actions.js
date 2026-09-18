import { openActiveWorkout, ACTIVE_WORKOUT_STORAGE_KEY } from './workout-session.js?v=equipment-profiles-1';
import './exercise-library-expansion.js?v=exercise-library-expansion-1';
import { addCustomExercise, getAllExercises, getExerciseById } from './exercise-library.js?v=exercise-library-catalogue-2';
import { createGeneratedExerciseGuide } from './exercise-guide-generator.js?v=full-library-guides-1';
import { movementForExercise, prioritizeMovementMatches } from './smart-swap-priority.js?v=smart-swap-movement-priority-1';
import { matchesExerciseBrowser, renderCustomExerciseFields, renderMuscleCarousel } from './exercise-browser.js?v=isolated-carousel-1';

const SPECIAL_MUSCLE_PROFILES = {
  'barbell-bench-press': { primary: ['Chest'], secondary: ['Triceps', 'Front Delts'] },
  'pull-up': { primary: ['Lats'], secondary: ['Upper Back', 'Biceps', 'Forearms'] },
  'barbell-row': { primary: ['Lats', 'Upper Back'], secondary: ['Rear Delts', 'Biceps', 'Spinal Erectors'] },
  'back-squat': { primary: ['Quads', 'Glutes'], secondary: ['Adductors', 'Spinal Erectors'] },
  'conventional-deadlift': { primary: ['Glutes', 'Hamstrings'], secondary: ['Spinal Erectors', 'Upper Back', 'Forearms'] },
  plank: { primary: ['Deep Core'], secondary: ['Rectus Abdominis', 'Obliques'] },
  'side-plank': { primary: ['Obliques'], secondary: ['Deep Core'] },
  'dead-bug': { primary: ['Deep Core'], secondary: ['Rectus Abdominis'] },
  'bird-dog': { primary: ['Deep Core'], secondary: ['Obliques', 'Spinal Erectors'] },
  'cable-crunch': { primary: ['Rectus Abdominis'], secondary: ['Obliques'] },
  'pallof-press': { primary: ['Obliques', 'Deep Core'], secondary: [] },
  'hanging-knee-raise': { primary: ['Rectus Abdominis'], secondary: ['Obliques'] },
  'ab-wheel-rollout': { primary: ['Rectus Abdominis'], secondary: ['Deep Core', 'Obliques'] }
};

const PLAN_STORAGE_KEY = 'forge_workout_plans';

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
  const profile = getMuscleProfile(exercise);
  const metadata = {
    name: exercise.name,
    exerciseName: exercise.name,
    muscleGroup: exercise.muscleGroup || '',
    type: exercise.type || '',
    equipment: exercise.equipment || '',
    primaryMuscles: [...profile.primary],
    secondaryMuscles: [...profile.secondary]
  };
  if (exercise?.trackingType === 'notes') {
    return { exerciseId: exercise.id, ...metadata, trackingType: 'notes', durationMinutes: null, distance: '', rpe: null, notes: '', sets: [] };
  }
  const setCount = Math.max(1, Number(priorState?.sets?.length) || 1);
  return {
    exerciseId: exercise.id,
    ...metadata,
    trackingType: 'reps',
    notes: '',
    sets: Array.from({ length: setCount }, () => ({ weight: null, reps: null, rir: null, completed: false }))
  };
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

function getMuscleProfile(exercise) {
  if (!exercise) return { primary: [], secondary: [] };
  const special = SPECIAL_MUSCLE_PROFILES[exercise.id];
  if (special) return special;
  const generated = createGeneratedExerciseGuide(exercise);
  if (generated?.primary?.length || generated?.secondary?.length) {
    return {
      primary: Array.isArray(generated.primary) ? generated.primary : [],
      secondary: Array.isArray(generated.secondary) ? generated.secondary : []
    };
  }
  return {
    primary: exercise.muscleGroup && exercise.muscleGroup !== 'Cardio' ? [exercise.muscleGroup] : [],
    secondary: []
  };
}

function profileExercise(exercise) {
  const muscles = getMuscleProfile(exercise);
  return {
    ...muscles,
    movement: movementForExercise(exercise),
    type: exercise?.type || '',
    muscleGroup: exercise?.muscleGroup || '',
    equipment: exercise?.equipment || '',
    trackingType: exercise?.trackingType || 'reps'
  };
}

function overlapCount(source = [], target = []) {
  const targetSet = new Set(target);
  return source.filter(item => targetSet.has(item)).length;
}

function scoreSmartSwap(currentExercise, candidate) {
  const current = profileExercise(currentExercise);
  const next = profileExercise(candidate);
  const reasons = [];
  let score = 0;

  if (current.muscleGroup === 'Cardio' && next.muscleGroup === 'Cardio') {
    score = 72;
    reasons.push('Same cardio role');
    if (current.equipment && next.equipment && current.equipment !== next.equipment) {
      score += 12;
      reasons.push('Different equipment');
    }
    return { score: Math.min(99, Math.round(score)), reasons };
  }

  const primaryMatches = overlapCount(current.primary, next.primary);
  const primaryAsSecondary = overlapCount(current.primary, next.secondary);
  const secondaryMatches = overlapCount(current.secondary, [...next.primary, ...next.secondary]);
  const primaryCoverage = current.primary.length ? primaryMatches / current.primary.length : 0;
  const primaryPartialCoverage = current.primary.length ? primaryAsSecondary / current.primary.length : 0;
  const secondaryCoverage = current.secondary.length ? secondaryMatches / current.secondary.length : 0;

  score += primaryCoverage * 42;
  score += primaryPartialCoverage * 10;
  score += secondaryCoverage * 10;

  if (primaryCoverage >= 1 && current.primary.length) reasons.push('Same primary muscles');
  else if (primaryCoverage > 0) reasons.push('Shared primary muscle');
  else if (primaryPartialCoverage > 0) reasons.push('Similar muscle target');

  if (current.movement && current.movement === next.movement) {
    score += 24;
    reasons.push('Similar movement');
  }

  if (current.type && current.type === next.type) score += 6;
  if (current.muscleGroup && current.muscleGroup === next.muscleGroup) score += 8;

  if (current.equipment && next.equipment && current.equipment !== next.equipment) {
    score += 8;
    reasons.push('Different equipment');
  } else if (current.equipment && next.equipment && current.equipment === next.equipment) {
    score -= 4;
  }

  if (!primaryMatches && current.primary.length && next.primary.length) score -= 18;

  return {
    score: Math.max(0, Math.min(99, Math.round(score))),
    reasons: [...new Set(reasons)].slice(0, 3)
  };
}

function getSmartRecommendations(currentExercise, active, exerciseIndex) {
  const dayIndex = Number(active?.trainingDayIndex) || 0;
  const dayExercises = active?.planSnapshot?.days?.[dayIndex]?.exercises || [];
  const otherPlannedIds = new Set(dayExercises
    .map((item, index) => index === exerciseIndex ? null : item?.id)
    .filter(Boolean));

  const scored = getEligibleExercises(currentExercise)
    .filter(candidate => !otherPlannedIds.has(candidate.id))
    .map(candidate => ({ candidate, ...scoreSmartSwap(currentExercise, candidate) }))
    .filter(item => item.score >= 45);

  const ranked = prioritizeMovementMatches(currentExercise, scored);

  return ranked.slice(0, 3);
}

function smartMatchLabel(score) {
  if (score >= 90) return 'Best match';
  if (score >= 75) return 'Strong match';
  return 'Similar target';
}

function renderSmartRecommendations(currentExercise, active, exerciseIndex) {
  const recommendations = getSmartRecommendations(currentExercise, active, exerciseIndex);
  if (!recommendations.length) {
    return '<p class="session-smart-empty">No close smart matches found. Choose another exercise manually below.</p>';
  }

  return recommendations.map(({ candidate, score, reasons }) => `
    <button class="session-smart-option" type="button" data-smart-swap-id="${escapeHtml(candidate.id)}">
      <span class="session-smart-option-main">
        <strong>${escapeHtml(candidate.name)}</strong>
        <small>${escapeHtml(candidate.equipment || 'Exercise')}</small>
      </span>
      <span class="session-smart-option-score"><b>${score}%</b><small>${smartMatchLabel(score)}</small></span>
      <span class="session-smart-option-reasons">${reasons.map(reason => `<em>${escapeHtml(reason)}</em>`).join('')}</span>
    </button>
  `).join('');
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
  sheet.innerHTML = `
    <div class="session-exercise-swap-panel" role="dialog" aria-modal="true" aria-labelledby="session-swap-title">
      <div class="session-swap-heading">
        <div>
          <span class="eyebrow">TODAY ONLY</span>
          <h4 id="session-swap-title">Swap Exercise</h4>
        </div>
        <button class="session-swap-close" type="button" aria-label="Close swap exercise">×</button>
      </div>
      <p class="session-swap-note">Equipment busy? Smart Swap finds close alternatives while keeping your saved plan untouched.</p>
      <section class="session-smart-swap" aria-labelledby="session-smart-title">
        <div class="session-smart-header">
          <div>
            <span class="session-smart-kicker">SMART SWAP</span>
            <h5 id="session-smart-title">Best alternatives</h5>
          </div>
          <small>Same training goal</small>
        </div>
        <div class="session-smart-options"></div>
      </section>
      <div class="session-manual-swap">
        <span class="session-manual-label">CHOOSE ANOTHER MANUALLY</span>
        <button class="secondary-btn session-swap-browse" type="button">Choose Your Own</button>
      </div>
      <div class="session-swap-actions">
        <button class="secondary-btn session-remove-today" type="button">Remove for Today</button>
      </div>
      <button class="session-swap-cancel" type="button">Cancel</button>
    </div>`;
  logger.appendChild(sheet);

  const close = () => closeSwapSheet(sheet);
  sheet.querySelector('.session-swap-close')?.addEventListener('click', close);
  sheet.querySelector('.session-swap-cancel')?.addEventListener('click', close);
  sheet.addEventListener('click', event => { if (event.target === sheet) close(); });
  sheet.querySelector('.session-swap-browse')?.addEventListener('click', () => {
    const exerciseIndex = Number(sheet.dataset.exerciseIndex);
    if (!Number.isInteger(exerciseIndex)) return;
    closeSwapSheet(sheet);
    openAddExerciseSheet(logger, { mode: 'swap', exerciseIndex });
  });
  sheet.querySelector('.session-remove-today')?.addEventListener('click', () => removeExerciseForToday(sheet));
  sheet.querySelector('.session-smart-options')?.addEventListener('click', event => {
    const button = event.target.closest('[data-smart-swap-id]');
    if (!button) return;
    applyReplacement(sheet, button.dataset.smartSwapId);
  });
  return sheet;
}

function openSwapSheet(card, logger) {
  const active = readActiveWorkout();
  if (!active) return;
  const exerciseIndex = Number(card.dataset.exerciseIndex);
  const currentExercise = getCurrentExercise(card);
  if (!Number.isInteger(exerciseIndex) || !currentExercise) return;

  const sheet = ensureSwapSheet(logger);
  const title = sheet.querySelector('#session-swap-title');
  const smartOptions = sheet.querySelector('.session-smart-options');
  sheet.dataset.exerciseIndex = String(exerciseIndex);
  if (title) title.textContent = `Swap ${currentExercise.name}`;
  if (smartOptions) smartOptions.innerHTML = renderSmartRecommendations(currentExercise, active, exerciseIndex);
  sheet.hidden = false;
}

function applyReplacement(sheet, replacementId) {
  const active = readActiveWorkout();
  const exerciseIndex = Number(sheet?.dataset?.exerciseIndex);
  if (!active || !Number.isInteger(exerciseIndex) || !replacementId) return;

  const dayIndex = Number(active.trainingDayIndex) || 0;
  const day = active.planSnapshot?.days?.[dayIndex];
  const plannedExercise = day?.exercises?.[exerciseIndex];
  const priorState = active.exercises?.[exerciseIndex];
  const replacement = getExerciseById(replacementId);
  if (!plannedExercise || !priorState || !replacement) return;

  if (hasEnteredData(priorState) && !window.confirm('Swapping this exercise will clear the data already entered for it today. Continue?')) return;

  Object.assign(plannedExercise, {
    id: replacement.id,
    name: replacement.name,
    exerciseName: replacement.name,
    muscleGroup: replacement.muscleGroup || '',
    type: replacement.type || '',
    equipment: replacement.equipment || '',
    trackingType: replacement.trackingType || 'reps'
  });
  active.exercises[exerciseIndex] = createReplacementState(replacement, priorState);
  active.currentExerciseIndex = exerciseIndex;
  active.currentSetIndex = 0;
  saveActiveWorkout(active);
  closeSwapSheet(sheet);
  openActiveWorkout();
}

function removeExerciseForToday(source) {
  const active = readActiveWorkout();
  const exerciseIndex = Number(source?.dataset?.exerciseIndex);
  if (!active || !Number.isInteger(exerciseIndex)) return;

  const dayIndex = Number(active.trainingDayIndex) || 0;
  const day = active.planSnapshot?.days?.[dayIndex];
  if (!day?.exercises?.[exerciseIndex]) return;
  if (day.exercises.length <= 1) {
    window.alert('Keep at least one exercise in the active workout.');
    return;
  }

  const exerciseName = getExerciseById(day.exercises[exerciseIndex].id)?.name || 'this exercise';
  if (!window.confirm(`Remove ${exerciseName} from today's workout only? Your saved plan will stay unchanged.`)) return;

  day.exercises.splice(exerciseIndex, 1);
  active.exercises.splice(exerciseIndex, 1);
  active.currentExerciseIndex = Math.min(exerciseIndex, day.exercises.length - 1);
  active.currentSetIndex = 0;
  saveActiveWorkout(active);
  openActiveWorkout();
}

function getSessionDay(active) {
  return active?.planSnapshot?.days?.[Number(active.trainingDayIndex) || 0] || null;
}

function readSavedPlans() {
  try {
    const plans = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || '[]');
    return Array.isArray(plans) ? plans : [];
  } catch {
    return [];
  }
}

function savedDayCanFollowActiveOrder(active, orderLength) {
  const plans = readSavedPlans();
  const plan = plans.find(item => item?.id === active?.planId);
  const day = plan?.days?.[Number(active?.trainingDayIndex) || 0];
  return Boolean(day && Array.isArray(day.exercises) && day.exercises.length === orderLength);
}

function applyOrderToSavedWorkoutDay(active, order) {
  const plans = readSavedPlans();
  const planIndex = plans.findIndex(item => item?.id === active?.planId);
  if (planIndex < 0) return false;
  const dayIndex = Number(active.trainingDayIndex) || 0;
  const day = plans[planIndex]?.days?.[dayIndex];
  if (!day || !Array.isArray(day.exercises) || day.exercises.length !== order.length) return false;
  day.exercises = order.map(index => day.exercises[index]).filter(Boolean);
  if (day.exercises.length !== order.length) return false;
  localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plans));
  window.dispatchEvent(new CustomEvent('levelup:workout-plans-changed', {
    detail: { planId: active.planId, dayIndex, reason: 'exercise-order' }
  }));
  return true;
}

function reorderExerciseName(planned, state) {
  return getExerciseById(planned?.id)?.name || planned?.name || planned?.exerciseName || state?.name || state?.exerciseName || 'Exercise';
}

function renderReorderItems(active) {
  const day = getSessionDay(active);
  return (day?.exercises || []).map((planned, index) => {
    const state = active.exercises?.[index];
    const definition = getExerciseById(planned?.id);
    const detail = [definition?.muscleGroup || state?.muscleGroup, definition?.equipment || state?.equipment].filter(Boolean).join(' · ');
    return `
      <div class="session-reorder-item" data-reorder-original-index="${index}">
        <span class="session-reorder-position">${index + 1}</span>
        <span class="session-reorder-copy"><strong>${escapeHtml(reorderExerciseName(planned, state))}</strong><small>${escapeHtml(detail || 'Workout exercise')}</small></span>
        <button class="session-reorder-handle" type="button" aria-label="Hold and drag ${escapeHtml(reorderExerciseName(planned, state))}. Use arrow keys to move it.">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="6" r="1.4"></circle><circle cx="16" cy="6" r="1.4"></circle><circle cx="8" cy="12" r="1.4"></circle><circle cx="16" cy="12" r="1.4"></circle><circle cx="8" cy="18" r="1.4"></circle><circle cx="16" cy="18" r="1.4"></circle></svg>
        </button>
      </div>`;
  }).join('');
}

function renumberReorderItems(list) {
  [...list.querySelectorAll('.session-reorder-item')].forEach((item, index) => {
    const position = item.querySelector('.session-reorder-position');
    if (position) position.textContent = String(index + 1);
  });
}

function bindReorderGestures(list) {
  if (!list || list.dataset.reorderGesturesBound === 'true') return;
  list.dataset.reorderGesturesBound = 'true';
  let gesture = null;

  const finish = () => {
    if (!gesture) return;
    window.clearTimeout(gesture.holdTimer);
    gesture.item.classList.remove('dragging');
    list.classList.remove('dragging-exercise');
    gesture = null;
    renumberReorderItems(list);
  };

  list.addEventListener('pointerdown', event => {
    const handle = event.target.closest('.session-reorder-handle');
    const item = handle?.closest('.session-reorder-item');
    if (!handle || !item || event.button > 0) return;
    gesture = {
      pointerId: event.pointerId,
      handle,
      item,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      holdTimer: window.setTimeout(() => {
        if (!gesture || gesture.item !== item) return;
        gesture.active = true;
        item.classList.add('dragging');
        list.classList.add('dragging-exercise');
        navigator.vibrate?.(10);
      }, 220)
    };
    handle.setPointerCapture?.(event.pointerId);
  });

  // Keep iOS's text-selection loupe and touch callout out of this drag-only control.
  list.addEventListener('contextmenu', event => {
    if (event.target.closest('.session-reorder-item')) event.preventDefault();
  });
  list.addEventListener('selectstart', event => {
    if (event.target.closest('.session-reorder-item')) event.preventDefault();
  });
  list.addEventListener('dragstart', event => {
    if (event.target.closest('.session-reorder-item')) event.preventDefault();
  });

  list.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    if (!gesture.active) {
      if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 8) finish();
      return;
    }
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.session-reorder-item');
    if (!target || target === gesture.item || target.parentElement !== list) return;
    const placeAfter = event.clientY > target.getBoundingClientRect().top + target.offsetHeight / 2;
    list.insertBefore(gesture.item, placeAfter ? target.nextSibling : target);
    renumberReorderItems(list);
  });

  list.addEventListener('pointerup', finish);
  list.addEventListener('pointercancel', finish);
  list.addEventListener('keydown', event => {
    const handle = event.target.closest('.session-reorder-handle');
    const item = handle?.closest('.session-reorder-item');
    if (!item || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowUp' && item.previousElementSibling) list.insertBefore(item, item.previousElementSibling);
    if (event.key === 'ArrowDown' && item.nextElementSibling) list.insertBefore(item.nextElementSibling, item);
    renumberReorderItems(list);
    handle.focus();
  });
}

function closeReorderSheet(sheet) {
  if (sheet) sheet.hidden = true;
}

function ensureReorderSheet(logger) {
  let sheet = logger.querySelector('#session-reorder-sheet');
  if (sheet) return sheet;
  sheet = document.createElement('div');
  sheet.id = 'session-reorder-sheet';
  sheet.className = 'session-exercise-swap-sheet session-reorder-sheet';
  sheet.hidden = true;
  sheet.innerHTML = `
    <div class="session-exercise-swap-panel session-reorder-panel" role="dialog" aria-modal="true" aria-labelledby="session-reorder-title">
      <div class="session-swap-heading">
        <div><span class="eyebrow">WORKOUT DAY</span><h4 id="session-reorder-title">Reorder Exercises</h4></div>
        <button class="session-swap-close session-reorder-close" type="button" aria-label="Close exercise reorder">×</button>
      </div>
      <p class="session-swap-note session-reorder-note"></p>
      <div class="session-reorder-list" aria-label="Exercise order"></div>
      <p class="session-reorder-help">Press and hold the dotted handle, then drag the exercise into position.</p>
      <div class="session-reorder-actions">
        <button class="secondary-btn session-reorder-cancel" type="button">Cancel</button>
        <button class="primary-btn session-reorder-confirm" type="button">Confirm Order</button>
      </div>
    </div>`;
  logger.appendChild(sheet);
  const close = () => closeReorderSheet(sheet);
  sheet.querySelector('.session-reorder-close')?.addEventListener('click', close);
  sheet.querySelector('.session-reorder-cancel')?.addEventListener('click', close);
  sheet.addEventListener('click', event => { if (event.target === sheet) close(); });
  sheet.querySelector('.session-reorder-confirm')?.addEventListener('click', () => {
    const active = readActiveWorkout();
    const day = getSessionDay(active);
    const list = sheet.querySelector('.session-reorder-list');
    const order = [...(list?.querySelectorAll('.session-reorder-item') || [])].map(item => Number(item.dataset.reorderOriginalIndex));
    if (!active || !day || order.length !== day.exercises?.length || new Set(order).size !== order.length) return;

    const priorPlanned = [...day.exercises];
    const priorStates = [...(active.exercises || [])];
    const previousCurrent = Number(active.currentExerciseIndex) || 0;
    const previousTimerExercise = Number(active.restTimer?.exerciseIndex);
    day.exercises = order.map(index => priorPlanned[index]);
    active.exercises = order.map(index => priorStates[index]);
    active.currentExerciseIndex = Math.max(0, order.indexOf(previousCurrent));
    if (active.restTimer && Number.isInteger(previousTimerExercise)) {
      const nextTimerExercise = order.indexOf(previousTimerExercise);
      if (nextTimerExercise >= 0) active.restTimer.exerciseIndex = nextTimerExercise;
    }
    applyOrderToSavedWorkoutDay(active, order);
    saveActiveWorkout(active);
    closeReorderSheet(sheet);
    openActiveWorkout();
  });
  bindReorderGestures(sheet.querySelector('.session-reorder-list'));
  return sheet;
}

function openReorderSheet(logger) {
  const active = readActiveWorkout();
  const day = getSessionDay(active);
  if (!active || !day || !Array.isArray(day.exercises) || day.exercises.length < 2) return;
  const sheet = ensureReorderSheet(logger);
  const list = sheet.querySelector('.session-reorder-list');
  const note = sheet.querySelector('.session-reorder-note');
  if (list) list.innerHTML = renderReorderItems(active);
  if (note) note.textContent = savedDayCanFollowActiveOrder(active, day.exercises.length)
    ? `Set the order for ${day.name || active.trainingDayName || 'this workout day'}. Your current session and saved workout day will both update.`
    : `Set the order for ${day.name || active.trainingDayName || 'this workout day'}. This order will apply to the current workout.`;
  sheet.hidden = false;
}

function appendExerciseToWorkout(exerciseId, logger) {
  if (logger?.dataset.editingSessionId) {
    return Boolean(logger.__levelUpEditApi?.addExercise(exerciseId));
  }
  const active = readActiveWorkout();
  const exercise = getExerciseById(exerciseId);
  const day = getSessionDay(active);
  if (!active || !exercise || !day) return false;
  const plannedExercise = {
    id: exercise.id, name: exercise.name, exerciseName: exercise.name,
    muscleGroup: exercise.muscleGroup || '', type: exercise.type || '',
    equipment: exercise.equipment || '', trackingType: exercise.trackingType || 'reps',
    sets: exercise.trackingType === 'notes' ? 1 : 3,
    reps: exercise.recommendedReps || '8-12'
  };
  day.exercises.push(plannedExercise);
  active.exercises.push(createReplacementState(exercise, { sets: Array.from({ length: plannedExercise.sets }) }));
  active.currentExerciseIndex = active.exercises.length - 1;
  active.currentSetIndex = 0;
  saveActiveWorkout(active);
  return true;
}

function ensureAddExerciseSheet(logger) {
  let sheet = logger.querySelector('#session-add-exercise-sheet');
  if (sheet) return sheet;
  sheet = document.createElement('div');
  sheet.id = 'session-add-exercise-sheet';
  sheet.className = 'session-exercise-swap-sheet session-add-exercise-sheet';
  sheet.hidden = true;
  sheet.dataset.muscle = '';
  sheet.innerHTML = `<div class="session-exercise-swap-panel session-add-exercise-panel" role="dialog" aria-modal="true" aria-labelledby="session-add-title">
    <div class="session-swap-heading"><div><span class="eyebrow">ACTIVE WORKOUT</span><h4 id="session-add-title">Add Exercise</h4></div><button class="session-swap-close" type="button" aria-label="Close exercise library">×</button></div>
    <input class="session-add-search" type="search" placeholder="Search exercises" aria-label="Search exercises">
    ${renderMuscleCarousel('', 'data-session-muscle')}
    <section class="exercise-browser-custom-form" data-session-custom-form hidden><h5>Add Custom Exercise</h5>${renderCustomExerciseFields()}<p class="exercise-browser-custom-message" aria-live="polite"></p><div class="exercise-browser-custom-actions"><button class="secondary-btn" type="button" data-session-custom-cancel>Cancel</button><button class="primary-btn" type="button" data-session-custom-save>Save & Add</button></div></section>
    <div class="session-add-results" data-session-add-results></div>
  </div>`;
  logger.appendChild(sheet);
  const close = () => {
    sheet.hidden = true;
    sheet.dataset.selectionMode = 'add';
    sheet.dataset.exerciseIndex = '';
  };
  const render = () => {
    const query = sheet.querySelector('.session-add-search')?.value || '';
    const swapIndex = Number(sheet.dataset.exerciseIndex);
    const active = sheet.dataset.selectionMode === 'swap' ? readActiveWorkout() : null;
    const currentId = Number.isInteger(swapIndex) ? getSessionDay(active)?.exercises?.[swapIndex]?.id : '';
    const currentExercise = getExerciseById(currentId);
    const results = getAllExercises().filter(item => item?.id && item?.name)
      .filter(item => sheet.dataset.selectionMode !== 'swap' || (
        item.id !== currentId &&
        (item.trackingType || 'reps') === (currentExercise?.trackingType || 'reps')
      ))
      .filter(item => matchesExerciseBrowser(item, { muscle: sheet.dataset.muscle, query }))
      .sort((a, b) => String(a.muscleGroup).localeCompare(String(b.muscleGroup)) || String(a.name).localeCompare(String(b.name)));
    sheet.querySelector('[data-session-add-results]').innerHTML = results.length ? results.map(item => `<button type="button" data-session-add-id="${escapeHtml(item.id)}"><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml([item.muscleGroup, item.equipment].filter(Boolean).join(' · '))}</small></span><b>+</b></button>`).join('') : '<p>No matching exercises.</p>';
  };
  sheet.querySelector('.session-swap-close')?.addEventListener('click', close);
  sheet.querySelector('.session-add-search')?.addEventListener('input', render);
  const customForm = sheet.querySelector('[data-session-custom-form]');
  sheet.querySelector('[data-exercise-browser-custom]')?.addEventListener('click', () => {
    customForm.hidden = false;
    sheet.querySelector('[data-session-add-results]').hidden = true;
    sheet.querySelector('.session-add-search').hidden = true;
    sheet.querySelector('.exercise-muscle-carousel').hidden = true;
    setTimeout(() => customForm.querySelector('[name="custom-name"]')?.focus(), 50);
  });
  const closeCustom = () => {
    customForm.hidden = true;
    sheet.querySelector('[data-session-add-results]').hidden = false;
    sheet.querySelector('.session-add-search').hidden = false;
    sheet.querySelector('.exercise-muscle-carousel').hidden = false;
  };
  sheet.querySelector('[data-session-custom-cancel]')?.addEventListener('click', closeCustom);
  sheet.querySelector('[data-session-custom-save]')?.addEventListener('click', () => {
    const value = name => customForm.querySelector(`[name="${name}"]`)?.value;
    const name = String(value('custom-name') || '').trim();
    const message = customForm.querySelector('.exercise-browser-custom-message');
    if (!name) { message.textContent = 'Enter an exercise name.'; return; }
    const exercise = addCustomExercise({ name, muscleGroup: value('custom-muscle'), equipment: value('custom-equipment'), type: value('custom-type'), recommendedReps: value('custom-reps'), defaultSets: value('custom-sets') });
    if (!exercise) { message.textContent = 'Custom exercise could not be added.'; return; }
    if (sheet.dataset.selectionMode === 'swap') {
      applyReplacement(sheet, exercise.id);
      return;
    }
    if (!appendExerciseToWorkout(exercise.id, logger)) { message.textContent = 'Custom exercise could not be added.'; return; }
    close();
    if (!logger.dataset.editingSessionId) openActiveWorkout();
  });
  sheet.querySelectorAll('[data-session-muscle]').forEach(button => button.addEventListener('click', () => {
    sheet.dataset.muscle = button.dataset.sessionMuscle || '';
    sheet.querySelectorAll('[data-session-muscle]').forEach(item => {
      const selected = item === button;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-selected', String(selected));
    });
    render();
  }));
  sheet.querySelector('[data-session-add-results]')?.addEventListener('click', event => {
    const button = event.target.closest('[data-session-add-id]');
    if (!button) return;
    if (sheet.dataset.selectionMode === 'swap') {
      applyReplacement(sheet, button.dataset.sessionAddId);
      return;
    }
    if (!appendExerciseToWorkout(button.dataset.sessionAddId, logger)) return;
    close();
    if (!logger.dataset.editingSessionId) openActiveWorkout();
  });
  sheet.addEventListener('click', event => { if (event.target === sheet) close(); });
  sheet.renderExerciseResults = render;
  return sheet;
}

function openAddExerciseSheet(logger, { mode = 'add', exerciseIndex = null } = {}) {
  const sheet = ensureAddExerciseSheet(logger);
  sheet.dataset.selectionMode = mode;
  sheet.dataset.exerciseIndex = mode === 'swap' && Number.isInteger(exerciseIndex) ? String(exerciseIndex) : '';
  sheet.dataset.muscle = '';
  const heading = sheet.querySelector('#session-add-title');
  const eyebrow = sheet.querySelector('.session-swap-heading .eyebrow');
  if (heading) heading.textContent = mode === 'swap' ? 'Choose Replacement' : 'Add Exercise';
  if (eyebrow) eyebrow.textContent = mode === 'swap' ? 'TODAY ONLY' : 'ACTIVE WORKOUT';
  const customForm = sheet.querySelector('[data-session-custom-form]');
  if (customForm) customForm.hidden = true;
  const search = sheet.querySelector('.session-add-search');
  if (search) {
    search.hidden = false;
    search.value = '';
  }
  const carousel = sheet.querySelector('.exercise-muscle-carousel');
  if (carousel) carousel.hidden = false;
  const results = sheet.querySelector('[data-session-add-results]');
  if (results) results.hidden = false;
  sheet.querySelectorAll('[data-session-muscle]').forEach(button => {
    const selected = !button.dataset.sessionMuscle;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-selected', String(selected));
  });
  sheet.hidden = false;
  sheet.renderExerciseResults?.();
  setTimeout(() => search?.focus(), 50);
}

function clearSupersetGroup(day, group) {
  if (!day || !group) return;
  (day.exercises || []).forEach(exercise => {
    if (exercise?.supersetGroup === group) delete exercise.supersetGroup;
  });
}

function nextSessionSupersetGroup(day) {
  const used = new Set((day?.exercises || []).map(exercise => exercise?.supersetGroup).filter(Boolean));
  let number = 1;
  while (used.has(`SESSION-${number}`)) number += 1;
  return `SESSION-${number}`;
}

function sessionSupersetCandidates(active, exerciseIndex) {
  const day = getSessionDay(active);
  const current = day?.exercises?.[exerciseIndex];
  const currentGroup = current?.supersetGroup || '';
  if (!day || !current || active?.exercises?.[exerciseIndex]?.trackingType === 'notes') return [];

  return (day.exercises || [])
    .map((exercise, index) => ({ exercise, index, state: active.exercises?.[index] }))
    .filter(item => item.index !== exerciseIndex)
    .filter(item => item.state?.trackingType !== 'notes')
    .filter(item => !item.exercise?.supersetGroup || item.exercise.supersetGroup === currentGroup);
}

function renderSessionSupersetCandidates(active, exerciseIndex) {
  const currentGroup = getSessionDay(active)?.exercises?.[exerciseIndex]?.supersetGroup || '';
  const candidates = sessionSupersetCandidates(active, exerciseIndex);
  if (!candidates.length) {
    return '<p class="session-superset-empty">Every compatible exercise is already paired. End another superset first to make it available.</p>';
  }

  return candidates.map(({ exercise, index }) => {
    const definition = getExerciseById(exercise?.id);
    const paired = Boolean(currentGroup && exercise?.supersetGroup === currentGroup);
    return `
      <button class="session-superset-option ${paired ? 'selected' : ''}" type="button" data-session-superset-partner-index="${index}">
        <span class="session-superset-option-marker">${paired ? '✓' : '+'}</span>
        <span>
          <strong>${escapeHtml(definition?.name || 'Exercise')}</strong>
          <small>${escapeHtml([definition?.muscleGroup, definition?.equipment].filter(Boolean).join(' · '))}</small>
        </span>
        <em>${paired ? 'Paired' : 'Pair'}</em>
      </button>`;
  }).join('');
}

function closeSupersetSheet(sheet) {
  if (!sheet) return;
  sheet.hidden = true;
  sheet.dataset.exerciseIndex = '';
}

function ensureSupersetSheet(logger) {
  let sheet = logger.querySelector('#session-superset-sheet');
  if (sheet) return sheet;

  sheet = document.createElement('div');
  sheet.id = 'session-superset-sheet';
  sheet.className = 'session-exercise-swap-sheet session-superset-sheet';
  sheet.hidden = true;
  sheet.innerHTML = `
    <div class="session-exercise-swap-panel session-superset-panel" role="dialog" aria-modal="true" aria-labelledby="session-superset-title">
      <div class="session-swap-heading">
        <div>
          <span class="eyebrow">TODAY ONLY</span>
          <h4 id="session-superset-title">Build Superset</h4>
        </div>
        <button class="session-swap-close session-superset-close" type="button" aria-label="Close superset options">×</button>
      </div>
      <p class="session-swap-note session-superset-note">Pair this movement with another exercise in today’s workout. You’ll move directly from A1 to A2, then rest after the pair.</p>
      <div class="session-superset-current"></div>
      <span class="session-manual-label">PAIR WITH</span>
      <div class="session-superset-options"></div>
      <button class="secondary-btn session-superset-remove" type="button" hidden>End This Superset</button>
      <button class="session-swap-cancel session-superset-cancel" type="button">Cancel</button>
    </div>`;
  logger.appendChild(sheet);

  const close = () => closeSupersetSheet(sheet);
  sheet.querySelector('.session-superset-close')?.addEventListener('click', close);
  sheet.querySelector('.session-superset-cancel')?.addEventListener('click', close);
  sheet.addEventListener('click', event => { if (event.target === sheet) close(); });
  sheet.querySelector('.session-superset-options')?.addEventListener('click', event => {
    const button = event.target.closest('[data-session-superset-partner-index]');
    if (!button) return;
    applySessionSuperset(sheet, Number(button.dataset.sessionSupersetPartnerIndex));
  });
  sheet.querySelector('.session-superset-remove')?.addEventListener('click', () => removeSessionSuperset(sheet));
  return sheet;
}

function openSupersetSheet(card, logger) {
  const active = readActiveWorkout();
  const exerciseIndex = Number(card?.dataset?.exerciseIndex);
  const day = getSessionDay(active);
  const planned = day?.exercises?.[exerciseIndex];
  if (!active || !planned || !Number.isInteger(exerciseIndex)) return;

  const sheet = ensureSupersetSheet(logger);
  const definition = getExerciseById(planned.id);
  const group = planned.supersetGroup || '';
  const members = group
    ? day.exercises.map((exercise, index) => ({ exercise, index })).filter(item => item.exercise?.supersetGroup === group)
    : [];
  const partner = members.find(item => item.index !== exerciseIndex);
  const partnerName = getExerciseById(partner?.exercise?.id)?.name;
  sheet.dataset.exerciseIndex = String(exerciseIndex);
  sheet.querySelector('#session-superset-title').textContent = group ? `Edit ${definition?.name || 'Superset'}` : `Superset ${definition?.name || 'Exercise'}`;
  sheet.querySelector('.session-superset-current').innerHTML = group
    ? `<span>Currently paired with</span><strong>${escapeHtml(partnerName || 'another exercise')}</strong>`
    : '<span>Not currently paired</span><strong>Choose an exercise below</strong>';
  sheet.querySelector('.session-superset-options').innerHTML = renderSessionSupersetCandidates(active, exerciseIndex);
  sheet.querySelector('.session-superset-remove').hidden = !group;
  sheet.hidden = false;
}

function applySessionSuperset(sheet, partnerIndex) {
  const active = readActiveWorkout();
  const exerciseIndex = Number(sheet?.dataset?.exerciseIndex);
  const day = getSessionDay(active);
  const current = day?.exercises?.[exerciseIndex];
  const partner = day?.exercises?.[partnerIndex];
  if (!active || !current || !partner || !Number.isInteger(partnerIndex) || partnerIndex === exerciseIndex) return;
  if (active.exercises?.[exerciseIndex]?.trackingType === 'notes' || active.exercises?.[partnerIndex]?.trackingType === 'notes') return;
  if (partner.supersetGroup && partner.supersetGroup !== current.supersetGroup) return;

  const priorGroup = current.supersetGroup;
  if (priorGroup) clearSupersetGroup(day, priorGroup);
  const group = nextSessionSupersetGroup(day);
  current.supersetGroup = group;
  partner.supersetGroup = group;
  active.currentExerciseIndex = exerciseIndex;
  saveActiveWorkout(active);
  closeSupersetSheet(sheet);
  openActiveWorkout();
}

function removeSessionSuperset(sheet) {
  const active = readActiveWorkout();
  const exerciseIndex = Number(sheet?.dataset?.exerciseIndex);
  const day = getSessionDay(active);
  const group = day?.exercises?.[exerciseIndex]?.supersetGroup;
  if (!active || !group) return;

  clearSupersetGroup(day, group);
  active.currentExerciseIndex = exerciseIndex;
  saveActiveWorkout(active);
  closeSupersetSheet(sheet);
  openActiveWorkout();
}

function createSwapButton(card, logger, heading) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'session-inline-swap';
  button.textContent = 'Swap';
  button.setAttribute('aria-label', `Swap ${heading?.textContent?.trim() || 'exercise'} for today only`);
  button.addEventListener('click', event => {
    event.stopPropagation();
    openSwapSheet(card, logger);
  });
  return button;
}

function createSupersetButton(card, logger, heading) {
  const active = readActiveWorkout();
  const group = getSessionDay(active)?.exercises?.[Number(card?.dataset?.exerciseIndex)]?.supersetGroup;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'session-inline-superset';
  button.textContent = group ? 'Edit Superset' : 'Superset';
  button.setAttribute('aria-label', `Create or edit a superset for ${heading?.textContent?.trim() || 'this exercise'}`);
  button.addEventListener('click', event => {
    event.stopPropagation();
    openSupersetSheet(card, logger);
  });
  return button;
}

function ensureExerciseOverflow(card) {
  if (!card || card.dataset.trackingType !== 'reps') return;
  const header = card.querySelector('.compact-exercise-header');
  const headerActions = header?.querySelector('.compact-exercise-actions');
  if (!header || !headerActions) return;

  let trigger = headerActions.querySelector('.exercise-more-btn');
  if (!trigger) {
    trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'exercise-more-btn';
    trigger.textContent = '•••';
    headerActions.appendChild(trigger);
  }

  let menu = header.querySelector('.exercise-options-popover');
  if (!menu) {
    menu = document.createElement('div');
    menu.className = 'exercise-options-popover';
    menu.hidden = true;
    header.appendChild(menu);
  }
  menu.setAttribute('role', 'dialog');
  menu.setAttribute('aria-label', 'Exercise actions');

  let actions = menu.querySelector('.session-overflow-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'session-overflow-actions';
    actions.setAttribute('aria-label', 'Exercise actions');
    actions.innerHTML = `
      <button type="button" data-session-overflow-action="superset">
        <span>Superset</span><small>Pair with another exercise</small>
      </button>
      <button type="button" data-session-overflow-action="warmup">
        <span>Warm-up</span><small>Show optional warm-up sets</small>
      </button>
      <button type="button" data-session-overflow-action="swap">
        <span>Smart Swap</span><small>Choose a similar exercise for today</small>
      </button>
      <button type="button" data-session-overflow-action="note">
        <span>Add Note</span><small>Record a cue or session detail</small>
      </button>
      <button type="button" data-session-overflow-action="reorder">
        <span>Reorder Exercises</span><small>Press, hold, and arrange this workout day</small>
      </button>
      <button type="button" data-session-overflow-action="remove" hidden>
        <span>Remove Exercise</span><small>Delete it from this saved workout</small>
      </button>
    `;
    menu.appendChild(actions);
  }

  const editingSavedWorkout = Boolean(card.closest('#workout-session-logger')?.dataset.editingSessionId);
  const sources = editingSavedWorkout
    ? { superset: null, warmup: null, swap: null }
    : {
        superset: card.querySelector('.session-inline-superset'),
        warmup: card.querySelector('.exercise-warmup-btn'),
        swap: card.querySelector('.session-inline-swap')
      };

  Object.entries(sources).forEach(([name, source]) => {
    const action = actions.querySelector(`[data-session-overflow-action="${name}"]`);
    if (!action) return;
    action.hidden = !source;
    source?.classList.add('session-overflow-source');
  });
  card.querySelectorAll('.logger-exercise-tools').forEach(tools => {
    tools.classList.toggle('only-overflow-sources', !tools.querySelector(':scope > :not(.session-overflow-source)'));
  });

  const supersetAction = actions.querySelector('[data-session-overflow-action="superset"] span');
  const warmupAction = actions.querySelector('[data-session-overflow-action="warmup"] span');
  if (supersetAction) supersetAction.textContent = sources.superset?.textContent?.trim() || 'Superset';
  if (warmupAction) warmupAction.textContent = sources.warmup?.getAttribute('aria-expanded') === 'true' ? 'Hide Warm-up' : 'Warm-up';
  const noteAction = actions.querySelector('[data-session-overflow-action="note"]');
  const noteValue = card.querySelector('.session-rep-notes')?.value?.trim() || '';
  if (noteAction) {
    noteAction.hidden = card.dataset.trackingType === 'notes' || !card.querySelector('.session-note-preview');
    const label = noteAction.querySelector('span');
    if (label) label.textContent = noteValue ? 'Edit Note' : 'Add Note';
  }
  const reorderAction = actions.querySelector('[data-session-overflow-action="reorder"]');
  if (reorderAction) reorderAction.hidden = editingSavedWorkout || (getSessionDay(readActiveWorkout())?.exercises?.length || 0) < 2;
  const removeAction = actions.querySelector('[data-session-overflow-action="remove"]');
  if (removeAction) removeAction.hidden = !editingSavedWorkout;

  trigger.textContent = '•••';
  trigger.setAttribute('aria-label', 'Open exercise actions');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', String(!menu.hidden));
  if (trigger.dataset.exerciseOverflowBound !== 'true') {
    trigger.dataset.exerciseOverflowBound = 'true';
    trigger.addEventListener('click', event => {
      event.stopPropagation();
      const opening = menu.hidden;
      card.closest('#workout-session-logger')?.querySelectorAll('.exercise-options-popover, .exercise-timer-popover').forEach(other => {
        if (other !== menu) other.hidden = true;
      });
      card.closest('#workout-session-logger')?.querySelectorAll('.exercise-more-btn, .exercise-timer-btn').forEach(button => {
        if (button !== trigger) button.setAttribute('aria-expanded', 'false');
      });
      menu.hidden = !opening;
      trigger.setAttribute('aria-expanded', String(opening));
    });
  }
}

function ensureInlineActions(card, logger) {
  const liftingActions = card.querySelector('.compact-exercise-actions');
  const liftingHeading = card.querySelector('.compact-exercise-header h4');
  if (liftingActions && liftingHeading) {
    const active = readActiveWorkout();
    const group = getSessionDay(active)?.exercises?.[Number(card.dataset.exerciseIndex)]?.supersetGroup;
    if (group) card.dataset.supersetGroup = group;
    else delete card.dataset.supersetGroup;

    if (!card.querySelector('.session-inline-swap')) {
      const button = createSwapButton(card, logger, liftingHeading);
      const timerButton = liftingActions.querySelector('.exercise-timer-btn');
      if (timerButton) liftingActions.insertBefore(button, timerButton);
      else liftingActions.appendChild(button);
    }

    if (!card.querySelector('.session-inline-superset')) {
      let tools = card.querySelector('.logger-exercise-tools');
      if (!tools) {
        tools = document.createElement('div');
        tools.className = 'logger-exercise-tools';
        card.querySelector('.compact-exercise-header')?.insertAdjacentElement('afterend', tools);
      }
      tools.appendChild(createSupersetButton(card, logger, liftingHeading));
    }
    const supersetButton = card.querySelector('.session-inline-superset');
    const supersetLabel = group ? 'Edit Superset' : 'Superset';
    if (supersetButton && supersetButton.textContent !== supersetLabel) {
      supersetButton.textContent = supersetLabel;
    }
    ensureExerciseOverflow(card);
    return;
  }

  if (card.classList.contains('cardio-session-card')) {
    if (card.querySelector('.session-inline-swap')) return;
    const heading = card.querySelector('h4');
    if (!heading) return;
    let header = card.querySelector('.cardio-session-action-header');
    if (!header) {
      header = document.createElement('div');
      header.className = 'cardio-session-action-header';
      heading.parentNode.insertBefore(header, heading);
      header.appendChild(heading);
    }
    header.appendChild(createSwapButton(card, logger, heading));
  }
}

function enhanceActiveLogger() {
  const logger = document.getElementById('workout-session-logger');
  if (!logger) return;
  const editingSavedWorkout = Boolean(logger.dataset.editingSessionId);
  logger.querySelectorAll('.session-exercise-card').forEach(card => {
    if (!editingSavedWorkout) ensureInlineActions(card, logger);
    ensureExerciseOverflow(card);
  });
  logger.querySelectorAll('.session-exercise-card[data-tracking-type="reps"]').forEach(card => {
    if (card.querySelector('.session-add-exercise-btn')) return;
    const addSet = card.querySelector('.compact-add-set-btn');
    if (!addSet) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'session-add-exercise-btn';
    button.textContent = '+ Add Exercise';
    button.addEventListener('click', () => openAddExerciseSheet(logger));
    const actions = document.createElement('div');
    actions.className = 'session-exercise-add-actions';
    addSet.parentNode.insertBefore(actions, addSet);
    actions.append(addSet, button);
  });
}

let enhanceFrame = 0;
const observer = new MutationObserver(() => {
  if (enhanceFrame) return;
  enhanceFrame = requestAnimationFrame(() => {
    enhanceFrame = 0;
    enhanceActiveLogger();
  });
});
observer.observe(document.body, { childList: true, subtree: true });

document.addEventListener('click', event => {
  const overflowAction = event.target.closest('[data-session-overflow-action]');
  if (overflowAction) {
    const card = overflowAction.closest('.session-exercise-card');
    const action = overflowAction.dataset.sessionOverflowAction;
    const menu = overflowAction.closest('.exercise-options-popover');
    if (menu) menu.hidden = true;
    card?.querySelector('.exercise-more-btn')?.setAttribute('aria-expanded', 'false');
    if (action === 'reorder') {
      const logger = card?.closest('#workout-session-logger');
      if (logger) openReorderSheet(logger);
      return;
    }
    if (action === 'note') {
      card?.querySelector('.session-note-preview')?.click();
      return;
    }
    if (action === 'remove') {
      const logger = card?.closest('#workout-session-logger');
      logger?.__levelUpEditApi?.removeExercise(Number(card?.dataset.exerciseIndex));
      return;
    }
    const selector = action === 'superset'
      ? '.session-inline-superset'
      : action === 'warmup'
        ? '.exercise-warmup-btn'
        : '.session-inline-swap';
    const source = card?.querySelector(selector);
    source?.click();
    window.setTimeout(() => ensureExerciseOverflow(card), 0);
    return;
  }

  if (event.target.closest('#begin-session-btn, [data-page="workout"], .nav-workout')) {
    setTimeout(enhanceActiveLogger, 0);
    setTimeout(enhanceActiveLogger, 100);
    setTimeout(enhanceActiveLogger, 400);
  }
});

window.setInterval(() => {
  if (document.getElementById('workout-session-logger')) enhanceActiveLogger();
}, 500);

enhanceActiveLogger();
