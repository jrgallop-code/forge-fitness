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

  // Default to common real-world gym jumps. We can make these user-configurable later.
  if (equipment.includes('dumbbell')) return 5;
  if (equipment.includes('barbell')) return 5;
  if (equipment.includes('cable')) return 5;
  if (equipment.includes('machine')) return 5;
  return 5;
}

function getRecommendedLoad(currentWeight, exerciseId) {
  const current = Number(currentWeight);
  if (!Number.isFinite(current) || current <= 0) return null;

  const increment = getPracticalIncrement(exerciseId);
  return Number((Math.ceil((current + 1e-9) / increment) * increment).toFixed(1));
}

function findPreviousQualifyingSet(active, exerciseIndex, upperBound) {
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

    const qualifying = state.sets
      .filter(set => set?.completed && Number(set.reps) >= upperBound && Number(set.weight) > 0)
      .sort((a, b) => Number(b.weight) - Number(a.weight))[0];

    if (qualifying) {
      return {
        exerciseId,
        set: qualifying,
        completedCount: state.sets.filter(set => set?.completed).length,
        plannedCount: state.sets.length
      };
    }
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

  // Important: never use performance from the workout currently being logged.
  // A progression recommendation only appears if a PREVIOUS SAVED SESSION qualified.
  const source = findPreviousQualifyingSet(active, exerciseIndex, upperBound);
  if (!source) {
    prompt.hidden = true;
    prompt.innerHTML = '';
    return;
  }

  const currentWeight = Number(source.set.weight);
  const nextWeight = getRecommendedLoad(currentWeight, source.exerciseId);
  if (!nextWeight || nextWeight <= currentWeight) {
    prompt.hidden = true;
    return;
  }

  const pct = ((nextWeight / currentWeight) - 1) * 100;
  const partial = source.completedCount < source.plannedCount
    ? ` with ${source.completedCount} of ${source.plannedCount} sets completed`
    : '';
  const largeJumpNote = pct > 10
    ? ' This is a larger percentage jump because the next practical equipment increment is 5 lb.'
    : '';

  prompt.innerHTML = `
    <span class="progression-arrow">↑</span>
    <div>
      <strong>Increase weight this session</strong>
      <p>Last workout you reached ${upperBound} reps at ${formatLoad(currentWeight)} lb${partial}. Recommended load for this session: <b>${formatLoad(nextWeight)} lb</b> (+${pct.toFixed(1)}%).</p>
      <small>Progression uses the next practical 5 lb gym increment after reaching the top of the programmed rep range.${largeJumpNote}</small>
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

  // Older logger modules may try to show a prompt from the current session.
  // Re-apply the previous-session-only rule after their handlers finish.
  logger.addEventListener('input', event => {
    if (event.target.matches('.session-weight, .session-reps')) {
      setTimeout(refresh, 60);
    }
  });

  logger.addEventListener('click', event => {
    if (event.target.closest('.complete-set-btn')) {
      setTimeout(refresh, 80);
    }
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
