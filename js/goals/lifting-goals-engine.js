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

BADGES.push(
  ...[5,25,50,100,250,500].map(number => ({ id: `sessions-${number}`, name: `${number} Workouts`, description: `Complete ${number} workouts in total. Lifting and circuits both count; there is no deadline.`, threshold: number, number, metric: 'sessions', art: 'plate' })),
  ...[8,12,26,52].map(number => ({ id: `weeks-${number}`, name: `${number} Weeks Strong`, description: `Complete at least one workout in each of ${number} consecutive Monday–Sunday weeks. Rest days are encouraged, and earned badges are permanent.`, threshold: number, number, metric: 'weeks', art: 'calendar' })),
  ...[5,10,25,50].map(number => ({ id: `prs-${number}`, name: `${number} Lifting PRs`, description: `Earn ${number} lifting records across completed workouts. Each exercise can contribute one PR per workout, compared with the same exercise and machine. Circuit sets do not count.`, threshold: number, metric: 'prs', art: 'trophy' })),
  ...[1,10,25,50].map(number => ({ id: `circuits-${number}`, name: number === 1 ? 'Circuit Starter' : `${number} Circuits`, description: `Complete ${number} circuit ${number===1?'workout':'workouts'}. These achievements celebrate circuits separately from lifting records.`, threshold: number, metric: 'circuits', art: 'dumbbells' }))
);

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
  return { sessions: valid.length, weeks: bestWeeks, currentWeeks, prs, circuits: valid.filter(isCircuit).length };
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
export const estimatedGoalStrength = set => Number(set.weight) * (1 + Number(set.reps) / 30);
const clamp = value => Math.min(1, Math.max(0, value));
export function startingGoalSet(sessions, exerciseId, profileId = 'default', targetReps = 8) {
  const sets=matchingSets(sessions,exerciseId,profileId);
  const atTarget=sets.filter(set=>set.reps>=targetReps).sort((a,b)=>b.weight-a.weight || estimatedGoalStrength(b)-estimatedGoalStrength(a));
  return atTarget[0] || sets.sort((a,b)=>estimatedGoalStrength(b)-estimatedGoalStrength(a))[0] || {weight:0,reps:targetReps};
}
export function goalBaseline(goal, sessions) {
  if(Number.isInteger(Number(goal.baselineReps)) && Number(goal.baselineReps)>0) return {weight:Number(goal.baselineWeight)||0,reps:Number(goal.baselineReps)};
  // Older goals saved a weight only. Recover the actual starting reps from
  // pre-goal history when possible; otherwise use the target as a reference.
  const prior=completedSessions(sessions).filter(s=>!goal.createdAt || Date.parse(s.completedAt)<Date.parse(goal.createdAt));
  const sets=matchingSets(prior,goal.exerciseId,goal.equipmentProfileId).filter(s=>Math.abs(s.weight-Number(goal.baselineWeight))<.00001 && s.reps >= (Number(goal.targetReps)||1)).sort((a,b)=>b.reps-a.reps);
  return {weight:Math.max(0,Number(goal.baselineWeight)||0),reps:sets[0]?.reps || Number(goal.targetReps) || 1};
}
export function goalSetScore(goal, set, baseline) {
  const target=Number(goal.targetWeight),reps=Number(goal.targetReps);
  if(set.weight>=target-.00001 && set.reps>=reps) return {score:100,reached:true};
  const weightRange=target-baseline.weight;
  const weightProgress=weightRange>0 ? clamp((set.weight-baseline.weight)/weightRange) : set.weight>=target ? 1 : 0;
  const startStrength=estimatedGoalStrength(baseline),goalStrength=estimatedGoalStrength({weight:target,reps});
  const range=goalStrength-startStrength;
  const performanceProgress=range>0 ? clamp((estimatedGoalStrength(set)-startStrength)/range) : estimatedGoalStrength(set)>startStrength ? 1 : 0;
  return {score:Math.min(99,Math.round(50*weightProgress+50*performanceProgress)),reached:false};
}
export function goalProgress(goal, sessions) {
  const baseline=goalBaseline(goal,sessions);
  const sets=matchingSets(sessions,goal.exerciseId,goal.equipmentProfileId,goal.createdAt);
  // Preserve existing weight-only goals until the user adds a rep target.
  if(!Number(goal.targetReps)) {
    const bestSet=sets.sort((a,b)=>b.weight-a.weight || b.reps-a.reps)[0] || null;
    const best=Math.max(baseline.weight,bestSet?.weight||0),target=Number(goal.targetWeight),reached=best>=target-.00001;
    return {percent:reached?100:Math.min(99,Math.round(clamp((best-baseline.weight)/(target-baseline.weight))*100)),best,bestSet,reached,baseline,legacy:true};
  }
  let bestSet=null,percent=0,reached=false;
  for(const set of sets) {
    const result=goalSetScore(goal,set,baseline);
    if(result.score>percent) {percent=result.score;bestSet=set;reached=result.reached;}
  }
  return {percent,best:bestSet?.weight ?? baseline.weight,bestSet,reached,baseline,legacy:false};
}
export function saveGoal(input, sessions, storage = localStorage, now = new Date()) {
  const targetWeight=Number(input.targetWeight),targetReps=Number(input.targetReps);
  if(!input.exerciseId || !Number.isFinite(targetWeight) || targetWeight<=0 || !Number.isInteger(targetReps) || targetReps<1 || targetReps>100) throw Error('Enter a positive goal weight and a whole rep target from 1 to 100.');
  const goals=readGoals(storage),existing=goals.find(g=>g.id===input.id);
  const reference=existing ? goalBaseline(existing,sessions) : startingGoalSet(sessions,input.exerciseId,input.equipmentProfileId,targetReps);
  const baselineWeight=existing?.baselineWeight ?? (input.baselineWeight==null || input.baselineWeight==='' ? reference.weight : Number(input.baselineWeight));
  const baselineReps=existing && Number(existing.targetReps) ? reference.reps : (input.baselineReps==null || input.baselineReps==='' ? reference.reps : Number(input.baselineReps));
  if(!Number.isFinite(baselineWeight) || baselineWeight<0 || !Number.isInteger(baselineReps) || baselineReps<1 || baselineReps>100) throw Error('Enter a non-negative starting weight and starting reps from 1 to 100.');
  if(!existing && baselineWeight>=targetWeight && baselineReps>=targetReps) throw Error('Choose a goal above your starting performance.');
  const goal={id:existing?.id || `lifting-goal-${now.getTime()}-${Math.random().toString(36).slice(2,8)}`,exerciseId:input.exerciseId,name:String(input.name||input.exerciseId),equipmentProfileId:input.equipmentProfileId||'default',equipmentProfileName:input.equipmentProfileName||'Default machine',targetWeight,targetReps,baselineWeight,baselineReps,scoringVersion:2,createdAt:existing?.createdAt || now.toISOString()};
  if(existing && (existing.exerciseId!==goal.exerciseId || (existing.equipmentProfileId || 'default')!==goal.equipmentProfileId || (Number(existing.targetReps) && Number(existing.targetReps)!==goal.targetReps))) throw Error('Create a new goal to change the exercise, machine, or rep target.');
  storage.setItem(GOALS_KEY,JSON.stringify([...goals.filter(g=>g.id!==goal.id),goal]));return goal;
}
export function deleteGoal(id, storage = localStorage) {
  storage.setItem(GOALS_KEY, JSON.stringify(readGoals(storage).filter(goal => goal.id !== id)));
}
