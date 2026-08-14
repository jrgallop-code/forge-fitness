import { getAllExercises } from "./exercise-library.js?v=exercise-library-catalogue-2";

const PLAN_STORAGE_KEY = "forge_workout_plans";
const MUSCLES = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves"];
const MAJOR_MUSCLES = ["Chest", "Back", "Quads", "Hamstrings"];
const GOAL_LABELS = {
  muscle: "Build Muscle",
  strength: "Build Strength",
  hybrid: "Strength + Muscle",
  maintain: "Maintain Muscle & Strength"
};

const BASE_TARGETS = {
  muscle: { beginner: 8, intermediate: 10, advanced: 12 },
  hybrid: { beginner: 7, intermediate: 9, advanced: 10 },
  strength: { beginner: 5, intermediate: 6, advanced: 7 },
  maintain: { beginner: 4, intermediate: 5, advanced: 6 }
};

const PRIORITY_TARGETS = {
  muscle: { beginner: 12, intermediate: 14, advanced: 16 },
  hybrid: { beginner: 10, intermediate: 13, advanced: 15 },
  strength: { beginner: 7, intermediate: 9, advanced: 10 },
  maintain: { beginner: 6, intermediate: 7, advanced: 8 }
};

const shadow = {
  goal: "muscle",
  days: 4,
  duration: 60,
  priorities: [],
  experience: "intermediate",
  equipment: ["Full Gym"],
  preferredIds: [],
  excludedIds: [],
  style: "no-preference",
  supersets: true,
  variation: 0
};

let generated = null;
let saveInProgress = false;

function isSplitGuardrailMode() {
  return shadow.days >= 4 && shadow.days <= 6;
}

function isGenerateStep() {
  return Boolean(document.querySelector("[data-smart-step] [data-supersets]"));
}

function updateShadowFromButton(button) {
  if (button.dataset.goal) shadow.goal = button.dataset.goal;
  if (button.dataset.days) shadow.days = Number(button.dataset.days);
  if (button.dataset.duration) shadow.duration = Number(button.dataset.duration);
  if (button.dataset.experience) shadow.experience = button.dataset.experience;
  if (button.dataset.style) shadow.style = button.dataset.style;

  if (button.dataset.priority) {
    const muscle = button.dataset.priority;
    if (shadow.priorities.includes(muscle)) {
      shadow.priorities = shadow.priorities.filter(item => item !== muscle);
    } else if (shadow.priorities.length < 3) {
      shadow.priorities = [...shadow.priorities, muscle];
    }
  }

  if (button.dataset.equipment) toggleEquipment(button.dataset.equipment);

  if (button.dataset.preferId) {
    const id = button.dataset.preferId;
    shadow.excludedIds = shadow.excludedIds.filter(item => item !== id);
    if (!shadow.preferredIds.includes(id)) shadow.preferredIds.push(id);
  }

  if (button.dataset.excludeId) {
    const id = button.dataset.excludeId;
    shadow.preferredIds = shadow.preferredIds.filter(item => item !== id);
    if (!shadow.excludedIds.includes(id)) shadow.excludedIds.push(id);
  }

  if (button.dataset.removePreferred) shadow.preferredIds = shadow.preferredIds.filter(item => item !== button.dataset.removePreferred);
  if (button.dataset.removeExcluded) shadow.excludedIds = shadow.excludedIds.filter(item => item !== button.dataset.removeExcluded);
}

function toggleEquipment(value) {
  if (value === "Full Gym") {
    shadow.equipment = ["Full Gym"];
    return;
  }
  shadow.equipment = shadow.equipment.filter(item => item !== "Full Gym");
  shadow.equipment = shadow.equipment.includes(value)
    ? shadow.equipment.filter(item => item !== value)
    : [...shadow.equipment, value];
  if (!shadow.equipment.length) shadow.equipment = ["Full Gym"];
}

document.addEventListener("change", event => {
  if (event.target?.matches?.("[data-supersets]")) shadow.supersets = event.target.checked;
}, true);

document.addEventListener("click", event => {
  const button = event.target?.closest?.("button");
  if (!button) return;

  updateShadowFromButton(button);

  if (button.matches("[data-smart-build], [data-smart-edit]")) generated = null;

  if (button.matches("[data-smart-next]") && isGenerateStep() && isSplitGuardrailMode()) {
    event.preventDefault();
    event.stopImmediatePropagation();
    generated = generateSplitProgram();
    renderSplitReview();
    return;
  }

  if (button.matches("[data-smart-regenerate-exercises]") && generated?.smartBuild?.version === 5) {
    event.preventDefault();
    event.stopImmediatePropagation();
    shadow.variation += 1;
    generated = generateSplitProgram();
    renderSplitReview();
    return;
  }

  if (button.matches("[data-smart-regenerate-program]") && generated?.smartBuild?.version === 5) {
    event.preventDefault();
    event.stopImmediatePropagation();
    shadow.variation += 4;
    generated = generateSplitProgram();
    renderSplitReview();
    return;
  }

  if (button.matches("[data-smart-save]") && generated?.smartBuild?.version === 5) {
    event.preventDefault();
    event.stopImmediatePropagation();
    saveGuardedPlan(button);
  }
}, true);

function generateSplitProgram() {
  const allExercises = getAllExercises();
  const exerciseMap = new Map(allExercises.map(exercise => [exercise.id, exercise]));
  const pool = allExercises.filter(exercise => {
    const muscle = normalizedDisplayMuscle(exercise.muscleGroup);
    return MUSCLES.includes(muscle)
      && exercise.trackingType !== "notes"
      && !shadow.excludedIds.includes(exercise.id)
      && equipmentAllowed(exercise);
  });

  const split = getSplitDefinition(shadow.days);
  const days = split.names.map(name => ({ name, exercises: [] }));
  const usedCounts = new Map();
  const perSessionCapacity = getPerSessionCapacity();
  const weeklyCapacity = perSessionCapacity * shadow.days;
  const floors = getCoverageFloors(weeklyCapacity);

  MAJOR_MUSCLES.forEach(muscle => {
    const eligibleDays = split.mapping[muscle] || [];
    eligibleDays.slice(0, 2).forEach(dayIndex => {
      addExercise(days, dayIndex, muscle, 2, pool, usedCounts, { preferCompound: true, structural: true });
    });
  });

  ["Shoulders", "Biceps", "Triceps", "Glutes", "Calves"].forEach(muscle => {
    const eligibleDays = split.mapping[muscle] || [];
    if (!eligibleDays.length) return;
    addExercise(days, eligibleDays[0], muscle, 2, pool, usedCounts, { structural: true });
  });

  fillEffectiveDeficits(days, floors, split.mapping, pool, exerciseMap, usedCounts, perSessionCapacity, { hardFloor: true });

  const targets = getWeeklyTargets(floors);
  const priorityTargets = Object.fromEntries(Object.entries(targets).filter(([muscle]) => shadow.priorities.includes(muscle)));
  fillEffectiveDeficits(days, priorityTargets, split.mapping, pool, exerciseMap, usedCounts, perSessionCapacity, { priority: true });

  const normalTargets = Object.fromEntries(Object.entries(targets).filter(([muscle]) => !shadow.priorities.includes(muscle)));
  fillEffectiveDeficits(days, normalTargets, split.mapping, pool, exerciseMap, usedCounts, perSessionCapacity, {});

  orderExercises(days, exerciseMap);
  applyAccessorySupersets(days, exerciseMap);

  const effective = calculateEffectiveVolume(days, exerciseMap);
  const direct = calculateDirectVolume(days, exerciseMap);
  const exposureCounts = calculateDirectExposureCounts(days, exerciseMap);
  const coverage = validateSplitCoverage(days, floors, effective, exposureCounts, split.mapping);

  return {
    name: buildPlanName(),
    days,
    smartBuild: {
      version: 5,
      goal: GOAL_LABELS[shadow.goal],
      duration: shadow.duration,
      experience: shadow.experience,
      priorities: [...shadow.priorities],
      supersetsAllowed: shadow.supersets,
      weeklyCoverageGuardrails: true,
      generatedAt: new Date().toISOString()
    },
    volumes: targets,
    floors,
    direct,
    effective,
    exposureCounts,
    coverage
  };
}

function getSplitDefinition(days) {
  if (days === 4) {
    return {
      names: ["Upper A", "Lower A", "Upper B", "Lower B"],
      mapping: {
        Chest: [0, 2], Back: [0, 2], Shoulders: [0, 2], Biceps: [0, 2], Triceps: [0, 2],
        Quads: [1, 3], Hamstrings: [1, 3], Glutes: [1, 3], Calves: [1, 3]
      }
    };
  }

  if (days === 5) {
    return {
      names: ["Upper", "Lower", "Push", "Pull", "Legs"],
      mapping: {
        Chest: [0, 2], Back: [0, 3], Shoulders: [0, 2], Biceps: [0, 3], Triceps: [0, 2],
        Quads: [1, 4], Hamstrings: [1, 4], Glutes: [1, 4], Calves: [1, 4]
      }
    };
  }

  return {
    names: ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"],
    mapping: {
      Chest: [0, 3], Back: [1, 4], Shoulders: [0, 3], Biceps: [1, 4], Triceps: [0, 3],
      Quads: [2, 5], Hamstrings: [2, 5], Glutes: [2, 5], Calves: [2, 5]
    }
  };
}

function getPerSessionCapacity() {
  const base = Math.max(8, Math.round(shadow.duration / 5));
  const bonus = shadow.supersets ? Math.round(base * 0.2) : 0;
  return base + bonus;
}

function getCoverageFloors(weeklyCapacity) {
  const veryTight = weeklyCapacity < 42;
  const tight = weeklyCapacity < 54;

  if (shadow.goal === "strength" || shadow.goal === "maintain") {
    return {
      Chest: 4, Back: 4, Shoulders: veryTight ? 2 : 3, Biceps: 2, Triceps: 2,
      Quads: 4, Hamstrings: 4, Glutes: veryTight ? 2 : 3, Calves: veryTight ? 2 : 3
    };
  }

  return {
    Chest: veryTight ? 4 : 6,
    Back: veryTight ? 4 : 6,
    Shoulders: veryTight ? 2 : tight ? 3 : 4,
    Biceps: veryTight ? 2 : tight ? 3 : 4,
    Triceps: veryTight ? 2 : tight ? 3 : 4,
    Quads: veryTight ? 4 : 6,
    Hamstrings: veryTight ? 4 : 5,
    Glutes: veryTight ? 3 : 4,
    Calves: veryTight ? 2 : tight ? 3 : 4
  };
}

function getWeeklyTargets(floors) {
  const base = BASE_TARGETS[shadow.goal]?.[shadow.experience] ?? 10;
  const priority = PRIORITY_TARGETS[shadow.goal]?.[shadow.experience] ?? 14;
  const targets = {};

  MUSCLES.forEach(muscle => {
    let target = Math.max(floors[muscle] || 0, base);
    if (["Shoulders", "Biceps", "Triceps", "Glutes", "Calves"].includes(muscle)) {
      target = Math.max(floors[muscle] || 0, base - 2);
    }
    if (shadow.priorities.includes(muscle)) target = Math.max(target, priority);
    targets[muscle] = target;
  });

  return targets;
}

function fillEffectiveDeficits(days, goals, mapping, pool, exerciseMap, usedCounts, perSessionCapacity, mode) {
  let guard = 500;
  while (guard-- > 0) {
    const effective = calculateEffectiveVolume(days, exerciseMap);
    const deficits = Object.entries(goals)
      .map(([muscle, target]) => ({ muscle, deficit: Number(target) - Number(effective[muscle] || 0) }))
      .filter(item => item.deficit > 0.24)
      .sort((a, b) => {
        const aPriority = shadow.priorities.includes(a.muscle) ? 1 : 0;
        const bPriority = shadow.priorities.includes(b.muscle) ? 1 : 0;
        if (mode.priority && aPriority !== bPriority) return bPriority - aPriority;
        return b.deficit - a.deficit;
      });

    if (!deficits.length) return;

    let changed = false;
    for (const item of deficits) {
      if (addOneStimulusStep(days, item.muscle, mapping[item.muscle] || [], pool, usedCounts, perSessionCapacity, mode)) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
  }
}

function addOneStimulusStep(days, muscle, eligibleDays, pool, usedCounts, perSessionCapacity, mode) {
  const rankedDays = eligibleDays
    .map(index => ({ index, totalSets: totalDaySets(days[index]), muscleSets: primarySetsForMuscle(days[index], muscle) }))
    .filter(item => item.totalSets < perSessionCapacity)
    .sort((a, b) => a.muscleSets - b.muscleSets || a.totalSets - b.totalSets || a.index - b.index);

  for (const slot of rankedDays) {
    const day = days[slot.index];
    const existing = day.exercises.find(item => item.primaryMuscle === muscle && item.sets < (mode.priority ? 5 : 4));
    if (existing) {
      existing.sets += 1;
      return true;
    }

    const room = perSessionCapacity - totalDaySets(day);
    if (room >= 2) {
      const added = addExercise(days, slot.index, muscle, 2, pool, usedCounts, {
        preferCompound: MAJOR_MUSCLES.includes(muscle) && primarySetsForMuscle(day, muscle) === 0
      });
      if (added) return true;
    }

    if (room >= 1) {
      const fallback = day.exercises.find(item => item.primaryMuscle === muscle && item.sets < 6);
      if (fallback) {
        fallback.sets += 1;
        return true;
      }
    }
  }

  return false;
}

function addExercise(days, dayIndex, muscle, sets, pool, usedCounts, options = {}) {
  const day = days[dayIndex];
  if (!day) return false;
  const candidate = pickExercise(day, muscle, pool, usedCounts, dayIndex, options.preferCompound);
  if (!candidate) return false;

  day.exercises.push({
    id: candidate.id,
    sets,
    reps: getRepTarget(candidate),
    primaryMuscle: muscle,
    _structural: Boolean(options.structural),
    _compound: candidate.type === "compound"
  });
  usedCounts.set(candidate.id, (usedCounts.get(candidate.id) || 0) + 1);
  return true;
}

function pickExercise(day, muscle, pool, usedCounts, dayIndex, preferCompound) {
  let candidates = pool.filter(exercise => normalizedDisplayMuscle(exercise.muscleGroup) === muscle);
  if (!candidates.length) return null;

  if (preferCompound) {
    const compounds = candidates.filter(exercise => exercise.type === "compound");
    if (compounds.length) candidates = compounds;
  }

  const dayIds = new Set(day.exercises.map(item => item.id));
  return [...candidates].sort((a, b) => scoreExercise(b, usedCounts, dayIds, dayIndex, preferCompound) - scoreExercise(a, usedCounts, dayIds, dayIndex, preferCompound))[0] || null;
}

function scoreExercise(exercise, usedCounts, dayIds, dayIndex, preferCompound) {
  let score = exercise.type === "compound" ? 12 : 8;
  if (preferCompound && exercise.type === "compound") score += 18;
  if (shadow.preferredIds.includes(exercise.id)) score += 100;
  if (dayIds.has(exercise.id)) score -= 1000;
  score -= (usedCounts.get(exercise.id) || 0) * 7;
  if (shadow.style === "machines" && ["Machine", "Cable"].includes(exercise.equipment)) score += 10;
  if (shadow.style === "free-weights" && ["Barbell", "Dumbbells"].includes(exercise.equipment)) score += 10;
  score += Math.abs((hashString(`${exercise.id}-${dayIndex}`) + shadow.variation * 17) % 17);
  return score;
}

function orderExercises(days, exerciseMap) {
  days.forEach(day => {
    day.exercises.sort((a, b) => exerciseOrderScore(b, exerciseMap) - exerciseOrderScore(a, exerciseMap));
  });
}

function exerciseOrderScore(item, exerciseMap) {
  const exercise = exerciseMap.get(item.id);
  let score = 0;
  if (shadow.priorities.includes(item.primaryMuscle)) score += 40;
  if (item._structural) score += 20;
  if (exercise?.type === "compound") score += 12;
  return score;
}

function applyAccessorySupersets(days, exerciseMap) {
  if (!shadow.supersets || shadow.duration >= 75) {
    cleanupInternalFields(days);
    return;
  }

  days.forEach(day => {
    const eligible = day.exercises.filter(item => !item._structural && !isHighFatigueCompound(item, exerciseMap));
    let group = 0;
    for (let index = 0; index < eligible.length - 1; index += 2) {
      const first = eligible[index];
      const second = eligible[index + 1];
      if (!canSuperset(first, second)) continue;
      group += 1;
      first.supersetGroup = `S${group}`;
      second.supersetGroup = `S${group}`;
    }
  });

  cleanupInternalFields(days);
}

function cleanupInternalFields(days) {
  days.forEach(day => day.exercises.forEach(item => {
    delete item._structural;
    delete item._compound;
  }));
}

function isHighFatigueCompound(item, exerciseMap) {
  const exercise = exerciseMap.get(item.id);
  if (!exercise || exercise.type !== "compound") return false;
  const name = String(exercise.name || "").toLowerCase();
  return ["squat", "deadlift", "romanian deadlift", "rdl", "leg press", "hack squat", "barbell row", "bench press", "overhead press", "military press"].some(term => name.includes(term));
}

function canSuperset(first, second) {
  if (first.primaryMuscle === second.primaryMuscle) return false;
  const competing = [
    new Set(["Chest", "Triceps"]),
    new Set(["Back", "Biceps"]),
    new Set(["Shoulders", "Triceps"]),
    new Set(["Quads", "Glutes"]),
    new Set(["Hamstrings", "Glutes"])
  ];
  return !competing.some(set => set.has(first.primaryMuscle) && set.has(second.primaryMuscle));
}

function calculateEffectiveVolume(days, exerciseMap) {
  const totals = Object.fromEntries(MUSCLES.map(muscle => [muscle, 0]));
  days.forEach(day => day.exercises.forEach(item => {
    const exercise = exerciseMap.get(item.id);
    if (!exercise) return;
    const primary = normalizedDisplayMuscle(exercise.muscleGroup);
    if (totals[primary] != null) totals[primary] += item.sets;
    secondaryMuscles(exercise).forEach(muscle => {
      if (totals[muscle] != null) totals[muscle] += item.sets * 0.5;
    });
  }));
  Object.keys(totals).forEach(muscle => totals[muscle] = Math.round(totals[muscle] * 10) / 10);
  return totals;
}

function calculateDirectVolume(days, exerciseMap) {
  const totals = Object.fromEntries(MUSCLES.map(muscle => [muscle, 0]));
  days.forEach(day => day.exercises.forEach(item => {
    const exercise = exerciseMap.get(item.id);
    const primary = normalizedDisplayMuscle(exercise?.muscleGroup || item.primaryMuscle);
    if (totals[primary] != null) totals[primary] += item.sets;
  }));
  return totals;
}

function calculateDirectExposureCounts(days, exerciseMap) {
  const counts = Object.fromEntries(MUSCLES.map(muscle => [muscle, 0]));
  days.forEach(day => {
    const seen = new Set();
    day.exercises.forEach(item => {
      const exercise = exerciseMap.get(item.id);
      const primary = normalizedDisplayMuscle(exercise?.muscleGroup || item.primaryMuscle);
      if (counts[primary] != null) seen.add(primary);
    });
    seen.forEach(muscle => { counts[muscle] += 1; });
  });
  return counts;
}

function secondaryMuscles(exercise) {
  if (exercise.type !== "compound") return [];
  const muscle = normalizedDisplayMuscle(exercise.muscleGroup);
  if (muscle === "Chest") return ["Triceps", "Shoulders"];
  if (muscle === "Back") return ["Biceps"];
  if (muscle === "Shoulders") return ["Triceps"];
  if (muscle === "Quads") return ["Glutes"];
  if (muscle === "Hamstrings") return ["Glutes"];
  return [];
}

function validateSplitCoverage(days, floors, effective, exposureCounts, mapping) {
  const floorChecks = Object.entries(floors).map(([muscle, floor]) => ({
    muscle,
    floor,
    actual: Number(effective[muscle] || 0),
    pass: Number(effective[muscle] || 0) + 0.01 >= floor
  }));

  const exposureChecks = MAJOR_MUSCLES.map(muscle => ({
    muscle,
    required: Math.min(2, (mapping[muscle] || []).length),
    actual: Number(exposureCounts[muscle] || 0),
    pass: Number(exposureCounts[muscle] || 0) >= Math.min(2, (mapping[muscle] || []).length)
  }));

  const failedMuscles = floorChecks.filter(check => !check.pass);
  const failedExposures = exposureChecks.filter(check => !check.pass);

  return {
    passed: failedMuscles.length === 0 && failedExposures.length === 0,
    floorChecks,
    exposureChecks,
    failedMuscles,
    failedExposures
  };
}

function renderSplitReview() {
  const host = document.querySelector("[data-smart-step]");
  if (!host || !generated) return;

  const heading = document.querySelector("[data-smart-heading]");
  const progress = document.querySelector("[data-smart-progress]");
  if (heading) heading.textContent = `${GOAL_LABELS[shadow.goal]} Program`;
  if (progress) progress.style.width = "100%";

  const map = new Map(getAllExercises().map(exercise => [exercise.id, exercise]));
  const coverage = generated.coverage;
  const coverageStatus = coverage.passed
    ? `<div class="smart-volume-grid"><div class="priority"><span>Weekly coverage</span><strong>Passed ✓</strong></div><div><span>Major-muscle exposure</span><strong>2× direct / week protected</strong></div></div>`
    : `<div class="smart-volume-grid"><div><span>Weekly coverage</span><strong>Needs attention</strong></div></div><p class="smart-helper">${escapeHtml(formatCoverageFailure(coverage))}</p>`;

  const effectiveRows = MUSCLES.map(muscle => {
    const actual = Number(generated.effective[muscle] || 0);
    const floor = Number(generated.floors[muscle] || 0);
    const target = Number(generated.volumes[muscle] || floor);
    const priority = shadow.priorities.includes(muscle);
    return `<div class="${priority ? "priority" : ""}"><span>${muscle}${priority ? " · priority" : ""}</span><strong>${formatNumber(actual)} effective · floor ${formatNumber(floor)} · target ${formatNumber(target)}</strong></div>`;
  }).join("");

  const days = generated.days.map(day => `
    <details class="smart-review-day" open>
      <summary><strong>${escapeHtml(day.name)}</strong><span>${day.exercises.length} exercises · ${totalDaySets(day)} sets</span></summary>
      <div>${day.exercises.map(item => `<p class="${item.supersetGroup ? "is-superset" : ""}"><strong>${item.supersetGroup ? `<em>${item.supersetGroup}</em> ` : ""}${escapeHtml(map.get(item.id)?.name || item.id)}</strong><span>${item.sets} × ${escapeHtml(item.reps)}</span></p>`).join("")}</div>
    </details>`).join("");

  host.innerHTML = `<div class="smart-review">
    <span class="eyebrow">YOUR PROGRAM</span>
    <h3>${escapeHtml(generated.name)}</h3>
    <div class="smart-review-meta"><span>${shadow.days} days/week</span><span>~${shadow.duration} min/session</span><span>${capitalize(shadow.experience)}</span><span>${GOAL_LABELS[shadow.goal]}</span></div>
    <h4>Program guardrails</h4>
    <p class="smart-helper">The split structure is preserved, but weekly muscle coverage is protected before focus volume is added. Chest, back, quads and hamstrings receive at least two direct exposures each week.</p>
    ${coverageStatus}
    <h4>Weekly muscle stimulus</h4>
    <p class="smart-helper">Floors are protected first. Priority muscles receive additional volume before non-priority muscles are filled toward their targets. Compound exercises contribute 0.5 effective-set credit to commonly involved secondary muscles.</p>
    <div class="smart-volume-grid effective">${effectiveRows}</div>
    <h4>Workout days</h4>
    <div class="smart-review-days">${days}</div>
    <p class="smart-review-note">These are evidence-informed starting guardrails, not universal optimal-set claims. Short sessions may use lower accessory floors so the program can preserve whole-body coverage without creating unrealistic workouts.</p>
    <div class="smart-review-actions">
      <button class="secondary-btn" type="button" data-smart-edit>Edit Answers</button>
      <button class="secondary-btn" type="button" data-smart-regenerate-exercises>New Exercises</button>
      <button class="secondary-btn" type="button" data-smart-regenerate-program>New Program</button>
      <button class="primary-btn" type="button" data-smart-save ${coverage.passed ? "" : "disabled"}>${coverage.passed ? "Save Plan" : "Coverage Not Met"}</button>
    </div>
  </div>`;
}

function formatCoverageFailure(coverage) {
  const parts = [];
  if (coverage.failedMuscles.length) parts.push(`${coverage.failedMuscles.map(item => item.muscle).join(", ")} is below its protected weekly stimulus floor`);
  if (coverage.failedExposures.length) parts.push(`${coverage.failedExposures.map(item => item.muscle).join(", ")} is missing a second direct weekly exposure`);
  return `${parts.join("; ")}. Adjust equipment/exclusions or session length, then regenerate.`;
}

function saveGuardedPlan(button) {
  if (!generated?.coverage?.passed || saveInProgress) return;
  saveInProgress = true;
  try {
    const saved = getSavedPlans();
    const plan = JSON.parse(JSON.stringify(generated));
    delete plan.volumes;
    delete plan.floors;
    delete plan.direct;
    delete plan.effective;
    delete plan.exposureCounts;
    delete plan.coverage;
    plan.id = `plan-${Date.now()}`;
    saved.push(plan);
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(saved));
    button.textContent = "Saved ✓";
    button.disabled = true;
    setTimeout(() => document.querySelector('.nav-btn[data-page="workout"]')?.click(), 250);
  } finally {
    setTimeout(() => { saveInProgress = false; }, 300);
  }
}

function getSavedPlans() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildPlanName() {
  const priority = shadow.priorities.length ? ` — ${shadow.priorities.join(" + ")} Priority` : "";
  return `${shadow.days}-Day ${GOAL_LABELS[shadow.goal]} Program${priority}`;
}

function getRepTarget(exercise) {
  if (shadow.goal === "strength" && exercise.type === "compound") return "4-6";
  if (shadow.goal === "hybrid" && exercise.type === "compound") return "5-8";
  return exercise.recommendedReps || "8-12";
}

function equipmentAllowed(exercise) {
  if (shadow.equipment.includes("Full Gym")) return true;
  const equipment = String(exercise.equipment || "").toLowerCase();
  const selected = shadow.equipment.map(item => item.toLowerCase());
  if (selected.includes("home gym")) return ["dumbbells", "bodyweight", "barbell"].some(item => equipment.includes(item));
  return selected.some(item => equipment.includes(item.replace(/s$/, "")) || item.includes(equipment.replace(/s$/, "")));
}

function primarySetsForMuscle(day, muscle) {
  return day.exercises.reduce((total, item) => total + (item.primaryMuscle === muscle ? Number(item.sets || 0) : 0), 0);
}

function totalDaySets(day) {
  return day.exercises.reduce((total, item) => total + Number(item.sets || 0), 0);
}

function normalizedMuscle(value) {
  const muscle = String(value || "").toLowerCase();
  if (muscle === "rear delts") return "shoulders";
  if (muscle === "lats") return "back";
  return muscle;
}

function normalizedDisplayMuscle(value) {
  const normalized = normalizedMuscle(value);
  return MUSCLES.find(muscle => muscle.toLowerCase() === normalized) || value;
}

function hashString(value) {
  return String(value).split("").reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0);
}

function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function capitalize(value) {
  return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
