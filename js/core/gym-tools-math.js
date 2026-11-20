// Deterministic Gym Tools math, shared by the iOS UI and regression tests.
export function epley1RM(weight, reps) {
  return Number.isFinite(weight) && weight > 0
    && Number.isInteger(reps) && reps >= 1 && reps <= 30
    ? (reps === 1 ? weight : weight * (1 + reps / 30))
    : null;
}

export function convertGymWeight(value, fromUnit, toUnit) {
  if (!Number.isFinite(value) || !["lb", "kg"].includes(fromUnit) || !["lb", "kg"].includes(toUnit)) return null;
  if (fromUnit === toUnit) return value;
  return fromUnit === "kg" ? value * 2.20462262185 : value / 2.20462262185;
}
