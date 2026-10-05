import { isCircuit } from '../workouts/circuit-history.js';
import { calculatePrCounts } from '../workouts/workout-pr-badges.js';

export const GOALS_KEY = 'level_up_lifting_goals_v1';
export const BADGES_KEY = 'level_up_training_badges_v1';
export const BADGES = [
  { id: 'first', name: 'First Workout', description: 'Complete your first workout. Lifting and circuits both count.', threshold: 1, metric: 'sessions', art: 'shoe' },
  { id: 'three', name: 'Getting Started', description: 'Complete three workouts. Every session is a step forward.', threshold: 3, metric: 'sessions', art: 'dumbbells' },
  { id: 'pr', name: 'First PR', description: 'Beat a previous lifting record for weight, reps, or estimated 1RM on the same exercise and machine. Circuit sets do not count.', threshold: 1, metric: 'prs', art: 'trophy' },
  { id: 'two-weeks', name: 'Two Weeks Strong', description: 'Complete at least one workout in each of two consecutive Monday–Sunday weeks. Rest days are encouraged.', threshold: 2, metric: 'weeks', art: 'calendar' },
  { id: 'four-weeks', name: 'Building a Habit', description: 'Complete at least one workout in each of four consecutive Monday–Sunday weeks. Your earned badge stays with you if a later week is missed.', threshold: 4, metric: 'weeks', art: 'plant' },
  { id: 'ten', name: 'Ten Workouts', description: 'Complete ten workouts. Lifting and circuit sessions both count.', threshold: 10, metric: 'sessions', art: 'plate' }
];

export function readJson(key, fallback, storage = localStorage) {
  try { return JSON.parse(storage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}
export function validWorkingSet(set) {
  return Boolean(set && !isCircuit(set) && !set.isWarmup && !set.warmup && set.type !== 'warmup' && set.completed !== false && Number(set.reps) > 0 && Number.isFinite(Number(set.weight)) && Number(set.weight) >= 0);
}
export function completedSessions(sessions) {
  const seen = new Set();
  return (Array.isArray(sessions) ? sessions : []).filter(session => {
    if (!session?.id || !session.completedAt || seen.has(session.id)) return false;
    const meaningful = (session.exercises || []).some(exercise => (exercise.sets || []).some(set => set.completed !== false && !set.isWarmup && !set.warmup && (Number(set.reps) > 0 || Number(set.durationSeconds) > 0 || Number(set.durationMinutes) > 0 || Number(set.distance) > 0)));
    if (!meaningful) return false;
    seen.add(session.id); return true;
  });
}
function dayDate(session) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(session.date || '') ? new Date(`${session.date}T12:00:00`) : new Date(session.completedAt);
  return Number.isFinite(date.getTime()) ? date : null;
}
function weekNumber(date) {
  // UTC calendar arithmetic avoids DST changing the length of a week.
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((utc - 4 * 86400000) / (7 * 86400000));
}
export function badgeMetrics(sessions, now = new Date()) {
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const valid = completedSessions(sessions).filter(s => { const date=dayDate(s); return date && date <= endOfToday; });
  const weeks = [...new Set(valid.map(dayDate).filter(Boolean).map(weekNumber))].sort((a,b) => a-b);
  let bestWeeks = 0, run = 0, previous = null;
  for (const week of weeks) { run = previous === week-1 ? run+1 : 1; bestWeeks = Math.max(bestWeeks, run); previous = week; }
  const currentWeek = weekNumber(now);
  let currentWeeks = 0, cursor = weeks.includes(currentWeek) ? currentWeek : currentWeek-1;
  while (weeks.includes(cursor--)) currentWeeks++;
  const lifting = valid.filter(s => !isCircuit(s)).map(s => ({ ...s, exercises: (s.exercises || []).filter(e => !isCircuit(e)).map(e => ({ ...e, sets: (e.sets || []).filter(validWorkingSet) })) }));
  const prs = [...calculatePrCounts(lifting).values()].reduce((a,b) => a+b, 0);
  return { sessions: valid.length, weeks: bestWeeks, currentWeeks, prs };
}
export function reconcileBadges(sessions, { storage = localStorage, now = new Date(), notify = false, sessionId = null } = {}) {
  const metrics = badgeMetrics(sessions, now);
  const previous = readJson(BADGES_KEY, {}, storage);
  const earned = previous.earned && typeof previous.earned === 'object' ? { ...previous.earned } : {};
  const newlyEarned = [];
  for (const badge of BADGES) if (!earned[badge.id] && metrics[badge.metric] >= badge.threshold) {
    earned[badge.id] = { earnedAt: now.toISOString(), sessionId: notify ? sessionId : null };
    if (notify) newlyEarned.push(badge.id);
  }
  const next = { version: 1, earned };
  if (JSON.stringify(previous) !== JSON.stringify(next)) storage.setItem(BADGES_KEY, JSON.stringify(next));
  return { earned, metrics, newlyEarned };
}

export function readGoals(storage = localStorage) {
  const goals = readJson(GOALS_KEY, [], storage);
  return Array.isArray(goals) ? goals.filter(g => g?.id && g?.exerciseId) : [];
}
export function matchingSets(sessions, exerciseId, equipmentProfileId = 'default', since = null) {
  return completedSessions(sessions).filter(s => !isCircuit(s) && (!since || Date.parse(s.completedAt) >= Date.parse(since))).flatMap(session =>
    (session.exercises || []).filter(e => !isCircuit(e) && (e.exerciseId || e.id) === exerciseId && (e.equipmentProfileId || 'default') === equipmentProfileId)
      .flatMap(e => (e.sets || []).filter(validWorkingSet).map(set => ({ weight: Number(set.weight), reps: Number(set.reps), date: session.date, sessionId: session.id })))
  );
}
export function goalProgress(goal, sessions) {
  const target = Number(goal.targetWeight), reps = Number(goal.targetReps) || 1;
  const qualifying = matchingSets(sessions, goal.exerciseId, goal.equipmentProfileId, goal.createdAt).filter(s => s.reps >= reps);
  const bestSet = qualifying.sort((a,b) => b.weight-a.weight || b.reps-a.reps)[0] || null;
  const baseline = Math.max(0, Number(goal.baselineWeight) || 0);
  const best = Math.max(baseline, bestSet?.weight || 0);
  const reached = best >= target - 0.00001;
  const percent = reached ? 100 : target > baseline ? Math.min(99, Math.round(Math.max(0, (best-baseline)/(target-baseline)) * 100)) : 0;
  return { percent, best, bestSet, reached };
}
export function saveGoal(input, sessions, storage = localStorage, now = new Date()) {
  const targetWeight = Number(input.targetWeight), targetReps = input.targetReps == null || input.targetReps === '' ? null : Number(input.targetReps);
  if (!input.exerciseId || !Number.isFinite(targetWeight) || targetWeight <= 0 || (targetReps !== null && (!Number.isInteger(targetReps) || targetReps < 1 || targetReps > 100))) throw Error('Enter a positive goal weight and a whole rep target from 1 to 100, or leave reps blank.');
  const goals = readGoals(storage), existing = goals.find(g => g.id === input.id);
  const baselineWeight = existing?.baselineWeight ?? Math.max(0, ...matchingSets(sessions, input.exerciseId, input.equipmentProfileId).filter(s => s.reps >= (targetReps || 1)).map(s => s.weight));
  if (!existing && targetWeight <= baselineWeight + 0.00001) throw Error('Choose a goal weight above your current best at these reps.');
  const goal = { id: existing?.id || `lifting-goal-${now.getTime()}-${Math.random().toString(36).slice(2,8)}`, exerciseId: input.exerciseId, name: String(input.name || input.exerciseId), equipmentProfileId: input.equipmentProfileId || 'default', equipmentProfileName: input.equipmentProfileName || 'Default machine', targetWeight, targetReps, baselineWeight, createdAt: existing?.createdAt || now.toISOString() };
  if (existing && (existing.exerciseId !== goal.exerciseId || existing.equipmentProfileId !== goal.equipmentProfileId || existing.targetReps !== goal.targetReps)) throw Error('Create a new goal to change the exercise, machine, or rep target.');
  storage.setItem(GOALS_KEY, JSON.stringify([...goals.filter(g => g.id !== goal.id), goal]));
  return goal;
}
export function deleteGoal(id, storage = localStorage) {
  storage.setItem(GOALS_KEY, JSON.stringify(readGoals(storage).filter(goal => goal.id !== id)));
}
