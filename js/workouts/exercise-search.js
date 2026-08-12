import { getAllExercises, getExerciseById } from './exercise-library.js?v=exercise-library-catalogue-2';

const SEARCH_PLACEHOLDER = 'Search exercises…';

function ensureStyles() {
  if (document.querySelector('link[data-exercise-search-styles]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/exercise-search.css?v=exercise-search-3';
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
  return exercises.filter(exercise => [exercise.name, exercise.muscleGroup, exercise.equipment, exercise.type].map(normalize).join(' ').includes(term));
}

function buildOptions(query) {
  const matches = getMatches(query);
  const groups = new Map();
  matches.forEach(exercise => {
    const group = exercise.muscleGroup || 'Other';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(exercise);
  });
  return {
    html: `<option value="">${matches.length ? 'Choose Exercise' : 'No matching exercises'}</option>${[...groups.entries()].map(([group, exercises]) => `<optgroup label="${escapeHtml(group)}">${exercises.map(exercise => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(exercise.name)}${exercise.isCustom ? ' — Custom' : ''}</option>`).join('')}</optgroup>`).join('')}<option value="__add_custom__">+ Add Custom Exercise</option>`
  };
}

function renderResults(search, panel) {
  const matches = getMatches(search.value);
  const groups = new Map();
  matches.forEach(exercise => {
    const group = exercise.muscleGroup || 'Other';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(exercise);
  });
  const results = matches.length ? [...groups.entries()].map(([group, exercises]) => `
    <section class="exercise-search-group">
      <div class="exercise-search-group-label">${escapeHtml(group)}</div>
      ${exercises.map(exercise => `<button class="exercise-search-result" type="button" data-exercise-id="${escapeHtml(exercise.id)}"><span class="exercise-search-result-main">${escapeHtml(exercise.name)}${exercise.isCustom ? ' — Custom' : ''}</span><span class="exercise-search-result-meta">${escapeHtml(exercise.equipment || '')}</span></button>`).join('')}
    </section>`).join('') : '<div class="exercise-search-empty">No matching exercises</div>';
  panel.innerHTML = `${results}<button class="exercise-search-custom" type="button" data-add-custom-exercise>+ Add Custom Exercise</button>`;
  panel.hidden = false;
}

function filterSelect(search, select) {
  const previousValue = select.value;
  select.innerHTML = buildOptions(search.value).html;
  if ([...select.options].some(option => option.value === previousValue)) select.value = previousValue;
}

function enhanceRow(row) {
  if (!row || row.dataset.exerciseSearchEnhanced === 'true') return;
  const select = row.querySelector('.exercise-select');
  if (!select) return;
  row.dataset.exerciseSearchEnhanced = 'true';
  select.classList.add('exercise-select-internal');
  select.setAttribute('aria-hidden', 'true');
  select.tabIndex = -1;

  const searchWrap = document.createElement('div');
  searchWrap.className = 'exercise-search-wrap';
  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'exercise-search-input';
  search.placeholder = SEARCH_PLACEHOLDER;
  search.autocomplete = 'off';
  search.spellcheck = false;
  search.setAttribute('aria-label', 'Search exercise library');
  search.setAttribute('aria-expanded', 'false');
  const selectedExercise = getExerciseById(select.value);
  if (selectedExercise) search.value = selectedExercise.name;

  const panel = document.createElement('div');
  panel.className = 'exercise-search-results';
  panel.hidden = true;
  searchWrap.append(search, panel);
  select.insertAdjacentElement('beforebegin', searchWrap);

  const openResults = () => { renderResults(search, panel); search.setAttribute('aria-expanded', 'true'); };
  const closeResults = () => { panel.hidden = true; search.setAttribute('aria-expanded', 'false'); };

  search.addEventListener('focus', () => { search.select(); openResults(); });
  search.addEventListener('input', () => { filterSelect(search, select); openResults(); });
  search.addEventListener('search', () => { filterSelect(search, select); openResults(); });
  search.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeResults(); search.blur(); return; }
    if (event.key !== 'Enter') return;
    const matches = getMatches(search.value);
    if (matches.length !== 1) return;
    event.preventDefault();
    select.value = matches[0].id;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    closeResults();
  });

  panel.addEventListener('click', event => {
    if (event.target.closest('[data-add-custom-exercise]')) {
      select.value = '__add_custom__';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      closeResults();
      return;
    }
    const result = event.target.closest('.exercise-search-result');
    if (!result) return;
    select.value = result.dataset.exerciseId || '';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    closeResults();
  });

  document.addEventListener('pointerdown', event => {
    if (!searchWrap.contains(event.target)) closeResults();
  });
}

function scanBuilder() { document.querySelectorAll('#workout-days .exercise-builder-row').forEach(enhanceRow); }
function scheduleScan() { requestAnimationFrame(scanBuilder); setTimeout(scanBuilder, 60); }
document.addEventListener('click', event => {
  if (event.target.closest('#new-plan-btn, .preset-plan-card, .add-exercise-btn, .remove-exercise-btn, #save-custom-exercise-btn, #cancel-custom-exercise-btn, #add-day-btn')) scheduleScan();
});
document.addEventListener('change', event => { if (event.target.closest('.exercise-select')) scheduleScan(); });
ensureStyles();
scanBuilder();
