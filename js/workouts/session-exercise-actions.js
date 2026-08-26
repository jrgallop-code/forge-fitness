import { openActiveWorkout, ACTIVE_WORKOUT_STORAGE_KEY } from './workout-session.js?v=adaptive-completion-1';
import './exercise-library-expansion.js?v=exercise-library-expansion-1';
import { getAllExercises, getExerciseById } from './exercise-library.js?v=exercise-library-catalogue-2';
import { createGeneratedExerciseGuide } from './exercise-guide-generator.js?v=full-library-guides-1';
import { movementForExercise, prioritizeMovementMatches } from './smart-swap-priority.js?v=smart-swap-movement-priority-1';

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
  return {
    exerciseId: exercise.id,
    trackingType: 'reps',
    sets: Array.from({ length: setCount }, () => ({ weight: null, reps: null, completed: false }))
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

function buildSwapOptions(currentExercise) {
  const choices = getEligibleExercises(currentExercise);
  const sameGroup = choices.filter(item => item.muscleGroup && item.muscleGroup === currentExercise?.muscleGroup);
  const others = choices.filter(item => !item.muscleGroup || item.muscleGroup !== currentExercise?.muscleGroup);
  const renderOptions = items => items.map(item =>
    `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}${item.equipment ? ` · ${escapeHtml(item.equipment)}` : ''}</option>`
  ).join('');

  if (!choices.length) return '<option value="">No compatible exercises available</option>';
  return `${sameGroup.length ? `<optgroup label="${escapeHtml(currentExercise?.muscleGroup || 'Similar')} options">${renderOptions(sameGroup)}</optgroup>` : ''}${others.length ? `<optgroup label="${currentExercise?.trackingType === 'notes' ? 'Other cardio exercises' : 'Other exercises'}">${renderOptions(others)}</optgroup>` : ''}`;
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
        <label class="session-swap-field">
          <span>Replace with</span>
          <select class="session-swap-select"></select>
        </label>
      </div>
      <div class="session-swap-actions">
        <button class="secondary-btn session-remove-today" type="button">Remove for Today</button>
        <button class="primary-btn session-swap-confirm" type="button">Swap for Today</button>
      </div>
      <button class="session-swap-cancel" type="button">Cancel</button>
    </div>`;
  logger.appendChild(sheet);

  const close = () => closeSwapSheet(sheet);
  sheet.querySelector('.session-swap-close')?.addEventListener('click', close);
  sheet.querySelector('.session-swap-cancel')?.addEventListener('click', close);
  sheet.addEventListener('click', event => { if (event.target === sheet) close(); });
  sheet.querySelector('.session-swap-confirm')?.addEventListener('click', () => applySwap(sheet));
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
  const select = sheet.querySelector('.session-swap-select');
  const title = sheet.querySelector('#session-swap-title');
  const smartOptions = sheet.querySelector('.session-smart-options');
  sheet.dataset.exerciseIndex = String(exerciseIndex);
  if (title) title.textContent = `Swap ${currentExercise.name}`;
  if (select) select.innerHTML = buildSwapOptions(currentExercise);
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

  plannedExercise.id = replacement.id;
  active.exercises[exerciseIndex] = createReplacementState(replacement, priorState);
  active.currentExerciseIndex = exerciseIndex;
  active.currentSetIndex = 0;
  saveActiveWorkout(active);
  closeSwapSheet(sheet);
  openActiveWorkout();
}

function applySwap(sheet) {
  const replacementId = sheet?.querySelector('.session-swap-select')?.value;
  applyReplacement(sheet, replacementId);
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
      const timerButton = liftingActions.querySelector('.exercise-more-btn');
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
  if (!logger || logger.dataset.editingSessionId) return;
  logger.querySelectorAll('.session-exercise-card').forEach(card => ensureInlineActions(card, logger));
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
