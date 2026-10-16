// Classify from the saved workout, never from the user's current routine.
export function exerciseContext(session, exercise) {
    if (exercise?.strengthContext) return exercise.strengthContext;
    const exercises = session?.exercises || [];
    const index = exercises.indexOf(exercise);
    const planned = session?.planSnapshot?.days?.[Number(session.trainingDayIndex) || 0]?.exercises || [];
    const id = exercise?.exerciseId || exercise?.id;
    const match = planned[index]?.id === id ? planned[index] : planned.filter(item => item.id === id).length === 1 ? planned.find(item => item.id === id) : null;
    if (match) return match.supersetGroup ? 'superset' : 'standalone';
    return exercise?.supersetGroup ? 'superset' : 'standalone';
}
export function eligibleStrengthSet(set) {
    return Boolean(set && set.excludeFromStrength !== true && set.completed !== false && !set.isWarmup && !set.warmup && !['warmup'].includes(set.type || set.setType));
}
export function matchesStrengthContext(session, exercise, context = 'standalone') {
    return context === 'all' || exerciseContext(session, exercise) === context;
}
