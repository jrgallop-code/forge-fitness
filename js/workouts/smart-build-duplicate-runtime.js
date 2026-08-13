// Smart Build duplicate exercise runtime guard.
// This module is intentionally isolated from the generator so it can be removed easily.

function getDayExerciseNames(day) {
  return [...day.querySelectorAll('.smart-review-exercise strong')]
    .map(node => String(node.textContent || '').trim().toLowerCase())
    .filter(Boolean);
}

function hasDuplicateNames(day) {
  const names = getDayExerciseNames(day);
  return new Set(names).size !== names.length;
}

function replaceFirstDuplicate(day) {
  const seen = new Set();
  const rows = [...day.querySelectorAll('.smart-review-exercise')];
  for (const row of rows) {
    const name = String(row.querySelector('strong')?.textContent || '').trim().toLowerCase();
    if (!name) continue;
    if (seen.has(name)) {
      row.querySelector('[data-replace-exercise]')?.click();
      return true;
    }
    seen.add(name);
  }
  return false;
}

function enforceUniqueExercises(attempt = 0) {
  const wizard = document.querySelector('[data-smart-build-wizard]');
  if (!wizard || wizard.hidden || attempt > 12) return;
  const duplicateDay = [...wizard.querySelectorAll('.smart-review-day')].find(hasDuplicateNames);
  if (!duplicateDay) return;
  if (!replaceFirstDuplicate(duplicateDay)) return;
  window.setTimeout(() => enforceUniqueExercises(attempt + 1), 0);
}

document.addEventListener('click', event => {
  if (event.target.closest?.('[data-smart-next], [data-smart-regenerate], [data-replace-exercise]')) {
    window.setTimeout(() => enforceUniqueExercises(), 0);
  }
}, true);
