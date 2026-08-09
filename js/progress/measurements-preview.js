const MEASUREMENTS_STORAGE_KEY = 'level_up_body_measurements';

const SAMPLE_ENTRIES = [
  { date: '2026-06-15', neck: 15.2, shoulders: 47.0, chest: 40.0, waist: 33.5, hips: 38.5, upperArm: 13.6, forearm: 11.5, thigh: 22.5, calf: 14.7 },
  { date: '2026-07-13', neck: 15.3, shoulders: 47.5, chest: 40.5, waist: 32.8, hips: 38.2, upperArm: 13.9, forearm: 11.6, thigh: 22.7, calf: 14.8 },
  { date: '2026-08-09', neck: 15.4, shoulders: 48.0, chest: 41.0, waist: 32.2, hips: 38.0, upperArm: 14.1, forearm: 11.8, thigh: 23.0, calf: 14.9 }
];

const FIELDS = [
  ['neck', 'Neck'],
  ['shoulders', 'Shoulders'],
  ['chest', 'Chest'],
  ['waist', 'Waist'],
  ['hips', 'Hips'],
  ['upperArm', 'Upper arm'],
  ['forearm', 'Forearm'],
  ['thigh', 'Thigh'],
  ['calf', 'Calf']
];

function hasRealEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MEASUREMENTS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) && parsed.some(entry => entry?.date);
  } catch {
    return false;
  }
}

function diff(current, previous) {
  const a = Number(current);
  const b = Number(previous);
  return Number.isFinite(a) && Number.isFinite(b) ? Number((a - b).toFixed(1)) : null;
}

function changeMarkup(value) {
  if (value === null) return '--';
  if (Math.abs(value) < 0.05) return '<span class="measurement-flat">→ 0.0 in</span>';
  const cls = value > 0 ? 'measurement-up' : 'measurement-down';
  const arrow = value > 0 ? '↑' : '↓';
  return `<span class="${cls}">${arrow} ${Math.abs(value).toFixed(1)} in</span>`;
}

function formatDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function totalChange(current, first) {
  return Number(FIELDS.reduce((sum, [key]) => sum + (diff(current[key], first[key]) || 0), 0).toFixed(1));
}

function removeGraphic(page) {
  page.querySelectorAll('.measurement-figure, .measurement-view-tabs').forEach(element => element.remove());
  const guideLayout = page.querySelector('.measurement-guide-layout');
  if (guideLayout) guideLayout.classList.add('measurement-guide-text-only');
}

function addSampleBadge(page) {
  if (page.querySelector('.measurement-sample-note')) return;
  const progressCard = page.querySelector('.measurement-progress-card');
  if (!progressCard) return;
  progressCard.insertAdjacentHTML('afterbegin', `
    <div class="measurement-sample-note">
      <strong>SAMPLE DATA</strong>
      <span>Preview only — these measurements are not saved to your history.</span>
    </div>
  `);
}

function renderSample(page) {
  if (hasRealEntries()) {
    page.querySelector('.measurement-sample-note')?.remove();
    return;
  }

  const first = SAMPLE_ENTRIES[0];
  const previous = SAMPLE_ENTRIES[SAMPLE_ENTRIES.length - 2];
  const latest = SAMPLE_ENTRIES[SAMPLE_ENTRIES.length - 1];

  const latestDate = page.querySelector('#measurements-latest-date');
  if (latestDate) latestDate.textContent = formatDate(latest.date);

  const netEl = page.querySelector('#measurements-total-change');
  if (netEl) {
    const net = totalChange(latest, first);
    netEl.textContent = `${net > 0 ? '+' : ''}${net.toFixed(1)} in`;
    netEl.className = net > 0 ? 'measurement-up' : net < 0 ? 'measurement-down' : 'measurement-flat';
  }

  const body = page.querySelector('#measurement-progress-body');
  if (body) {
    body.innerHTML = FIELDS.map(([key, label]) => {
      const lastChange = diff(latest[key], previous[key]);
      const sinceStart = diff(latest[key], first[key]);
      return `
        <div class="measurement-progress-row">
          <strong>${label}</strong>
          <span>${Number(latest[key]).toFixed(1)} in</span>
          ${changeMarkup(lastChange)}
          ${changeMarkup(sinceStart)}
        </div>
      `;
    }).join('');
  }

  const history = page.querySelector('#measurement-history-list');
  if (history) {
    history.innerHTML = [...SAMPLE_ENTRIES].reverse().map(entry => {
      const net = totalChange(entry, first);
      return `
        <div class="weight-history-row measurement-history-row">
          <span>${formatDate(entry.date)}</span>
          <span>9 areas</span>
          <span>${changeMarkup(net)}</span>
          <span class="measurement-row-actions"><small>Sample</small></span>
        </div>
      `;
    }).join('');
  }

  addSampleBadge(page);
}

function enhanceMeasurements() {
  const page = document.querySelector('.measurements-page');
  if (!page) return;
  removeGraphic(page);
  renderSample(page);
}

const observer = new MutationObserver(() => enhanceMeasurements());
observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener('storage', enhanceMeasurements);
document.addEventListener('click', event => {
  if (event.target.closest('#save-measurements-btn, [data-delete-measurement]')) {
    setTimeout(enhanceMeasurements, 30);
  }
});

enhanceMeasurements();
