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
export function activeHoldSetIndex(state, indices = (state.sets || []).map((_,index) => index)) {
  const running = indices.find(index => state.sets[index]?.holdStartedAt);
  if (running !== undefined) return running;
  const selected = Number(state.currentHoldSetIndex);
  if (Number.isInteger(selected) && indices.includes(selected) && !state.sets[selected]?.completed) return selected;
  return indices.find(index => !state.sets[index]?.completed) ?? -1;
}
export function holdTimerControl() {
  return `<div class="hold-stopwatch"><div class="hold-stopwatch-copy"><strong data-hold-current-set>Set 1</strong><span data-hold-clock>00:00</span></div><button type="button" class="secondary-btn" data-hold-timer>Start timer</button></div>`;
}
export function bindHoldRows(container, state, persist) {
  const rows = container.matches('[data-hold-set]') ? [container] : [...container.querySelectorAll('[data-hold-set]')];
  const indices = rows.map(row => Number(row.dataset.holdSet));
  const mode = container.querySelector('[data-hold-load-mode]');
  const button = container.querySelector('[data-hold-timer]');
  const currentLabel = container.querySelector('[data-hold-current-set]');
  const clock = container.querySelector('[data-hold-clock]');
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
    const index = Number(row.dataset.holdSet);
    const set = state.sets[index];
    const input = row.querySelector('[data-hold-time]');
    const select = () => { state.currentHoldSetIndex = index; refresh(); persist(); };
    input?.addEventListener('focus', select);
    row.querySelector('.session-weight')?.addEventListener('focus', select);
    input?.addEventListener('input', () => { delete set.holdStartedAt; set.durationSeconds = holdSeconds(input.value); state.currentHoldSetIndex = index; persist(); refresh(); });
    const complete = () => { stopHoldTimer(set); queueMicrotask(refresh); };
    row.querySelector('.complete-set-btn')?.addEventListener('click', complete, true);
    row.querySelector('[data-round-check]')?.addEventListener('change', complete, true);
  });
  button?.addEventListener('click', () => {
    const index = activeHoldSetIndex(state, indices);
    if (index < 0) return;
    const set = state.sets[index];
    state.currentHoldSetIndex = index;
    if (set.holdStartedAt) stopHoldTimer(set);
    else set.holdStartedAt = Date.now();
    persist(); refresh();
  });
  function refresh() {
    const current = activeHoldSetIndex(state, indices);
    rows.forEach(row => {
      const index = Number(row.dataset.holdSet);
      const set = state.sets[index];
      const input = row.querySelector('[data-hold-time]');
      if (input && document.activeElement !== input) input.value = elapsedHoldSeconds(set) ?? '';
      row.classList.toggle('hold-current-set', index === current);
    });
    const set = state.sets[current];
    const label = current < 0 ? 'All sets completed' : `Set ${current + 1}`;
    if (currentLabel && currentLabel.textContent !== label) currentLabel.textContent = label;
    if (clock) {
      const seconds = elapsedHoldSeconds(set) || 0;
      const time = `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`;
      if (clock.textContent !== time) clock.textContent = time;
    }
    if (button) {
      const text = set?.holdStartedAt ? 'Stop timer' : 'Start timer';
      if (button.textContent !== text) button.textContent = text;
      if (button.disabled !== (current < 0)) button.disabled = current < 0;
    }
  }
  syncMode(); refresh();
  const tick = () => { if (!container.isConnected) return; refresh(); setTimeout(tick, 250); };
  setTimeout(tick, 250);
}
export function holdTimeField(set, index) {
  return `<input class="session-duration" data-hold-time type="number" inputmode="numeric" min="0" step="1" value="${elapsedHoldSeconds(set) ?? ''}" placeholder="sec" aria-label="Set ${index + 1} time in seconds">`;
}
export function holdLoadControl(state) {
  const mode = state.loadMode || (state.sets?.some(set => Number(set.weight) > 0) ? 'weighted' : 'bodyweight');
  return `<label class="hold-load-control">Load <select data-hold-load-mode aria-label="Hold load"><option value="bodyweight" ${mode === 'bodyweight' ? 'selected' : ''}>Bodyweight</option><option value="weighted" ${mode === 'weighted' ? 'selected' : ''}>Weighted</option></select></label>`;
}
