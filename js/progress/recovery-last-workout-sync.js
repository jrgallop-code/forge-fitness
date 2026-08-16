import { getRecoveryStates } from './recovery-secondary-muscles.js?v=recovery-secondary-6';

let queued = false;

function formatElapsed(hours) {
  if (!Number.isFinite(hours)) return 'No data';
  if (hours < 1) return '<1h ago';
  return `${Math.floor(hours)}h ago`;
}

function syncLastWorkoutSummary() {
  const node = document.getElementById('recovery-last-workout');
  if (!node) return;

  const latestHours = [...getRecoveryStates().values()]
    .map(state => Number(state?.hours))
    .filter(Number.isFinite)
    .reduce((lowest, hours) => Math.min(lowest, hours), Infinity);

  const text = formatElapsed(latestHours);
  if (node.textContent !== text) node.textContent = text;
}

function queueSync() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    syncLastWorkoutSummary();
  });
}

document.addEventListener('click', event => {
  if (event.target.closest?.('.training-progress-tab[data-view="recovery"], [data-recovery-facing], [data-recovery-map-button], [data-recovery-details-button], [data-recovery-mode]')) {
    queueSync();
  }
}, true);

const content = document.getElementById('content');
if (content) {
  new MutationObserver(() => {
    if (document.getElementById('recovery-last-workout')) queueSync();
  }).observe(content, { childList: true, subtree: true });
}

window.addEventListener('focus', queueSync);
window.setTimeout(queueSync, 0);
