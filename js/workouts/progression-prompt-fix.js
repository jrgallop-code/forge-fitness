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

function getRecommendedLoad(weight) {
  const current = Number(weight);
  if (!Number.isFinite(current) || current <= 0) return null;
  const lower = current * 1.02;
  const upper = current * 1.05;
  for (const increment of [5, 2.5, 1, 0.5]) {
    const candidate = Math.ceil((lower - 1e-9) / increment) * increment;
    if (candidate <= upper + 1e-9) return Number(candidate.toFixed(1));
  }
  return Number((Math.round(lower * 2) / 2).toFixed(1));
}

function formatLoad(value) {
  return Number.isInteger(value) ? String(value) : Number(value).toFixed(1);
}

function findPreviousQualifyingSet(active, exerciseIndex, upperBound) {
  const planned = active?.planSnapshot?.days?.[active.trainingDayIndex]?.exercises?.[exerciseIndex];
  const exerciseId = planned?.id;
  if (!exerciseId) return null;

  const sessions = readJson(SESSION_STORAGE_KEY, []);
  if (!Array.isArray(sessions)) return null;

  const matching = sessions
    .filter(session => session?.planId === active.planId && Number(session.trainingDayIndex) === Number(active.trainingDayIndex))
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

  const active = readJson(ACTIVE_WORKOUT_STORAGE_KEY, null);
  if (!active) return;

  const exerciseIndex = Number(card.dataset.exerciseIndex);
  const planned = active?.planSnapshot?.days?.[active.trainingDayIndex]?.exercises?.[exerciseIndex];
  const upperBound = getRepRangeUpperBound(planned?.reps);
  const prompt = ensurePrompt(card);
  if (!upperBound) {
    prompt.hidden = true;
    return;
  }

  const state = active?.exercises?.[exerciseIndex];
  let source = null;
  let sourceLabel = 'You reached';

  if (state && Array.isArray(state.sets)) {
    const currentQualifying = state.sets
      .filter(set => set?.completed && Number(set.reps) >= upperBound && Number(set.weight) > 0)
      .sort((a, b) => Number(b.weight) - Number(a.weight))[0];
    if (currentQualifying) {
      source = {
        set: currentQualifying,
        completedCount: state.sets.filter(set => set?.completed).length,
        plannedCount: state.sets.length
      };
    }
  }

  if (!source) {
    source = findPreviousQualifyingSet(active, exerciseIndex, upperBound);
    sourceLabel = 'Last workout reached';
  }

  if (!source) {
    prompt.hidden = true;
    return;
  }

  const currentWeight = Number(source.set.weight);
  const nextWeight = getRecommendedLoad(currentWeight);
  if (!nextWeight || nextWeight <= currentWeight) {
    prompt.hidden = true;
    return;
  }

  const pct = ((nextWeight / currentWeight) - 1) * 100;
  const partial = source.completedCount < source.plannedCount
    ? ` with ${source.completedCount} of ${source.plannedCount} sets completed`
    : '';

  prompt.innerHTML = `
    <span class="progression-arrow">↑</span>
    <div>
      <strong>Increase weight this session</strong>
      <p>${sourceLabel} ${upperBound} reps at ${formatLoad(currentWeight)} lb${partial}. Recommended load for this session: <b>${formatLoad(nextWeight)} lb</b> (+${pct.toFixed(1)}%).</p>
      <small>Recommended increase: about 2–5% after reaching the top of the programmed rep range.</small>
    </div>
  `;
  prompt.hidden = false;
}

function enhanceLogger(logger) {
  if (!logger || logger.dataset.progressionFixBound === 'true') return;
  logger.dataset.progressionFixBound = 'true';

  const refresh = () => logger
    .querySelectorAll('.session-exercise-card[data-tracking-type="reps"]')
    .forEach(renderPrompt);

  refresh();
  logger.addEventListener('input', event => {
    if (event.target.matches('.session-weight, .session-reps')) setTimeout(refresh, 0);
  });
  logger.addEventListener('click', event => {
    if (event.target.closest('.complete-set-btn')) setTimeout(refresh, 20);
  });
}

function scan() {
  const logger = document.getElementById('workout-session-logger');
  if (logger) enhanceLogger(logger);
}

const observer = new MutationObserver(mutations => {
  if (mutations.some(mutation => [...mutation.addedNodes].some(node => node.nodeType === 1 && (node.id === 'workout-session-logger' || node.querySelector?.('#workout-session-logger'))))) {
    scan();
  }
});
observer.observe(document.body, { childList: true, subtree: true });
scan();
