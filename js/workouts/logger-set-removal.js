export function setHasRecordedData(set) {
  if (!set) return false;
  const hasValue = value => value !== null && value !== undefined && value !== '';
  return hasValue(set.weight)
    || hasValue(set.reps)
    || hasValue(set.rir)
    || Boolean(set.completed)
    || Boolean(Array.isArray(set.dropSets) && set.dropSets.length);
}

export function removeWorkoutSet(activeWorkout, exerciseIndex, setIndex) {
  const sets = activeWorkout?.exercises?.[exerciseIndex]?.sets;
  if (!Array.isArray(sets) || sets.length <= 1 || !sets[setIndex]) return false;

  sets.splice(setIndex, 1);

  const dayIndex = Number(activeWorkout.trainingDayIndex) || 0;
  const plannedExercise = activeWorkout.planSnapshot?.days?.[dayIndex]?.exercises?.[exerciseIndex];
  if (plannedExercise) plannedExercise.sets = sets.length;

  if (Number(activeWorkout.currentExerciseIndex) === exerciseIndex) {
    const currentSetIndex = Number(activeWorkout.currentSetIndex) || 0;
    activeWorkout.currentSetIndex = currentSetIndex > setIndex
      ? currentSetIndex - 1
      : Math.min(currentSetIndex, sets.length - 1);
  }

  return true;
}
