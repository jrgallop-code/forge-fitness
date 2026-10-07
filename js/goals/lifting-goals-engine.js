import { NUTRITION_BADGES, nutritionEnabled, nutritionBadgeMetrics, nutritionTargets } from './nutrition-badges.js';
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

// Stable IDs preserve the original 24 awards while extending the collection.
const additions = [
 ['750-club','750 Club','Complete 750 workouts. There is no deadline.',750,'sessions','fortress','Milestones'],
 ['the-thousand','The Thousand','Complete 1,000 workouts. Every completed lifting or circuit workout counts once.',1000,'sessions','phoenix','Milestones'],
 ['living-legend','Living Legend','Complete 2,000 workouts. There is no deadline.',2000,'sessions','dragon','Milestones'],
 ['two-years-strong','Two Years Strong','Train in 104 consecutive Monday–Sunday weeks. At least one workout per week counts; rest days are encouraged.',104,'weeks','tree','Consistency'],
 ['century-records','Century of Records','Earn 100 lifting PRs. Each exercise contributes at most one PR per workout, compared with the same machine. Circuits and warm-ups are excluded.',100,'prs','plate','Strength'],
 ['record-collector','Record Collector','Earn 250 lifting PRs across completed workouts. Circuits and warm-ups are excluded.',250,'prs','chest','Strength'],
 ['circuit-centurion','Circuit Centurion','Complete 100 circuit workouts. Circuit results remain separate from lifting records.',100,'circuits','circuit','Circuits'],
 ['first-summit','First Summit','Reach your first lifting goal by completing its target weight and reps in one working set after creating the goal. Weight-only legacy goals do not count.',1,'goalsReached','mountain','Goals'],
 ['goal-collector','Goal Collector','Reach five distinct lifting goals with both weight and rep targets. Duplicating the same exercise, machine, weight and rep target does not count again.',5,'goalsReached','constellation','Goals'],
 ['one-more-rep','One More Rep','Beat your previous best reps at the same weight, on the same exercise and machine, in a completed lifting workout.',1,'repRecords','lightning','Strength'],
 ['new-territory','New Territory','Beat your previous heaviest working-set weight on the same exercise and machine in a completed lifting workout.',1,'weightRecords','rocket','Strength'],
 ['across-board','Across the Board','Set lifting PRs on five different exercises within any 30 consecutive calendar days. Machines are compared separately, but each exercise counts once.',5,'diverseRecords','constellation','Strength'],
 ['the-comeback','The Comeback','Complete a workout after at least 14 calendar days since your previous workout. Your earlier workout must be recorded.',1,'comebacks','phoenix','Consistency'],
 ['back-rhythm','Back in Rhythm','After a comeback, complete a workout in each of four consecutive Monday–Sunday weeks, starting with your return week.',4,'returnWeeks','bridge','Consistency'],
 ['your-pace','Your Pace','Meet your chosen weekly workout target in four consecutive Monday–Sunday weeks. Uses the schedule or training frequency saved when each new workout starts; changing the target starts a new run.',4,'targetWeeks','compass','Consistency'],
 ['early-bird','Early Bird','Complete five workouts started from 5:00 am up to 8:00 am, using the local start time recorded when you began. This is optional; any time of day is a good time to train.',5,'earlyStarts','falcon','Consistency'],
 ['night-owl','Night Owl','Complete five workouts started from 8:00 pm up to 11:00 pm, using the local start time recorded when you began. This is optional; there is no need to change your sleep routine.',5,'nightStarts','owl','Consistency'],
 ['weekend-warrior','Weekend Warrior','Train on Saturday or Sunday in eight distinct Monday–Sunday weeks. Both days in one week count as one week.',8,'weekendWeeks','bear','Consistency'],
 ['homegrown-strength','Homegrown Strength','Complete 20 bodyweight-only workouts. Every recorded exercise must use bodyweight equipment and no added load; mixed-equipment workouts do not count.',20,'bodyweightSessions','tree','Exploration'],
 ['circuit-explorer','Circuit Explorer','Complete three distinct circuit templates. Repeating or editing the same template counts once.',3,'circuitTemplates','planets','Circuits'],
 ['rep-reporter','Rep Reporter','Record reps in reserve (RIR 0–4+) on 30 completed lifting working sets. Warm-ups and circuits are excluded.',30,'rirSets','eye','Exploration'],
 ['plan-architect','Plan Architect','Create a plan with the manual or Smart Build builder, then complete its first workout. Starting a library template alone does not count.',1,'createdPlans','blueprint','Exploration'],
 ['first-chapter','First Chapter','Open a completed monthly report to review your progress. Live reports and dismissing the report banner do not count.',1,'reportsReviewed','book','Exploration'],
 ['four-seasons','Four Seasons','Complete a workout in each of four consecutive calendar quarters (January–March, April–June, July–September, October–December).',4,'quarters','seasons','Consistency']
];
BADGES.forEach(b => { b.category = b.metric==='prs'?'Strength':b.metric==='weeks'?'Consistency':b.metric==='circuits'?'Circuits':'Milestones'; });
BADGES.push(...additions.map(([id,name,description,threshold,metric,art,category])=>({id,name,description,threshold,metric,art,category,customArt:true,showMilestone:['sessions','weeks','prs','circuits'].includes(metric)})));
BADGES.push(...NUTRITION_BADGES);
export const availableBadges = (storage = localStorage) => BADGES.filter(b=>!b.nutrition || nutritionEnabled(storage));
export const BADGE_METRIC_LABELS = {sessions:'workouts',weeks:'consecutive weeks',prs:'lifting PRs',circuits:'circuits',goalsReached:'distinct goals reached',repRecords:'rep PRs',weightRecords:'weight PRs',diverseRecords:'exercises in 30 days',comebacks:'comebacks',returnWeeks:'consecutive return weeks',targetWeeks:'weeks meeting your target',earlyStarts:'early starts',nightStarts:'evening starts',weekendWeeks:'weekend weeks',bodyweightSessions:'bodyweight workouts',circuitTemplates:'circuit templates',rirSets:'sets with RIR',createdPlans:'created plans completed',reportsReviewed:'completed reports reviewed',quarters:'consecutive quarters',foodDays:'completed food days',foodRhythm:'days in seven days',proteinWeek:'protein days in seven days',proteinMonth:'protein days in 30 days',calorieDays:'days within your target range',nutritionReviews:'check-ins',intakeWeeks:'weeks reviewed',savedMeals:'distinct saved meals',weightGoals:'weight goals reached',maintenanceGoals:'maintenance periods'};

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
    const meaningful = (session.exercises || []).some(exercise => (exercise.sets || []).some(set => set.completed !== false && !set.isWarmup && !set.warmup && set.type!=='warmup' && (Number(set.reps) > 0 || Number(set.durationSeconds) > 0 || Number(set.durationMinutes) > 0 || Number(set.distance) > 0)));
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
export function badgeMetrics(sessions, now = new Date(), context = {}) {
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
  return { sessions: valid.length, weeks: bestWeeks, currentWeeks, prs, circuits: valid.filter(isCircuit).length, ...extraBadgeMetrics(valid,now,context) };
}
const calendarDay = date => Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);
function longestRun(values) {
  let run=0,best=0,last=null;
  for(const value of [...new Set(values)].sort((a,b)=>a-b)) {run=value===last+1?run+1:1;best=Math.max(best,run);last=value;}
  return best;
}
export function getBadgeWeeklyTarget(storage = localStorage) {
  const schedule=readJson('level_up_workout_schedule_v1',null,storage);
  const scheduled=Object.values(schedule?.weekly || {}).filter(value=>value!==null && value!=='' && value!==undefined).length;
  if(scheduled>=1 && scheduled<=7) return scheduled;
  const preference=readJson('level_up_training_preferences',{},storage);
  const days=Number(preference.days);
  return Number.isInteger(days) && days>=1 && days<=7 ? days : null;
}
function extraBadgeMetrics(valid,now,context) {
  const ordered=[...valid].sort((a,b)=>calendarDay(dayDate(a))-calendarDay(dayDate(b)) || Date.parse(a.completedAt)-Date.parse(b.completedAt));
  const records=new Map(),events=[],weekends=new Set(),circuitTemplates=new Set(),quarters=[];
  const targetCounts=new Map();
  let repRecords=0,weightRecords=0,rirSets=0,bodyweightSessions=0,earlyStarts=0,nightStarts=0,createdPlans=0,comebacks=0,returnWeeks=0;
  const createdPlanIds=new Set(),comebackWeeks=[];
  let previousDay=null;
  for(const session of ordered) {
    const date=dayDate(session),day=calendarDay(date),week=weekNumber(date);
    if(previousDay!==null && day-previousDay>=14) {comebacks++;comebackWeeks.push(week);}
    previousDay=day;
    if(date.getDay()===0 || date.getDay()===6) weekends.add(week);
    quarters.push(date.getFullYear()*4+Math.floor(date.getMonth()/3));
    const minutes=Number.isInteger(session.badgeLocalStartMinutes) ? session.badgeLocalStartMinutes : session.startedAt && Number.isFinite(Date.parse(session.startedAt)) ? new Date(session.startedAt).getHours()*60+new Date(session.startedAt).getMinutes() : null;
    if(minutes!==null && minutes>=300 && minutes<480) earlyStarts++;
    if(minutes!==null && minutes>=1200 && minutes<1380) nightStarts++;
    const target=Number(session.badgeWeeklyTarget);
    if(Number.isInteger(target) && target>=1 && target<=7) {
      const values=targetCounts.get(week)||{target,count:0,mixed:false};
      if(values.target!==target) values.mixed=true;
      values.count++;targetCounts.set(week,values);
    }
    // Bodyweight exploration can include circuits, while strength/RIR records
    // below remain restricted to regular lifting history.
    const recordedSet=set=>set.completed!==false && !set.isWarmup && !set.warmup && set.type!=='warmup' && (Number(set.reps)>0 || Number(set.durationSeconds)>0 || Number(set.durationMinutes)>0 || Number(set.distance)>0);
    const recordedExercises=(session.exercises||[]).filter(e=>(e.sets||[]).some(recordedSet));
    if(recordedExercises.length && recordedExercises.every(e=>String(e.equipment||'').toLowerCase().replace(/[\s_-]/g,'')==='bodyweight' && e.sets.filter(recordedSet).every(set=>Number(set.weight||0)===0))) bodyweightSessions++;
    if(isCircuit(session)) {if(session.circuitId) circuitTemplates.add(session.circuitId);continue;}
    const exercises=(session.exercises||[]).filter(e=>!isCircuit(e) && (e.sets||[]).some(validWorkingSet));
    const source=session.workoutSource,plan=session.planSnapshot;
    if(session.planId && (source==='manual_builder' || source==='coach_builder' || plan?.smartBuild) && !createdPlanIds.has(session.planId)) {createdPlanIds.add(session.planId);createdPlans++;}
    // Compare all sets with the records BEFORE this workout, then update.
    // This prevents sets within the same workout from establishing their own PRs.
    const nextRecords=new Map(),sessionRecords=new Set();
    for(const e of exercises) {
      const id=e.exerciseId||e.id;if(!id) continue;
      const key=`${id}::${e.equipmentProfileId||'default'}`;
      const previous=records.get(key)||{strength:null,weight:null,reps:new Map()};
      const next=nextRecords.get(key)||{strength:previous.strength,weight:previous.weight,reps:new Map(previous.reps)};
      let hasRepRecord=false,hasWeightRecord=false;
      for(const set of e.sets.filter(validWorkingSet)) {
        const weight=Number(set.weight),reps=Number(set.reps),weightKey=weight.toFixed(6),strength=estimatedGoalStrength({weight,reps});
        if(set.rir!==null && set.rir!==undefined && set.rir!=='' && Number.isFinite(Number(set.rir)) && Number(set.rir)>=0 && Number(set.rir)<=4) rirSets++;
        const priorReps=previous.reps.get(weightKey);
        if(priorReps!==undefined && reps>priorReps) hasRepRecord=true;
        if(previous.weight!==null && weight>previous.weight+.01) hasWeightRecord=true;
        if((weight>0 && previous.strength!==null && strength>previous.strength+.01) || (weight>0 && previous.weight!==null && weight>previous.weight+.01) || (weight===0 && priorReps!==undefined && reps>priorReps)) sessionRecords.add(id);
        next.strength=next.strength===null?strength:Math.max(next.strength,strength);
        next.weight=next.weight===null?weight:Math.max(next.weight,weight);
        next.reps.set(weightKey,Math.max(next.reps.get(weightKey)||0,reps));
      }
      if(hasRepRecord) repRecords++;
      if(hasWeightRecord) weightRecords++;
      nextRecords.set(key,next);
    }
    for(const [key,value] of nextRecords) records.set(key,value);
    if(sessionRecords.size) events.push({day,ids:sessionRecords});
  }
  let diverseRecords=0;
  for(let i=0,left=0;i<events.length;i++) {
    while(events[i].day-events[left].day>29) left++;
    const ids=new Set();for(let j=left;j<=i;j++) for(const id of events[j].ids) ids.add(id);
    diverseRecords=Math.max(diverseRecords,ids.size);
  }
  const weeks=new Set(ordered.map(s=>weekNumber(dayDate(s))));
  for(const start of comebackWeeks) {let run=0;while(weeks.has(start+run)) run++;returnWeeks=Math.max(returnWeeks,run);}
  let targetWeeks=0,run=0,last=null,lastTarget=null;
  for(const [week,value] of [...targetCounts].sort((a,b)=>a[0]-b[0])) {
    if(value.mixed || value.count<value.target) {run=0;last=null;continue;}
    run=week===last+1 && value.target===lastTarget ? run+1 : 1;
    targetWeeks=Math.max(targetWeeks,run);last=week;lastTarget=value.target;
  }
  const month=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const reportsReviewed=Array.isArray(context.seenMonths)?new Set(context.seenMonths.filter(key=>/^\d{4}-(0[1-9]|1[0-2])$/.test(key) && key<month)).size:0;
  return {goalsReached:Object.values(context.reachedGoals||{}).filter((value,index,array)=>array.indexOf(value)===index).length,repRecords,weightRecords,diverseRecords,comebacks,returnWeeks,targetWeeks,earlyStarts,nightStarts,weekendWeeks:weekends.size,bodyweightSessions,circuitTemplates:circuitTemplates.size,rirSets,createdPlans,reportsReviewed,quarters:longestRun(quarters)};
}
export function reconcileBadges(sessions, { storage = localStorage, now = new Date(), notify = false, sessionId = null, nutritionEvent = null } = {}) {
  const previous = readJson(BADGES_KEY, {}, storage);
  const nutritionState={nutritionTargets:{...(previous.nutritionTargets||{})},intakeReviewed:[...(previous.intakeReviewed||[])]};
  if(nutritionEnabled(storage) && nutritionEvent?.dateKey && nutritionEvent.action==='day_completed') nutritionState.nutritionTargets[nutritionEvent.dateKey]=nutritionTargets(storage);
  if(nutritionEnabled(storage) && nutritionEvent?.action==='intake_reviewed' && /^\d{4}-\d{2}-\d{2}$/.test(nutritionEvent.dateKey||'') && !nutritionState.intakeReviewed.includes(nutritionEvent.dateKey)) nutritionState.intakeReviewed.push(nutritionEvent.dateKey);
  const reachedGoals={...(previous.reachedGoals||{})};
  const valid=completedSessions(sessions).filter(session=>dayDate(session) && calendarDay(dayDate(session))<=calendarDay(now));
  for(const goal of readGoals(storage)) if(!reachedGoals[goal.id] && Number(goal.targetReps)>0 && goal.createdAt && goalProgress(goal,valid).reached) {
    reachedGoals[goal.id]=`${goal.exerciseId}::${goal.equipmentProfileId||'default'}::${Number(goal.targetWeight).toFixed(6)}::${goal.targetReps}`;
  }
  const metrics = {...badgeMetrics(sessions, now, {reachedGoals,seenMonths:readJson('level_up_monthly_report_seen_v1',[],storage)}),...(nutritionEnabled(storage)?nutritionBadgeMetrics(storage,now,nutritionState):{})};
  const earned = previous.earned && typeof previous.earned === 'object' ? { ...previous.earned } : {};
  const newlyEarned = [];
  for (const badge of availableBadges(storage)) if (!earned[badge.id] && metrics[badge.metric] >= badge.threshold) {
    earned[badge.id] = { earnedAt: now.toISOString(), sessionId: notify ? sessionId : null };
    if (notify) newlyEarned.push(badge.id);
  }
  const next = { version: 3, earned, reachedGoals, ...nutritionState };
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
