import { getAllExercises } from './exercise-library.js?v=exercise-library-catalogue-2';

const SEARCH_PLACEHOLDER = 'Search exercises…';

function ensureStyles() {
  if (document.querySelector('link[data-exercise-search-styles]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/exercise-search.css?v=exercise-search-1';
  link.dataset.exerciseSearchStyles = 'true';
  document.head.appendChild(link);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function getMatches(query) {
  const term = normalize(query);
  const exercises = getAllExercises().slice().sort((a, b) =>
    String(a.muscleGroup || '').localeCompare(String(b.muscleGroup || '')) ||
    String(a.name || '').localeCompare(String(b.name || ''))
  );

  if (!term) return exercises;

  return exercises.filter(exercise => {
    const haystack = [
      exercise.name,
      exercise.muscleGroup,
      exercise.equipment,
      exercise.type
    ].map(normalize).join(' ');
    return haystack.includes(term);
  });
}

function buildOptions(query) {
  const matches = getMatches(query);
  const groups = new Map();

  matches.forEach(exercise => {
    const group = exercise.muscleGroup || 'Other';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(exercise);
  });

  const groupedOptions = [...groups.entries()].map(([group, exercises]) => `
    <optgroup label="${escapeHtml(group)}">
      ${exercises.map(exercise => `
        <option value="${escapeHtml(exercise.id)}">
          ${escapeHtml(exercise.name)}${exercise.isCustom ? ' — Custom' : ''}
        </option>
      `).join('')}
    </optgroup>
  `).join('');

  return {
    count: matches.length,
    html: `
      <option value="">${matches.length ? 'Choose Exercise' : 'No matching exercises'}</option>
      ${groupedOptions}
      <option value="__add_custom__">+ Add Custom Exercise</option>
    `
  };
}

function filterSelect(search, select, countLabel) {
  const previousValue = select.value;
  const result = buildOptions(search.value);
  select.innerHTML = result.html;

  if ([...select.options].some(option => option.value === previousValue)) {
    select.value = previousValue;
  }

  if (countLabel) {
    countLabel.textContent = search.value.trim()
      ? `${result.count} match${result.count === 1 ? '' : 'es'}`
      : '';
  }

  search.dataset.matchCount = String(result.count);
}

function enhanceRow(row) {
  if (!row || row.dataset.exerciseSearchEnhanced === 'true') return;
  const select = row.querySelector('.exercise-select');
  if (!select) return;

  row.dataset.exerciseSearchEnhanced = 'true';

  const searchWrap = document.createElement('div');
  searchWrap.className = 'exercise-search-wrap';

  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'exercise-search-input';
  search.placeholder = SEARCH_PLACEHOLDER;
  search.autocomplete = 'off';
  search.spellcheck = false;
  search.setAttribute('aria-label', 'Search exercise library');

  const count = document.createElement('span');
  count.className = 'exercise-search-count';
  count.setAttribute('aria-live', 'polite');

  searchWrap.append(search, count);
  select.insertAdjacentElement('beforebegin', searchWrap);

  search.addEventListener('input', () => filterSelect(search, select, count));

  search.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    const matches = getMatches(search.value);
    if (matches.length !== 1) return;
    event.preventDefault();
    select.value = matches[0].id;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });

  search.addEventListener('search', () => filterSelect(search, select, count));
}

function scanBuilder() {
  document.querySelectorAll('#workout-days .exercise-builder-row').forEach(enhanceRow);
}

function scheduleScan() {
  requestAnimationFrame(scanBuilder);
  setTimeout(scanBuilder, 60);
}

document.addEventListener('click', event => {
  if (event.target.closest('#new-plan-btn, .preset-plan-card, .add-exercise-btn, .remove-exercise-btn, #save-custom-exercise-btn, #cancel-custom-exercise-btn, #add-day-btn')) {
    scheduleScan();
  }
});

document.addEventListener('change', event => {
  if (event.target.closest('.exercise-select')) scheduleScan();
});

ensureStyles();
scanBuilder();
