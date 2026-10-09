// Circuit data never enters the regular strength-history store.
export const CIRCUIT_SESSION_KEY = 'level_up_circuit_sessions_v1';
export const CIRCUIT_PROGRESS_NOTE = 'Circuit results are tracked separately. They do not affect lifting charts, strength PRs, estimated 1RM, or regular workout weights and progression.';
export function isCircuit(value) {
  return value?.trainingContext === 'circuit' || Boolean(value?.circuitId) || value?.planSnapshot?.trainingContext === 'circuit';
}
export function readCircuitSessions(storage = localStorage) {
  try { const data = JSON.parse(storage.getItem(CIRCUIT_SESSION_KEY) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; }
}
export function sessionStorageKey(session) { return isCircuit(session) ? CIRCUIT_SESSION_KEY : 'forge_workout_sessions'; }
export function tagCircuitSession(session, plan = session?.planSnapshot) {
  if (!isCircuit(session) && !isCircuit(plan)) return session;
  const circuitId = session.circuitId || plan?.circuitId || plan?.id;
  session.trainingContext = 'circuit'; session.circuitId = circuitId;
  for (const exercise of session.exercises || []) {
    exercise.trainingContext = 'circuit'; exercise.circuitId = circuitId;
    for (const set of exercise.sets || []) {
      set.trainingContext = 'circuit'; set.circuitId = circuitId;
      for (const drop of set.dropSets || []) { drop.trainingContext = 'circuit'; drop.circuitId = circuitId; }
    }
  }
  return session;
}
export function circuitRoundsCompleted(session) {
  const exercises = (session?.exercises || []).filter(exercise => exercise.sets?.length);
  if (!exercises.length) return 0;
  const rounds = Math.max(...exercises.map(exercise => exercise.sets.length));
  let total = 0;
  for (let i = 0; i < rounds; i++) if (exercises.every(exercise => exercise.sets[i]?.completed === true)) total++;
  return total;
}
export function circuitPreviousPerformance(circuitId, exerciseId, excludedId = null, storage = localStorage) {
  const sessions = readCircuitSessions(storage).filter(session => session.circuitId === circuitId && session.id !== excludedId)
    .sort((a,b) => String(b.completedAt || b.date || '').localeCompare(String(a.completedAt || a.date || '')));
  for (const session of sessions) {
    const exercise = session.exercises?.find(item => item.exerciseId === exerciseId);
    if (exercise?.sets?.some(set => set.completed && (Number(set.reps) > 0 || Number(set.durationSeconds) > 0))) return { ...exercise, sets: exercise.sets.map(set => set.completed ? set : {}) };
  }
  return null;
}
export function circuitRoundTransition(active, members, completedIndex) {
  for (const member of members) {
    if (active.exercises?.[member.index]?.sets?.[completedIndex]?.completed !== true) return { exerciseIndex: member.index, setIndex: completedIndex, rest: false };
  }
  const rounds = Math.max(0, ...members.map(member => active.exercises?.[member.index]?.sets?.length || 0));
  for (let round = 0; round < rounds; round++) for (const member of members) {
    const set = active.exercises?.[member.index]?.sets?.[round];
    if (set && !set.completed) return { exerciseIndex: member.index, setIndex: round, rest: true };
  }
  return null;
}
