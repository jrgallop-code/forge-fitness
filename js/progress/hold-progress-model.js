import { isStaticHold } from '../workouts/static-holds.js';
export function holdProgressRecords(sessions, exerciseId, {load = 0, minimumSeconds = 30, metric = 'strength'} = {}) {
  if (!isStaticHold(exerciseId)) return [];
  return sessions.flatMap(session => {
    if (session.status === "in_progress" || session.status === "draft") return [];
    const sets = (session.exercises || []).filter(exercise => exercise.exerciseId === exerciseId)
      .flatMap(exercise => exercise.sets || [])
      .filter(set => !set.isWarmup && !set.warmup && Number(set.durationSeconds) > 0);
    const matching = sets.filter(set => metric === 'weight' ? Number(set.durationSeconds) >= minimumSeconds : Number(set.weight || 0) === Number(load));
    if (!matching.length) return [];
    return [{ date: session.date, completedAt: session.completedAt || '', sets: matching.length,
      bestSeconds: Math.max(...matching.map(set => Number(set.durationSeconds))),
      totalSeconds: matching.reduce((sum,set) => sum + Number(set.durationSeconds), 0),
      addedWeight: Math.max(...matching.map(set => Number(set.weight || 0))) }];
  }).sort((a,b) => String(a.date).localeCompare(String(b.date)) || a.completedAt.localeCompare(b.completedAt));
}

// The picker must keep holds when range or tab refreshes rebuild its options.
export function hasExerciseProgressData(exercise) {
  if (!exercise || exercise.trackingType === 'notes') return false;
  return (exercise.sets || []).some(set => {
    if (!set || set.isWarmup || set.warmup) return false;
    if (isStaticHold(exercise)) return (Number(set.durationSeconds) > 0) || Number(set.reps) > 0;
    return Number(set.weight) > 0 && Number(set.reps) > 0;
  });
}

export function holdComparison(records, metric = 'strength') {
  const value = record => metric === 'weight' ? record.addedWeight : metric === 'volume' ? record.totalSeconds : record.bestSeconds;
  const latest = records.at(-1), previous = records.at(-2), first = records[0];
  if (!latest) return null;
  const latestValue = value(latest), previousValue = previous ? value(previous) : null;
  const baselineValue = value(first);
  const change = previous ? latestValue - previousValue : null;
  const baselineChange = previous ? latestValue - baselineValue : null;
  return {latest, previous, first, latestValue, previousValue, baselineValue, change, baselineChange,
    percent: previousValue > 0 ? change / previousValue * 100 : null,
    baselinePercent: previous && baselineValue > 0 ? baselineChange / baselineValue * 100 : null};
}
