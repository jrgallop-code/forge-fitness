const MOBILE_BREAKPOINT = 720;

function makeChevron() {
  return `<svg class="training-summary-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9.5 5 5 5-5"/></svg>`;
}

function installTrainingProgressDisclosure() {
  const lifting = document.getElementById('lifting-progress');
  if (!lifting || lifting.dataset.summaryDisclosureReady === 'true') return;

  const header = lifting.querySelector(':scope > .training-progress-header');
  const summaryGrid = lifting.querySelector(':scope > .training-summary-grid');
  if (!header || !summaryGrid) return;

  const description = header.querySelector('p')?.textContent?.trim() ||
    'Review strength, training volume and completed sessions.';
  const actions = header.querySelector('.training-header-actions');

  const details = document.createElement('details');
  details.className = 'training-progress-disclosure';
  details.open = window.matchMedia(`(min-width:${MOBILE_BREAKPOINT + 1}px)`).matches;
  details.innerHTML = `
    <summary aria-label="Show or hide training progress summary">
      <span class="training-summary-title-wrap">
        <strong>Training Progress</strong>
        <small>Workouts, sets, exercises & latest session</small>
      </span>
      <span class="training-summary-toggle" aria-hidden="true">${makeChevron()}</span>
    </summary>
    <div class="training-progress-disclosure-panel">
      <p class="training-summary-description"></p>
    </div>
  `;

  details.querySelector('.training-summary-description').textContent = description;
  const panel = details.querySelector('.training-progress-disclosure-panel');
  panel.appendChild(summaryGrid);
  if (actions) panel.appendChild(actions);

  header.replaceWith(details);
  lifting.dataset.summaryDisclosureReady = 'true';
}

function scheduleInstall() {
  window.requestAnimationFrame(installTrainingProgressDisclosure);
}

const content = document.getElementById('content');
if (content) {
  new MutationObserver(scheduleInstall).observe(content, { childList: true, subtree: true });
}

document.addEventListener('click', event => {
  if (event.target.closest?.('#lifting-tab, .progress-tab')) scheduleInstall();
}, true);

scheduleInstall();
