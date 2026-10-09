// Populate only missing regular-workout values after the exercise is confirmed.
export function applyImportExerciseDefaults(item, exercise, {kind, useDefaults = true} = {}) {
  if (kind !== 'regular' || !useDefaults || !exercise || !item?.match?.confirmed) return item;
  const previous = item.importDefaults || {};
  const applied = {...previous};
  for (const [field, value] of [['sets', exercise.defaultSets], ['reps', exercise.recommendedReps]]) {
    const missing = item[field] == null || String(item[field]).trim() === '';
    if ((missing || (field in previous && item[field] === previous[field])) && value != null && String(value).trim()) {
      item[field] = value;
      applied[field] = value;
    }
  }
  item.importDefaults = applied;
  return item;
}
