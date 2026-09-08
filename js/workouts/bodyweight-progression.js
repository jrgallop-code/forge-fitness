const MINIMUM_ADDED_WEIGHT_LB = 2.5;
const DEFAULT_ADDED_WEIGHT_LB = 5;

export function isBodyweightEquipment(equipment) {
  return normalizeEquipment(equipment).includes('bodyweight');
}

export function isWeightedBodyweightEquipment(equipment) {
  return normalizeEquipment(equipment).includes('weightedbodyweight');
}

function normalizeEquipment(equipment) {
  return String(equipment || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

export function buildBodyweightProgression({
  completedReps = [],
  lower,
  upper,
  currentAddedWeight = 0
} = {}) {
  const minimum = Number(lower);
  const maximum = Number(upper);
  const reps = completedReps.map(Number).filter(value => Number.isFinite(value) && value > 0);
  if (!reps.length || !Number.isFinite(minimum) || !Number.isFinite(maximum) || maximum < minimum) return null;

  const allAtTop = reps.length >= 2 && reps.every(value => value >= maximum);
  const repGoals = reps.map(value => {
    if (allAtTop) return value + 1;
    if (value >= maximum) return value;
    return Math.min(maximum, Math.max(minimum, value + 1));
  });
  const added = Number.isFinite(Number(currentAddedWeight)) && Number(currentAddedWeight) > 0
    ? Number(currentAddedWeight)
    : 0;

  return {
    allAtTop,
    repGoals,
    minimumAddedLoad: Number((added + MINIMUM_ADDED_WEIGHT_LB).toFixed(1)),
    maximumAddedLoad: Number((added + DEFAULT_ADDED_WEIGHT_LB).toFixed(1)),
    loadRepMinimum: minimum,
    loadRepMaximum: Math.min(maximum, minimum + 2)
  };
}
