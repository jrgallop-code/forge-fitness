import { getExerciseById } from './exercise-library.js';

const ACTIVE_WORKOUT_STORAGE_KEY = 'level_up_active_workout';
const SESSION_STORAGE_KEY = 'forge_workout_sessions';

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function getRepRangeUpperBound(repTarget) {
  const values = String(repTarget || '')
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter(Number.isFinite) || [];
  return values.length ? Math.max(...values) : null;
}

function formatLoad(value) {
  const number = Number(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function getPracticalIncrement(exerciseId) {
  const exercise = getExerciseById(exerciseId);
  const equipment = String(exercise?.equipment || '').toLowerCase();
  if (equipment.includes('dumbbell')) return 5;
  if (equipment.includes('barbell')) return 5;
  if (equipment.includes('cable')) return 2.5;
  if (equipment.includes('machine')) return 5;
  return 5;
}

function getRecommendedLoad(currentWeight, exerciseId) {
  const current = Number(currentWeight);
  if (!Number.isFinite(current) || current <= 0) return null;
  const increment = getPracticalIncrement(exerciseId);
  return Number((Math.ceil((current + 1e-9) / increment) * increment).toFixed(1));
}

function findPreviousProgressionSource(active, exerciseIndex, upperBound) {
  const planned = active?.planSnapshot?.days?.[active.trainingDayIndex]?.exercises?.[exerciseIndex];
  const exerciseId = planned?.id;
  if (!exerciseId) return null;

  const sessions = readJson(SESSION_STORAGE_KEY, []);
  if (!Array.isArray(sessions)) return null;

  const matching = sessions
    .filter(session =>
      session?.planId === active.planId &&
      Number(session.trainingDayIndex) === Number(active.trainingDayIndex)
    )
    .sort((a, b) => String(b.completedAt || b.date || '').localeCompare(String(a.completedAt || a.date || '')));

  for (const session of matching) {
    const dayExercises = session?.planSnapshot?.days?.[session.trainingDayIndex]?.exercises || [];
    const savedIndex = dayExercises.findIndex(item => item?.id === exerciseId);
    if (savedIndex < 0) continue;

    const state = session?.exercises?.[savedIndex];
    if (!state || !Array.isArray(state.sets)) continue;

    const completedSets = state.sets.filter(set =>
      set?.completed &&
      Number(set.weight) > 0 &&
      Number(set.reps) > 0
    );
    if (!completedSets.length) continue;

    // Progression triggers in either of two cases:
    // 1) every completed set reached at least the top of the target range; or
    // 2) any completed set exceeded the target maximum.
    // This preserves partial-workout progression (e.g. 2 of 3 sets both hit 12)
    // while also catching obvious overshoots such as 14 reps on an 8-12 target.
    const allAtTop = completedSets.every(set => Number(set.reps) >= upperBound);
    const anyExceeded = completedSets.some(set => Number(set.reps) > upperBound);
    if (!allAtTop && !anyExceeded) continue;

    const sourceSet = [...completedSets]
      .filter(set => Number(set.reps) >= upperBound)
      .sort((a, b) => Number(b.weight) - Number(a.weight))[0];
    if (!sourceSet) continue;

    return {
      exerciseId,
      set: sourceSet,
      completedCount: completedSets.length,
      plannedCount: state.sets.length,
      maxReps: Math.max(...completedSets.map(set => Number(set.reps) || 0)),
      exceeded: anyExceeded
    };
  }

  return null;
}

function ensurePrompt(card) {
  let prompt = card.querySelector('.progression-prompt');
  if (prompt) return prompt;
  prompt = document.createElement('div');
  prompt.className = 'progression-prompt';
  prompt.hidden = true;
  const target = card.querySelector('.session-target');
  if (target) target.insertAdjacentElement('afterend', prompt);
  else card.prepend(prompt);
  return prompt;
}

function renderPrompt(card) {
  const logger = card.closest('#workout-session-logger');
  if (!logger || logger.dataset.editingSessionId) return;

  const prompt = ensurePrompt(card);
  const active = readJson(ACTIVE_WORKOUT_STORAGE_KEY, null);
  if (!active) {
    prompt.hidden = true;
    return;
  }

  const exerciseIndex = Number(card.dataset.exerciseIndex);
  const planned = active?.planSnapshot?.days?.[active.trainingDayIndex]?.exercises?.[exerciseIndex];
  const upperBound = getRepRangeUpperBound(planned?.reps);
  if (!upperBound) {
    prompt.hidden = true;
    return;
  }

  // Never use the workout currently being logged. Progression is earned in a
  // previous saved session and displayed at the start of the following one.
  const source = findPreviousProgressionSource(active, exerciseIndex, upperBound);
  if (!source) {
    prompt.hidden = true;
    prompt.innerHTML = '';
    return;
  }

  const currentWeight = Number(source.set.weight);
  const practicalIncrement = getPracticalIncrement(source.exerciseId);
  const nextWeight = getRecommendedLoad(currentWeight, source.exerciseId);
  if (!nextWeight || nextWeight <= currentWeight) {
    prompt.hidden = true;
    return;
  }

  const pct = ((nextWeight / currentWeight) - 1) * 100;
  const partial = source.completedCount < source.plannedCount
    ? ` with ${source.completedCount} of ${source.plannedCount} sets completed`
    : '';
  const repText = source.exceeded
    ? `you exceeded the ${upperBound}-rep target and reached ${source.maxReps} reps`
    : `all completed sets reached at least ${upperBound} reps`;
  const largeJumpNote = pct > 10
    ? ` This is a larger percentage jump because the next practical equipment increment is ${formatLoad(practicalIncrement)} lb.`
    : '';

  prompt.innerHTML = `
    <span class="progression-arrow">↑</span>
    <div>
      <strong>Increase weight this session</strong>
      <p>Last workout ${repText} at ${formatLoad(currentWeight)} lb${partial}. Recommended load for this session: <b>${formatLoad(nextWeight)} lb</b> (+${pct.toFixed(1)}%).</p>
      <small>Progression uses the next practical ${formatLoad(practicalIncrement)} lb gym increment after meeting or exceeding the top of the programmed rep range.${largeJumpNote}</small>
    </div>
  `;
  prompt.hidden = false;
}

function refreshLogger(logger) {
  logger
    .querySelectorAll('.session-exercise-card[data-tracking-type="reps"]')
    .forEach(renderPrompt);
}

function bindLogger(logger) {
  if (!logger || logger.dataset.progressionV2Bound === 'true') return;
  logger.dataset.progressionV2Bound = 'true';
  const refresh = () => refreshLogger(logger);
  refresh();
  logger.addEventListener('input', event => {
    if (event.target.matches('.session-weight, .session-reps')) setTimeout(refresh, 60);
  });
  logger.addEventListener('click', event => {
    if (event.target.closest('.complete-set-btn')) setTimeout(refresh, 80);
  });
}

function scan() {
  const logger = document.getElementById('workout-session-logger');
  if (logger) bindLogger(logger);
}

const observer = new MutationObserver(mutations => {
  if (mutations.some(mutation => [...mutation.addedNodes].some(node =>
    node.nodeType === 1 &&
    (node.id === 'workout-session-logger' || node.querySelector?.('#workout-session-logger'))
  ))) {
    setTimeout(scan, 20);
  }
});

observer.observe(document.body, { childList: true, subtree: true });
scan();
