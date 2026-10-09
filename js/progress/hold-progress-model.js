import { isStaticHold } from '../workouts/static-holds.js';
export function holdProgressRecords(sessions, exerciseId, {load = 0, minimumSeconds = 30, metric = 'strength'} = {}) {
  if (!isStaticHold(exerciseId)) return [];
  return sessions.flatMap(session => {
    const sets = (session.exercises || []).filter(exercise => exercise.exerciseId === exerciseId)
      .flatMap(exercise => exercise.sets || [])
      .filter(set => set.completed && !set.isWarmup && !set.warmup && Number(set.durationSeconds) > 0);
    const matching = sets.filter(set => metric === 'weight' ? Number(set.durationSeconds) >= minimumSeconds : Number(set.weight || 0) === Number(load));
    if (!matching.length) return [];
    return [{ date: session.date, completedAt: session.completedAt || '', sets: matching.length,
      bestSeconds: Math.max(...matching.map(set => Number(set.durationSeconds))),
      totalSeconds: matching.reduce((sum,set) => sum + Number(set.durationSeconds), 0),
      addedWeight: Math.max(...matching.map(set => Number(set.weight || 0))) }];
  }).sort((a,b) => String(a.date).localeCompare(String(b.date)) || a.completedAt.localeCompare(b.completedAt));
}
