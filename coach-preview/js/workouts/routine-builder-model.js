// Planned targets never become recorded performance. All weights use canonical lb.
export const REST_INTERVALS = Object.freeze([60, 90, 120, 180]);
export const restLabel = seconds => seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : 'Off';
export function normalizeRest(value) {
  return { enabled: value?.enabled === true, seconds: REST_INTERVALS.includes(Number(value?.seconds)) ? Number(value.seconds) : 120 };
}
export function exerciseKind(definition, planned = {}) {
  if (definition?.trackingType === 'notes' || definition?.type === 'cardio' || definition?.muscleGroup === 'Cardio') return 'cardio';
  if (definition?.trackingType === 'duration' || planned.trackingType === 'duration' || ['plank', 'side-plank', 'copenhagen-plank'].includes(planned.id || definition?.id)) return 'duration';
  return 'strength';
}
export function normalizeTargets(planned, definition) {
  const kind = exerciseKind(definition, planned);
  if (kind === 'cardio') return [];
  const count = Math.max(1, Math.min(20, Number(planned.sets) || 3));
  return Array.from({length: count}, (_, i) => {
    const target = planned.setTargets?.[i] || {};
    return { reps: String(target.reps ?? planned.reps ?? definition?.recommendedReps ?? (kind === 'duration' ? '30 sec' : '8-12')),
      weight: target.weight == null || target.weight === '' ? null : Number(target.weight),
      rir: target.rir == null || target.rir === '' ? null : Number(target.rir),
      dropSets: Array.isArray(target.dropSets) ? structuredClone(target.dropSets) : [] };
  });
}
export function syncTargets(planned, targets) {
  planned.setTargets = structuredClone(targets); planned.sets = targets.length;
  planned.reps = targets[0]?.reps || '';
}
export function moveRoutineExercise(day, from, to, withinGroup = false) {
  const items = day.exercises;
  if (!Number.isInteger(from) || !Number.isInteger(to) || !items[from] || !items[to] || from === to) return false;
  const selected = items[from], group = selected.supersetGroup;
  if (withinGroup && (!group || items[to].supersetGroup !== group)) return false;
  const moving = group && !withinGroup ? items.filter(x => x.supersetGroup === group) : [selected];
  const targetGroup = !withinGroup && items[to].supersetGroup;
  const targetMembers = targetGroup ? items.filter(x => x.supersetGroup === targetGroup) : [items[to]];
  if (moving.includes(items[to])) return false;
  const remaining = items.filter(x => !moving.includes(x));
  const anchor = from < to ? targetMembers.at(-1) : targetMembers[0];
  const at = remaining.indexOf(anchor) + (from < to ? 1 : 0);
  remaining.splice(at, 0, ...moving); day.exercises = remaining; return true;
}
export function ungroupExercise(day, index) {
 const group = day.exercises[index]?.supersetGroup;
 for (const exercise of day.exercises) if (exercise.supersetGroup === group) { delete exercise.supersetGroup; delete exercise.groupType; }
}
export function groupRoutineExercises(day, indices, type = 'superset') {
 if (indices.length < 2 || indices.some(i => !day.exercises[i])) return false;
 const members = indices.map(i => day.exercises[i]);
 indices.forEach(i => ungroupExercise(day, i));
 const first = Math.min(...indices), group = `R${Date.now()}-${first}`;
 const remaining = day.exercises.filter(x => !members.includes(x));
 remaining.splice(first, 0, ...members);
 for (const exercise of members) { exercise.supersetGroup = group; exercise.groupType = type; }
 day.exercises = remaining; return true;
}
export function replaceRoutineExercise(current, definition) {
 // Equipment-specific and incompatible targets must be reviewed for the new movement.
 const {supersetGroup, groupType} = current;
 return {id: definition.id, sets: definition.trackingType === 'notes' ? 1 : definition.defaultSets || 3,
  reps: definition.recommendedReps || '', notes: '', ...(supersetGroup ? {supersetGroup, groupType} : {})};
}
export function plannedSessionFields(planned) {
 return {routineNote: String(planned.notes || ''), groupType: planned.groupType, restSetting: planned.restSetting ? normalizeRest(planned.restSetting) : undefined,
  cardioTarget: structuredClone(planned.cardioTarget || {}), warmupTargets: structuredClone(planned.warmupTargets || []),
  ...(planned.equipmentProfileId ? {equipmentProfileId: planned.equipmentProfileId, equipmentProfileName: planned.equipmentProfileName} : {})};
}
export function sessionTargetState(planned, index) {
 const target=planned.setTargets?.[index];
 return {targetReps:target?.reps,targetWeight:target?.weight,targetRir:target?.rir,
  dropSets:(target?.dropSets||[]).map(t=>({weight:null,reps:null,completed:false,draftWeight:t.weight??null,draftReps:Number.parseInt(t.reps)||null}))};
}
