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

function getRecommendedLoadRange(currentWeight, exerciseId) {
  const current = Number(currentWeight);
  if (!Number.isFinite(current) || current <= 0) return null;
  const minimumIncrease = getPracticalIncrement(exerciseId);
  const thresholdIncrease = Math.floor((current * 0.11 + 1e-9) / minimumIncrease) * minimumIncrease;
  const maximumIncrease = Math.max(minimumIncrease, thresholdIncrease);
  return {
    minimumIncrease,
    maximumIncrease,
    minimumLoad: Number((current + minimumIncrease).toFixed(1)),
    maximumLoad: Number((current + maximumIncrease).toFixed(1))
  };
}

function compareSessionsNewest(a, b) {
  return String(b?.completedAt || b?.updatedAt || b?.date || '')
    .localeCompare(String(a?.completedAt || a?.updatedAt || a?.date || ''));
}

function hasRecordedSetData(set) {
  return set && (set.weight !== null && set.weight !== '' && set.weight !== undefined ||
    set.reps !== null && set.reps !== '' && set.reps !== undefined);
}

function getPreferredRecordedSets(performance) {
  const recorded = Array.isArray(performance?.sets)
    ? performance.sets.filter(hasRecordedSetData)
    : [];
  const completed = recorded.filter(set => set?.completed);
  return completed.length ? completed : recorded;
}

function hasValidPerformance(performance) {
  if (!performance) return false;
  if (getPreferredRecordedSets(performance).length) return true;
  return Number(performance.durationMinutes) > 0 ||
    Boolean(String(performance.distance || '').trim()) ||
    Boolean(String(performance.notes || '').trim());
}

function findExercisePerformance(session, exerciseId) {
  const direct = (session?.exercises || []).find(item => item?.exerciseId === exerciseId);
  if (direct) return direct;
  const planned = session?.planSnapshot?.days?.[session?.trainingDayIndex]?.exercises || [];
  const index = planned.findIndex(item => item?.id === exerciseId);
  return index >= 0 ? session?.exercises?.[index] || null : null;
}

function findPreviousPerformance(exerciseId, excludedSessionId = null) {
  const sessions = readJson(SESSION_STORAGE_KEY, []);
  if (!Array.isArray(sessions)) return null;
  for (const session of [...sessions].filter(item => item?.id !== excludedSessionId).sort(compareSessionsNewest)) {
    const performance = findExercisePerformance(session, exerciseId);
    if (hasValidPerformance(performance)) return { session, performance };
  }
  return null;
}

function formatPreviousSet(set) {
  if (!set) return "Hasn't started";
  return `${set.weight ?? '—'} × ${set.reps ?? '—'}`;
}

function formatPreviousSummary(performance) {
  const sets = getPreferredRecordedSets(performance);
  return sets.length ? sets.map(formatPreviousSet).join(' • ') : 'No previous performance recorded.';
}

function formatCardioPrevious(performance) {
  if (!performance) return "Hasn't started";
  const details = [];
  if (Number(performance.durationMinutes) > 0) details.push(`${performance.durationMinutes} min`);
  if (String(performance.distance || '').trim()) details.push(String(performance.distance).trim());
  if (String(performance.notes || '').trim()) details.push(String(performance.notes).trim());
  return details.length ? details.join(' • ') : 'No previous details recorded.';
}

function syncPreviousDisplay(card, source) {
  const performance = source?.performance || null;
  const summary = card.querySelector('.previous-performance span');
  if (card.dataset.trackingType === 'notes') {
    if (summary) summary.textContent = performance ? formatCardioPrevious(performance) : "Hasn't started";
    return;
  }
  const sets = performance ? getPreferredRecordedSets(performance) : [];
  if (summary) summary.textContent = performance ? formatPreviousSummary(performance) : 'No previous performance recorded.';
  card.querySelectorAll('.session-set-row').forEach((row, index) => {
    const previousSet = sets[index];
    const value = row.querySelector('.previous-set-value');
    if (value) value.textContent = formatPreviousSet(previousSet);
    const weight = row.querySelector('.session-weight');
    const reps = row.querySelector('.session-reps');
    if (weight) weight.placeholder = previousSet?.weight ?? 'Weight';
    if (reps) reps.placeholder = previousSet?.reps ?? 'Reps';
  });
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

function renderCard(card) {
  const logger = card.closest('#workout-session-logger');
  if (!logger) return;
  const exerciseId = card.dataset.exerciseId;
  if (!exerciseId) return;
  const excludedSessionId = logger.dataset.editingSessionId || null;
  const source = findPreviousPerformance(exerciseId, excludedSessionId);
  syncPreviousDisplay(card, source);

  if (card.dataset.trackingType !== 'reps') return;
  const prompt = ensurePrompt(card);
  if (excludedSessionId) {
    prompt.hidden = true;
    prompt.innerHTML = '';
    return;
  }

  const active = readJson(ACTIVE_WORKOUT_STORAGE_KEY, null);
  if (!active || !source) {
    prompt.hidden = true;
    prompt.innerHTML = '';
    return;
  }
  const exerciseIndex = Number(card.dataset.exerciseIndex);
  const planned = active?.planSnapshot?.days?.[active.trainingDayIndex]?.exercises?.[exerciseIndex];
  const upperBound = getRepRangeUpperBound(planned?.reps);
  if (!upperBound) {
    prompt.hidden = true;
    prompt.innerHTML = '';
    return;
  }

  const state = source.performance;
  const completedSets = Array.isArray(state?.sets)
    ? state.sets.filter(set => set?.completed && Number(set.reps) > 0)
    : [];
  if (!completedSets.length) {
    prompt.hidden = true;
    prompt.innerHTML = '';
    return;
  }
  const allAtTop = completedSets.every(set => Number(set.reps) >= upperBound);
  const anyExceeded = completedSets.some(set => Number(set.reps) > upperBound);
  if (!allAtTop && !anyExceeded) {
    prompt.hidden = true;
    prompt.innerHTML = '';
    return;
  }
  const sourceSet = [...completedSets]
    .filter(set => Number(set.reps) >= upperBound && Number(set.weight) > 0)
    .sort((a, b) => Number(b.weight) - Number(a.weight))[0];
  if (!sourceSet) {
    prompt.hidden = true;
    prompt.innerHTML = '';
    return;
  }

  const currentWeight = Number(sourceSet.weight);
  const range = getRecommendedLoadRange(currentWeight, exerciseId);
  if (!range) {
    prompt.hidden = true;
    return;
  }
  const plannedCount = Array.isArray(state.sets) ? state.sets.length : completedSets.length;
  const partial = completedSets.length < plannedCount ? ` with ${completedSets.length} of ${plannedCount} sets completed` : '';
  const maxReps = Math.max(...completedSets.map(set => Number(set.reps) || 0));
  const repText = anyExceeded
    ? `you exceeded the ${upperBound}-rep target and reached ${maxReps} reps`
    : `all completed sets reached at least ${upperBound} reps`;
  const increaseRange = range.minimumIncrease === range.maximumIncrease
    ? `${formatLoad(range.minimumIncrease)} lb`
    : `${formatLoad(range.minimumIncrease)}–${formatLoad(range.maximumIncrease)} lb`;
  const loadRange = range.minimumLoad === range.maximumLoad
    ? `${formatLoad(range.minimumLoad)} lb`
    : `${formatLoad(range.minimumLoad)}–${formatLoad(range.maximumLoad)} lb`;

  prompt.innerHTML = `
    <span class="progression-arrow">↑</span>
    <div>
      <strong>Increase weight this session</strong>
      <p>Last workout ${repText} at ${formatLoad(currentWeight)} lb${partial}. Recommended increase: <b>${increaseRange}</b>. Suggested load: <b>${loadRange}</b>.</p>
      <small>Start at the lower end of the range to see how it feels. The upper end is the largest practical equipment increment within 11%.</small>
    </div>
  `;
  prompt.hidden = false;
}

function refreshLogger(logger) {
  logger.querySelectorAll('.session-exercise-card').forEach(renderCard);
}

function bindLogger(logger) {
  if (!logger || logger.dataset.progressionV2Bound === 'true') return;
  logger.dataset.progressionV2Bound = 'true';
  const refresh = () => refreshLogger(logger);
  refresh();
  logger.addEventListener('click', event => {
    if (event.target.closest('.complete-set-btn')) setTimeout(refresh, 80);
  });
}

function scan() {
  const logger = document.getElementById('workout-session-logger');
  if (!logger) return;
  bindLogger(logger);
  refreshLogger(logger);
}

const observer = new MutationObserver(mutations => {
  const needsRefresh = mutations.some(mutation =>
    [...mutation.addedNodes].some(node =>
      node.nodeType === 1 && (
        node.id === 'workout-session-logger' ||
        node.matches?.('.session-exercise-card') ||
        node.querySelector?.('#workout-session-logger, .session-exercise-card')
      )
    )
  );
  if (needsRefresh) setTimeout(scan, 20);
});

observer.observe(document.body, { childList: true, subtree: true });
scan();
