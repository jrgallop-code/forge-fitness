// Filter the actual exercise definitions, never a partial equipment-label match.
export function isBodyweightPlan(plan, resolveExercise) {
 const items=(plan?.days || []).flatMap(day=>day.exercises || []);
 return items.length>0 && items.every(item=>{
  const definition=resolveExercise(item.id);
  return Boolean(definition) && String(definition.equipment || '').trim().toLowerCase() === 'bodyweight';
 });
}
