// Only confirmed static holds use seconds. Dynamic exercises retain repetitions.
export const STATIC_HOLD_IDS = new Set(['plank', 'side-plank', 'copenhagen-plank']);
export function isStaticHold(exercise) {
  return STATIC_HOLD_IDS.has(typeof exercise === 'string' ? exercise : exercise?.exerciseId || exercise?.id);
}
export function holdTrackingType(exercise) { return isStaticHold(exercise) ? 'duration' : 'reps'; }
export function holdSeconds(value) {
  if (value === '' || value === null || value === undefined) return null;
  const text = String(value).trim();
  const match = text.match(/^(\d+):(\d{1,2})$/);
  const seconds = match ? Number(match[1]) * 60 + Number(match[2]) : Number(text);
  return Number.isFinite(seconds) && seconds >= 0 && (!match || Number(match[2]) < 60) ? Math.round(seconds) : null;
}
export function holdTarget(value, fallback = '20-60 sec') {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return /sec|min|:/i.test(text) ? text : `${text.replace(/\s*reps?\s*$/i, '')} sec`;
}
export function elapsedHoldSeconds(set, now = Date.now()) {
  return set?.holdStartedAt ? Math.max(0, Math.floor((now - set.holdStartedAt) / 1000)) : holdSeconds(set?.durationSeconds);
}
export function stopHoldTimer(set, now = Date.now()) {
  if (!set?.holdStartedAt) return;
  set.durationSeconds = elapsedHoldSeconds(set, now);
  delete set.holdStartedAt;
}
export function bindHoldRows(container, state, persist) {
  const rows = container.matches('[data-hold-set]') ? [container] : [...container.querySelectorAll('[data-hold-set]')];
  const mode = container.querySelector('[data-hold-load-mode]');
  const syncMode = () => {
    rows.forEach(row => {
      const set = state.sets[Number(row.dataset.holdSet)];
      const weight = row.querySelector('.session-weight');
      const weighted = (set.loadMode || state.loadMode || (Number(set.weight) > 0 ? 'weighted' : 'bodyweight')) === 'weighted';
      if (weight) { weight.disabled = !weighted; weight.placeholder = weighted ? 'Added weight' : 'Bodyweight'; weight.value = weighted ? set.weight ?? '' : ''; }
    });
  };
  mode?.addEventListener('change', () => {
    state.loadMode = mode.value;
    for (const row of rows) { const set = state.sets[Number(row.dataset.holdSet)]; set.loadMode = mode.value; if (mode.value === 'bodyweight') set.weight = 0; }
    syncMode(); persist();
  });
  rows.forEach(row => {
    const set = state.sets[Number(row.dataset.holdSet)];
    const input = row.querySelector('[data-hold-time]');
    const button = row.querySelector('[data-hold-timer]');
    input?.addEventListener('input', () => { delete set.holdStartedAt; set.durationSeconds = holdSeconds(input.value); persist(); });
    button?.addEventListener('click', () => {
      if (set.holdStartedAt) stopHoldTimer(set);
      else set.holdStartedAt = Date.now();
      persist(); refresh();
    });
    row.querySelector('.complete-set-btn')?.addEventListener('click', () => { stopHoldTimer(set); refresh(); }, true);
    row.querySelector('[data-round-check]')?.addEventListener('change', () => { stopHoldTimer(set); refresh(); }, true);
  });
  function refresh() {
    rows.forEach(row => {
      const set = state.sets[Number(row.dataset.holdSet)];
      const input = row.querySelector('[data-hold-time]');
      const button = row.querySelector('[data-hold-timer]');
      if (input && document.activeElement !== input) input.value = elapsedHoldSeconds(set) ?? '';
      if (button) { button.textContent = set.holdStartedAt ? 'Stop' : 'Timer'; button.disabled = Boolean(set.completed); }
    });
  }
  syncMode(); refresh();
  const tick = () => { if (!container.isConnected) return; refresh(); setTimeout(tick, 250); };
  setTimeout(tick, 250);
}
export function holdTimeField(set, index) {
  return `<div class="hold-time-entry"><input class="session-duration" data-hold-time type="number" inputmode="numeric" min="0" step="1" value="${elapsedHoldSeconds(set) ?? ''}" placeholder="Seconds" aria-label="Set ${index + 1} time in seconds"><button type="button" class="secondary-btn hold-timer-btn" data-hold-timer>${set.holdStartedAt ? 'Stop' : 'Timer'}</button></div>`;
}
export function holdLoadControl(state) {
  const mode = state.loadMode || (state.sets?.some(set => Number(set.weight) > 0) ? 'weighted' : 'bodyweight');
  return `<label class="hold-load-control">Load <select data-hold-load-mode aria-label="Hold load"><option value="bodyweight" ${mode === 'bodyweight' ? 'selected' : ''}>Bodyweight</option><option value="weighted" ${mode === 'weighted' ? 'selected' : ''}>Weighted</option></select></label>`;
}
