export const MOVEMENT_GROUPS = [
  ['horizontal-press', ['barbell-bench-press', 'dumbbell-bench-press', 'incline-barbell-press', 'incline-dumbbell-press', 'machine-chest-press', 'push-up']],
  ['chest-fly', ['cable-fly', 'pec-deck', 'dumbbell-fly', 'incline-dumbbell-fly', 'low-to-high-cable-fly', 'high-to-low-cable-fly']],
  ['vertical-pull', ['pull-up', 'weighted-pull-up', 'chin-up', 'lat-pulldown']],
  ['row', ['barbell-row', 'single-arm-dumbbell-row', 'chest-supported-row', 'seated-cable-row', 'machine-row']],
  ['lat-isolation', ['straight-arm-pulldown', 'cable-lat-pullover']],
  ['back-extension', ['back-extension']],
  ['shoulder-press', ['overhead-press', 'dumbbell-shoulder-press', 'machine-shoulder-press', 'pike-push-up']],
  ['lateral-raise', ['lateral-raise', 'cable-lateral-raise', 'upright-row']],
  ['rear-delt', ['reverse-pec-deck', 'face-pull', 'rear-delt-fly']],
  ['biceps-curl', ['barbell-curl', 'dumbbell-curl', 'hammer-curl', 'incline-dumbbell-curl', 'preacher-curl', 'cable-curl']],
  ['triceps-extension', ['tricep-pushdown', 'overhead-tricep-extension', 'skull-crusher', 'dumbbell-overhead-extension']],
  ['triceps-press', ['close-grip-bench-press', 'dip']],
  ['squat-bilateral', ['back-squat', 'front-squat', 'leg-press', 'hack-squat', 'goblet-squat', 'bodyweight-squat']],
  ['squat-unilateral', ['bulgarian-split-squat', 'lunge', 'step-up']],
  ['leg-extension', ['leg-extension']],
  ['deadlift', ['conventional-deadlift', 'trap-bar-deadlift']],
  ['hinge', ['romanian-deadlift', 'good-morning', 'single-leg-romanian-deadlift']],
  ['leg-curl', ['leg-curl', 'seated-leg-curl']],
  ['hip-extension', ['hip-thrust', 'glute-bridge', 'cable-pull-through']],
  ['calf-raise', ['standing-calf-raise', 'seated-calf-raise', 'leg-press-calf-raise', 'single-leg-calf-raise']],
  ['anti-extension-core', ['plank', 'dead-bug', 'ab-wheel-rollout']],
  ['anti-lateral-core', ['side-plank']],
  ['anti-rotation-core', ['pallof-press', 'bird-dog']],
  ['trunk-flexion-core', ['cable-crunch', 'hanging-knee-raise']],
  ['cardio', ['indoor-rower', 'ski-erg', 'stationary-bike', 'running']]
];

export function movementForExercise(exercise) {
  const id = exercise?.id;
  return MOVEMENT_GROUPS.find(([, ids]) => ids.includes(id))?.[0] || (exercise?.muscleGroup === 'Cardio' ? 'cardio' : '');
}

export function prioritizeMovementMatches(currentExercise, recommendations = []) {
  const currentMovement = movementForExercise(currentExercise);

  return [...recommendations].sort((a, b) => {
    const aMovementMatch = Boolean(currentMovement && movementForExercise(a.candidate) === currentMovement);
    const bMovementMatch = Boolean(currentMovement && movementForExercise(b.candidate) === currentMovement);
    return Number(bMovementMatch) - Number(aMovementMatch)
      || b.score - a.score
      || String(a.candidate?.name || '').localeCompare(String(b.candidate?.name || ''));
  });
}
