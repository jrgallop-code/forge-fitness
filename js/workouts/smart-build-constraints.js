export const MAX_WORKING_SETS = 4;

export function clampWorkingSets(value, fallback = 3) {
  const number = Number(value);
  return Math.max(2, Math.min(MAX_WORKING_SETS, Math.floor(Number.isFinite(number) && number > 0 ? number : fallback)));
}

// Template names describe the source plan. Generated days must describe the
// exercises that survived equipment filtering and resistance-only adaptation.
export function normalizeGeneratedDayNames(days, exerciseMap) {
  const upper = new Set(['Chest', 'Back', 'Lats', 'Shoulders', 'Rear Delts', 'Biceps', 'Triceps']);
  const lower = new Set(['Quads', 'Hamstrings', 'Glutes', 'Calves']);
  days.forEach((day, index) => {
    if (!/\b(cardio|rower)\b/i.test(String(day.name || ''))) return;
    const definitions = day.exercises.map(item => exerciseMap.get(item.id));
    if (definitions.some(exercise => exercise?.type === 'cardio' || exercise?.muscleGroup === 'Cardio')) return;
    if (!day.exercises.length) return;
    const muscles = day.exercises.map((item, i) => item.primaryMuscle || item.muscleGroup || definitions[i]?.muscleGroup);
    const hasUpper = muscles.some(muscle => upper.has(muscle));
    const hasLower = muscles.some(muscle => lower.has(muscle));
    const label = hasUpper && hasLower ? 'Full Body' : hasUpper ? 'Upper Body' : hasLower ? 'Lower Body' : 'Resistance Training';
    day.name = `Day ${index + 1} — ${label}`;
  });
}
