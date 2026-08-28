import { getAllExercises } from "./exercise-library.js?v=exercise-library-catalogue-2";
import { getTrainingPreferences } from "../core/training-preferences.js?v=onboarding-1";
import { renderMusclePriorityChoice } from "./muscle-priority-visual.js?v=female-back-regions-1";
import { presetPlans } from "./workout-plans.js?v=smart-build-template-validator-v11";

const PLAN_STORAGE_KEY = "forge_workout_plans";
const MUSCLES = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves", "Core"];
const DISPLAY_NAME = { Core: "Abs / Core" };
const PRIORITY_LIMIT = 3;
const SECONDARY_CREDIT = 0.5;
const MAX_EFFECTIVE = 20;
const SPLIT_PREFERENCES = new Set(["auto", "full-body", "upper-lower"]);
const SUPPLEMENTAL_PROVEN_TEMPLATES = [
  {
    id: "stronglifts-lite-two-day-adapted",
    name: "StrongLifts 5×5 Lite — 2-Day Adaptation",
    daysPerWeek: 2,
    estimatedMinutes: "30-60",
    level: "Beginner / Intermediate",
    trainingType: "Strength",
    templateFamily: "Full Body A/B",
    sourceName: "StrongLifts 5×5 Lite",
    sourceUrl: "https://stronglifts.com/stronglifts-5x5/lite/",
    adaptationNote: "Level Up preserves the alternating full-body A/B structure while adjusting exercises and weekly volume.",
    days: [
      { name: "Full Body A", exercises: [
        { id: "back-squat", sets: 3, reps: "5" },
        { id: "barbell-bench-press", sets: 3, reps: "5" },
        { id: "barbell-row", sets: 3, reps: "5" },
        { id: "dumbbell-curl", sets: 2, reps: "8-12" }
      ]},
      { name: "Full Body B", exercises: [
        { id: "back-squat", sets: 3, reps: "5" },
        { id: "overhead-press", sets: 3, reps: "5" },
        { id: "romanian-deadlift", sets: 3, reps: "6-10" },
        { id: "lat-pulldown", sets: 2, reps: "8-12" }
      ]}
    ]
  },
  {
    id: "five-day-muscle-strength-adapted",
    name: "5-Day Muscle & Strength Split — Level Up Adaptation",
    daysPerWeek: 5,
    estimatedMinutes: "45-75",
    level: "Intermediate / Advanced",
    trainingType: "Hybrid",
    templateFamily: "Power + Hypertrophy Split",
    sourceName: "Muscle & Strength 5-Day Muscle & Strength Split",
    sourceUrl: "https://www.muscleandstrength.com/workouts/5-day-muscle-and-strength-building-workout-split",
    adaptationNote: "Level Up preserves the upper/lower strength and hypertrophy backbone while balancing muscle priority, equipment, and session length.",
    days: [
      { name: "Upper Strength", exercises: [
        { id: "barbell-row", sets: 4, reps: "4-6" },
        { id: "overhead-press", sets: 4, reps: "4-6" },
        { id: "incline-dumbbell-press", sets: 4, reps: "4-6" },
        { id: "dumbbell-curl", sets: 2, reps: "6-10" },
        { id: "tricep-pushdown", sets: 2, reps: "6-10" }
      ]},
      { name: "Lower Strength", exercises: [
        { id: "back-squat", sets: 4, reps: "4-6" },
        { id: "romanian-deadlift", sets: 4, reps: "4-6" },
        { id: "leg-press", sets: 3, reps: "6-10" },
        { id: "standing-calf-raise", sets: 3, reps: "8-12" }
      ]},
      { name: "Back + Shoulders Hypertrophy", exercises: [
        { id: "lat-pulldown", sets: 3, reps: "8-12" },
        { id: "seated-cable-row", sets: 3, reps: "8-12" },
        { id: "overhead-press", sets: 3, reps: "8-12" },
        { id: "lateral-raise", sets: 3, reps: "12-20" },
        { id: "hammer-curl", sets: 2, reps: "10-15" }
      ]},
      { name: "Lower Hypertrophy", exercises: [
        { id: "hack-squat", sets: 3, reps: "8-12" },
        { id: "leg-curl", sets: 3, reps: "10-15" },
        { id: "hip-thrust", sets: 3, reps: "8-12" },
        { id: "standing-calf-raise", sets: 3, reps: "10-15" }
      ]},
      { name: "Chest + Arms Hypertrophy", exercises: [
        { id: "barbell-bench-press", sets: 3, reps: "6-10" },
        { id: "incline-dumbbell-press", sets: 3, reps: "8-12" },
        { id: "dumbbell-curl", sets: 3, reps: "10-15" },
        { id: "overhead-tricep-extension", sets: 3, reps: "10-15" },
        { id: "lateral-raise", sets: 2, reps: "12-20" }
      ]}
    ]
  }
];

const GOAL_LABELS = {
  muscle: "Build Muscle",
  strength: "Build Strength",
  hybrid: "Strength + Muscle",
  maintain: "Maintain Muscle & Strength"
};

const VOLUME_RANGES = {
  muscle: {
    beginner: { normal: [8, 12], priority: [10, 14] },
    intermediate: { normal: [10, 14], priority: [12, 16] },
    advanced: { normal: [10, 16], priority: [14, 20] }
  },
  hybrid: {
    beginner: { normal: [7, 10], priority: [9, 12] },
    intermediate: { normal: [8, 12], priority: [11, 15] },
    advanced: { normal: [9, 14], priority: [13, 17] }
  },
  strength: {
    beginner: { normal: [5, 8], priority: [7, 10] },
    intermediate: { normal: [6, 9], priority: [8, 12] },
    advanced: { normal: [7, 10], priority: [9, 13] }
  },
  maintain: {
    beginner: { normal: [4, 7], priority: [6, 9] },
    intermediate: { normal: [5, 8], priority: [7, 10] },
    advanced: { normal: [6, 9], priority: [8, 11] }
  }
};

const state = freshState();
let generated = null;
let saveInProgress = false;
let observerQueued = false;

function freshState() {
  const prefs = getTrainingPreferences?.() || {};
  const goalMap = { build_muscle: "muscle", build_strength: "strength", maintain_muscle: "maintain", lose_fat_maintain_muscle: "maintain" };
  const experienceMap = { new: "beginner", intermediate: "intermediate", experienced: "advanced", advanced: "advanced" };
  const savedPriorities = Array.isArray(prefs.priorities) ? prefs.priorities.map(normalizedDisplayMuscle).filter(m => MUSCLES.includes(m)) : [];
  return {
    goal: goalMap[prefs.primaryGoal] || "muscle",
    days: [2, 3, 4, 5, 6].includes(Number(prefs.days)) ? Number(prefs.days) : 4,
    duration: [30, 45, 60, 75, 90].includes(Number(prefs.duration)) ? Number(prefs.duration) : 60,
    splitPreference: SPLIT_PREFERENCES.has(prefs.splitPreference) ? prefs.splitPreference : "auto",
    priorities: [...new Set(savedPriorities)].slice(0, PRIORITY_LIMIT),
    experience: experienceMap[prefs.experience] || "intermediate",
    equipment: ["Full Gym"],
    preferredIds: [],
    excludedIds: Array.isArray(prefs.excludedIds) ? [...prefs.excludedIds] : [],
    supersets: true,
    variation: 0
  };
}

function updateState(button) {
  if (button.dataset.goal) state.goal = button.dataset.goal;
  if (button.dataset.days) state.days = Number(button.dataset.days);
  if (button.dataset.duration) state.duration = Number(button.dataset.duration);
  if (button.dataset.split && SPLIT_PREFERENCES.has(button.dataset.split)) state.splitPreference = button.dataset.split;
  if (button.dataset.experience) state.experience = button.dataset.experience;
  if (button.dataset.priority) togglePriority(normalizedDisplayMuscle(button.dataset.priority));
  if (button.dataset.equipment) toggleEquipment(button.dataset.equipment);
  if (button.dataset.preferId) choosePreference(button.dataset.preferId, true);
  if (button.dataset.excludeId) choosePreference(button.dataset.excludeId, false);
  if (button.dataset.removePreferred) state.preferredIds = state.preferredIds.filter(id => id !== button.dataset.removePreferred);
  if (button.dataset.removeExcluded) state.excludedIds = state.excludedIds.filter(id => id !== button.dataset.removeExcluded);
}

function togglePriority(muscle) {
  if (!MUSCLES.includes(muscle)) return;
  if (state.priorities.includes(muscle)) state.priorities = state.priorities.filter(item => item !== muscle);
  else if (state.priorities.length < PRIORITY_LIMIT) state.priorities.push(muscle);
}

function toggleEquipment(value) {
  if (value === "Full Gym") {
    state.equipment = ["Full Gym"];
    return;
  }
  state.equipment = state.equipment.filter(item => item !== "Full Gym");
  state.equipment = state.equipment.includes(value)
    ? state.equipment.filter(item => item !== value)
    : [...state.equipment, value];
  if (!state.equipment.length) state.equipment = ["Full Gym"];
}

function choosePreference(id, preferred) {
  if (preferred) {
    state.excludedIds = state.excludedIds.filter(item => item !== id);
    if (!state.preferredIds.includes(id)) state.preferredIds.push(id);
  } else {
    state.preferredIds = state.preferredIds.filter(item => item !== id);
    if (!state.excludedIds.includes(id)) state.excludedIds.push(id);
  }
}

document.addEventListener("change", event => {
  if (event.target?.matches?.("[data-supersets]")) state.supersets = event.target.checked;
}, true);

document.addEventListener("click", event => {
  const button = event.target?.closest?.("button");
  if (!button) return;
  updateState(button);

  if (button.matches("[data-smart-build]")) {
    Object.assign(state, freshState());
    generated = null;
    return;
  }

  if (button.matches("[data-smart-next]") && isGenerateStep()) {
    event.preventDefault();
    event.stopImmediatePropagation();
    generated = generateProgram();
    renderReview();
    return;
  }

  if (button.matches("[data-smart-regenerate-exercises]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    state.variation += 1;
    generated = generateProgram();
    renderReview();
    return;
  }

  if (button.matches("[data-smart-regenerate-program]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    state.variation += 5;
    generated = generateProgram();
    renderReview();
    return;
  }

  if (button.matches("[data-smart-save]") && generated?.smartBuild?.version === 11) {
    event.preventDefault();
    event.stopImmediatePropagation();
    savePlan(button);
  }
}, true);

function isGenerateStep() {
  return Boolean(document.querySelector("[data-smart-step] [data-supersets]"));
}

function resolvedSplitPreference(days = state.days) {
  if (state.splitPreference === "full-body" || state.splitPreference === "upper-lower") return state.splitPreference;
  return days <= 3 ? "full-body" : "upper-lower";
}

function getSplitDefinition(days) {
  return resolvedSplitPreference(days) === "full-body"
    ? fullBodySplit(days)
    : upperLowerSplit(days);
}

function fullBodySplit(days) {
  const indices = Array.from({ length: days }, (_, index) => index);
  const names = indices.map(index => `Full Body ${String.fromCharCode(65 + index)}`);
  return {
    type: "full-body",
    label: "Full Body",
    names,
    mapping: Object.fromEntries(MUSCLES.map(muscle => [muscle, [...indices]])),
    templates: indices.map(() => fullBodyTemplate())
  };
}

function upperLowerSplit(days) {
  const kinds = [];
  if (days === 2) kinds.push("upper", "lower");
  else {
    const pairedDays = days % 2 === 1 ? days - 1 : days;
    for (let index = 0; index < pairedDays; index += 1) kinds.push(index % 2 === 0 ? "upper" : "lower");
    if (days % 2 === 1) kinds.push("full");
  }

  let upperCount = 0;
  let lowerCount = 0;
  const names = kinds.map(kind => {
    if (kind === "full") return "Full Body Bridge";
    if (kind === "upper") {
      upperCount += 1;
      return `Upper ${String.fromCharCode(64 + upperCount)}`;
    }
    lowerCount += 1;
    return `Lower ${String.fromCharCode(64 + lowerCount)}`;
  });
  if (days === 2) { names[0] = "Upper"; names[1] = "Lower"; }

  const upperMuscles = new Set(["Chest", "Back", "Shoulders", "Biceps", "Triceps"]);
  const lowerMuscles = new Set(["Quads", "Hamstrings", "Glutes", "Calves"]);
  const mapping = Object.fromEntries(MUSCLES.map(muscle => [muscle, kinds.map((kind, index) => {
    if (muscle === "Core" || kind === "full") return index;
    if (kind === "upper" && upperMuscles.has(muscle)) return index;
    if (kind === "lower" && lowerMuscles.has(muscle)) return index;
    return null;
  }).filter(index => index !== null)]));

  const templates = kinds.map((kind, index) => {
    if (kind === "full") return fullBodyTemplate();
    if (kind === "lower") return lowerTemplate();
    return upperTemplate(index % 4 === 0 ? "Biceps" : "Triceps");
  });

  return {
    type: "upper-lower",
    label: days % 2 === 1 ? "Upper / Lower + Full Body Bridge" : "Upper / Lower",
    shortLabel: "Upper / Lower",
    names,
    mapping,
    templates
  };
}

function fullBodyTemplate() {
  return [
    { muscle: "Chest", role: "press" },
    { muscle: "Back", role: "pull" },
    { muscle: "Quads", role: "knee" },
    { muscle: "Hamstrings", role: "posterior" }
  ];
}
function upperTemplate(arm = "Biceps") {
  return [
    { muscle: "Chest", role: "press" },
    { muscle: "Back", role: "pull" },
    { muscle: "Shoulders", role: "shoulder" },
    { muscle: arm, role: "arm" }
  ];
}
function lowerTemplate() {
  return [
    { muscle: "Quads", role: "knee" },
    { muscle: "Hamstrings", role: "posterior" },
    { muscle: "Glutes", role: "glute" },
    { muscle: "Calves", role: "calf" }
  ];
}

function generateProgram() {
  const allExercises = getAllExercises();
  const exerciseMap = new Map(allExercises.map(exercise => [exercise.id, exercise]));
  const pool = allExercises.filter(exercise => {
    const muscle = normalizedDisplayMuscle(exercise.muscleGroup);
    return MUSCLES.includes(muscle)
      && exercise.trackingType !== "notes"
      && !state.excludedIds.includes(exercise.id)
      && equipmentAllowed(exercise);
  });
  const baseTemplate = selectBaseTemplate(exerciseMap, pool);
  const split = baseTemplate
    ? templateSplit(baseTemplate, exerciseMap)
    : getSplitDefinition(state.days);
  const days = split.names.map((name, index) => ({ name, intended: split.templates[index].map(slot => slot.muscle), exercises: [] }));
  const usedCounts = new Map();

  if (baseTemplate) seedFromTemplate(days, baseTemplate, split, pool, exerciseMap, usedCounts);
  else seedWorkoutStructure(days, split.templates, pool, usedCounts);
  ensurePriorityFrequency(days, split.mapping, pool, usedCounts);

  const targets = getWeeklyTargets();
  const minimums = getPracticalMinimums(targets);
  fillVolume(days, minimums, split.mapping, pool, exerciseMap, usedCounts, false);
  fillVolume(days, minimums, split.mapping, pool, exerciseMap, usedCounts, true);
  fillVolume(days, targets, split.mapping, pool, exerciseMap, usedCounts, true);
  fillVolume(days, targets, split.mapping, pool, exerciseMap, usedCounts, false);

  ensureMinimumExercises(days, split.templates, split.mapping, pool, usedCounts, exerciseMap);
  repairDuration(days, exerciseMap);
  ensureMinimumExercises(days, split.templates, split.mapping, pool, usedCounts, exerciseMap);
  repairDuration(days, exerciseMap);
  orderExercises(days, exerciseMap);
  applyAccessorySupersets(days, exerciseMap);

  const effective = calculateEffectiveVolume(days, exerciseMap);
  const direct = calculateDirectVolume(days, exerciseMap);
  const exposureCounts = calculateDirectExposureCounts(days, exerciseMap);
  const validation = validateProgram(days, targets, minimums, effective, exposureCounts, split, exerciseMap, baseTemplate);

  return {
    name: buildPlanName(split),
    days,
    baseTemplate: baseTemplate ? templateMetadata(baseTemplate) : null,
    smartBuild: {
      version: 11,
      goal: state.goal,
      days: state.days,
      duration: state.duration,
      experience: state.experience,
      splitPreference: state.splitPreference,
      resolvedSplit: split.type,
      splitLabel: split.label,
      priorities: [...state.priorities],
      equipment: [...state.equipment],
      supersetsAllowed: state.supersets,
      unifiedEngine: true,
      templateFirst: true,
      singleValidator: true,
      template: baseTemplate ? templateMetadata(baseTemplate) : null,
      generatedAt: new Date().toISOString()
    },
    split,
    targets,
    minimums,
    direct,
    effective,
    exposureCounts,
    validation
  };
}

function templateMetadata(plan) {
  return {
    id: plan.id,
    name: plan.name,
    sourceName: plan.sourceName || plan.name,
    sourceUrl: plan.sourceUrl || "",
    adaptationNote: plan.adaptationNote || "Exercise selection, weekly volume, and session length were adjusted to match your answers."
  };
}

function selectBaseTemplate(exerciseMap, pool) {
  const allowedIds = new Set(pool.map(exercise => exercise.id));
  const candidates = [...presetPlans, ...SUPPLEMENTAL_PROVEN_TEMPLATES]
    .filter(plan => Number(plan.daysPerWeek) === state.days)
    .filter(plan => Array.isArray(plan.days) && plan.days.length === state.days)
    .filter(plan => String(plan.trainingType || "").toLowerCase() !== "cardio")
    .map(plan => {
      const sourceItems = plan.days.flatMap(day => day.exercises || []);
      const resistanceItems = sourceItems.filter(item => exerciseMap.has(item.id));
      if (resistanceItems.length < state.days * 2) return null;
      const allowedRatio = resistanceItems.filter(item => allowedIds.has(item.id)).length / resistanceItems.length;
      const type = String(plan.trainingType || "").toLowerCase();
      const goalMatch = state.goal === "strength" ? /strength/.test(type)
        : state.goal === "hybrid" ? /hybrid|strength/.test(type)
        : state.goal === "maintain" ? /hypertrophy|strength|hybrid/.test(type)
        : /hypertrophy|hybrid/.test(type);
      const level = String(plan.level || "").toLowerCase();
      const experienceMatch = level.includes(state.experience) || (state.experience === "beginner" && level.includes("beginner"));
      const estimated = String(plan.estimatedMinutes || "").match(/\d+/g)?.map(Number) || [60];
      const durationDistance = Math.min(...estimated.map(value => Math.abs(value - state.duration)));
      const sourceBonus = plan.sourceUrl ? 36 : 0;
      return { plan, score: allowedRatio * 40 + Number(goalMatch) * 25 + Number(experienceMatch) * 12 + sourceBonus - durationDistance * 0.35 };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.plan.name.localeCompare(b.plan.name));
  if (!candidates.length) return null;
  const sourced = candidates.filter(candidate => candidate.plan.sourceUrl);
  const ranked = sourced.length ? sourced : candidates;
  const shortlist = ranked.slice(0, Math.min(3, ranked.length));
  return shortlist[state.variation % shortlist.length].plan;
}

function templateSplit(plan, exerciseMap) {
  const names = plan.days.map(day => day.name);
  const templates = plan.days.map(day => {
    const muscles = templateDayMuscles(day, exerciseMap);
    return muscles.map(muscle => ({ muscle, role: "template" }));
  });
  const mapping = Object.fromEntries(MUSCLES.map(muscle => [muscle, []]));
  templates.forEach((slots, dayIndex) => slots.forEach(slot => {
    if (!mapping[slot.muscle].includes(dayIndex)) mapping[slot.muscle].push(dayIndex);
  }));
  mapping.Core = names.map((_, index) => index);
  return {
    type: "template",
    label: plan.templateFamily || plan.name,
    shortLabel: plan.templateFamily || plan.name,
    names,
    templates,
    mapping
  };
}

function templateDayMuscles(day, exerciseMap) {
  const label = String(day.name || "").toLowerCase();
  if (label.includes("full body")) return [...MUSCLES];
  if (label.includes("upper")) return ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Core"];
  if (label.includes("lower") || label.includes("leg")) return ["Quads", "Hamstrings", "Glutes", "Calves", "Core"];
  if (label.includes("push")) return ["Chest", "Shoulders", "Triceps", "Core"];
  if (label.includes("pull")) return ["Back", "Biceps", "Core"];
  const derived = [...new Set((day.exercises || []).map(item => normalizedDisplayMuscle(exerciseMap.get(item.id)?.muscleGroup)).filter(muscle => MUSCLES.includes(muscle)))];
  return derived.length ? derived : [...MUSCLES];
}

function seedFromTemplate(days, plan, split, pool, exerciseMap, usedCounts) {
  const allowedIds = new Set(pool.map(exercise => exercise.id));
  plan.days.forEach((sourceDay, dayIndex) => {
    const max = exerciseRange().max;
    for (const source of (sourceDay.exercises || []).slice(0, max)) {
      const original = exerciseMap.get(source.id);
      const muscle = normalizedDisplayMuscle(original?.muscleGroup);
      if (!MUSCLES.includes(muscle)) continue;
      if (allowedIds.has(source.id) && !days[dayIndex].exercises.some(item => item.id === source.id)) {
        const sets = Math.max(2, Math.min(5, Number(source.sets) || 3));
        days[dayIndex].exercises.push({ id: source.id, sets, reps: String(source.reps || getRepTarget(original)), primaryMuscle: muscle, structural: true });
        usedCounts.set(source.id, (usedCounts.get(source.id) || 0) + 1);
      } else {
        addExercise(days[dayIndex], muscle, Math.max(2, Math.min(4, Number(source.sets) || 3)), pool, usedCounts, dayIndex, { role: "template-substitution", structural: true });
      }
    }
  });
}

function getPracticalMinimums(targets) {
  return Object.fromEntries(MUSCLES.map(muscle => {
    const target = targets[muscle] || 0;
    const priority = state.priorities.includes(muscle);
    if (priority) return [muscle, muscle === "Core" || muscle === "Calves" ? target : Math.max(6, target - 2)];
    if (muscle === "Core" || muscle === "Calves") return [muscle, 0];
    if (["Chest", "Back", "Quads", "Hamstrings"].includes(muscle)) return [muscle, Math.max(6, target - 3, Math.ceil(target * 0.7))];
    return [muscle, Math.min(target, Math.max(4, Math.ceil(target * 0.5)))];
  }));
}
function seedWorkoutStructure(days, templates, pool, usedCounts) {
  templates.forEach((slots, dayIndex) => {
    slots.forEach((slot, slotIndex) => {
      const sets = slotIndex < 2 ? 3 : 2;
      addExercise(days[dayIndex], slot.muscle, sets, pool, usedCounts, dayIndex, { role: slot.role, structural: true });
    });
  });
}

function ensurePriorityFrequency(days, mapping, pool, usedCounts) {
  for (const muscle of state.priorities) {
    const eligible = mapping[muscle] || [];
    const desired = muscle === "Core"
      ? Math.min(Math.max(2, state.days >= 5 ? 3 : 2), Math.min(4, eligible.length))
      : Math.min(state.days >= 5 ? 3 : 2, eligible.length);
    let current = directExposureCount(days, muscle);
    for (const dayIndex of eligible) {
      if (current >= desired) break;
      if (days[dayIndex].exercises.some(item => item.primaryMuscle === muscle)) continue;
      if (days[dayIndex].exercises.length >= exerciseRange().max) {
        const replaceIndex = days[dayIndex].exercises.findIndex(item => !state.priorities.includes(item.primaryMuscle) && !item.structural);
        const fallbackIndex = days[dayIndex].exercises.findIndex(item => !state.priorities.includes(item.primaryMuscle));
        const duplicateIndex = days[dayIndex].exercises.findIndex((item, itemIndex, items) => items.some((other, otherIndex) => otherIndex !== itemIndex && other.primaryMuscle === item.primaryMuscle));
        const index = replaceIndex >= 0 ? replaceIndex : (fallbackIndex >= 0 ? fallbackIndex : duplicateIndex);
        if (index >= 0) days[dayIndex].exercises.splice(index, 1);
      }
      if (days[dayIndex].exercises.length < exerciseRange().max
        && addExercise(days[dayIndex], muscle, 2, pool, usedCounts, dayIndex, { role: muscle === "Core" ? "core" : "priority" })) current += 1;
    }
  }
}

function getWeeklyTargets() {
  const ranges = VOLUME_RANGES[state.goal]?.[state.experience] || VOLUME_RANGES.muscle.intermediate;
  const frequencyPosition = ({ 2: 0.15, 3: 0.35, 4: 0.55, 5: 0.78, 6: 0.95 })[state.days] ?? 0.55;
  const durationPosition = ({ 30: 0.05, 45: 0.3, 60: 0.55, 75: 0.78, 90: 0.95 })[state.duration] ?? 0.55;
  const position = Math.min(1, Math.max(0, frequencyPosition * 0.6 + durationPosition * 0.4));
  const targets = {};

  MUSCLES.forEach(muscle => {
    if (muscle === "Core") {
      const range = state.priorities.includes(muscle) ? [8, 12] : [4, 8];
      targets[muscle] = interpolateRange(range, position);
      return;
    }
    const priority = state.priorities.includes(muscle);
    let range = priority ? ranges.priority : ranges.normal;
    if (!priority && ["Shoulders", "Biceps", "Triceps", "Glutes", "Calves"].includes(muscle)) {
      range = [Math.max(4, range[0] - 2), Math.max(6, range[1] - 2)];
    }
    targets[muscle] = Math.min(MAX_EFFECTIVE, interpolateRange(range, position));
  });
  return targets;
}

function interpolateRange([low, high], position) {
  return Math.round(low + (high - low) * position);
}

function fillVolume(days, targets, mapping, pool, exerciseMap, usedCounts, priorityPass) {
  let guard = 700;
  while (guard-- > 0) {
    const effective = calculateEffectiveVolume(days, exerciseMap);
    const deficits = MUSCLES
      .filter(muscle => state.priorities.includes(muscle) === priorityPass)
      .map(muscle => ({ muscle, deficit: targets[muscle] - (effective[muscle] || 0) }))
      .filter(item => item.deficit > 0.49)
      .sort((a, b) => b.deficit - a.deficit);
    if (!deficits.length) return;

    let changed = false;
    for (const { muscle } of deficits) {
      const eligible = mapping[muscle] || [];
      if (addStimulus(days, muscle, eligible, pool, exerciseMap, usedCounts, priorityPass)) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
  }
}

function addStimulus(days, muscle, eligible, pool, exerciseMap, usedCounts, priority) {
  const ranked = eligible
    .map(index => ({ index, muscleSets: primarySetsForMuscle(days[index], muscle), minutes: estimateMinutes(days[index].exercises, exerciseMap, state.supersets) }))
    .filter(item => item.minutes < state.duration + 4)
    .sort((a, b) => a.muscleSets - b.muscleSets || a.minutes - b.minutes || a.index - b.index);

  for (const slot of ranked) {
    const day = days[slot.index];
    const sameMuscle = day.exercises.filter(item => item.primaryMuscle === muscle);
    const shouldAddVariety = sameMuscle.length < 2 && (primarySetsForMuscle(day, muscle) >= 3 || day.exercises.length < exerciseRange().target);
    if (shouldAddVariety && day.exercises.length < exerciseRange().max) {
      if (addExercise(day, muscle, 2, pool, usedCounts, slot.index, { role: "volume" })) return true;
    }
    const existing = sameMuscle.sort((a, b) => a.sets - b.sets)[0];
    const ceiling = priority ? 5 : 4;
    if (existing && existing.sets < ceiling) {
      existing.sets += 1;
      return true;
    }
    if (day.exercises.length < exerciseRange().max && addExercise(day, muscle, 2, pool, usedCounts, slot.index, { role: "volume" })) return true;
  }
  return false;
}

function ensureMinimumExercises(days, templates, mapping, pool, usedCounts, exerciseMap) {
  const range = exerciseRange();
  days.forEach((day, dayIndex) => {
    let guard = 20;
    while (day.exercises.length < range.min && guard-- > 0) {
      const needed = chooseCoverageMuscle(day, templates[dayIndex], mapping);
      const added = addExercise(day, needed, 2, pool, usedCounts, dayIndex, { role: "coverage" })
        || addAnyComplementaryExercise(day, pool, usedCounts, dayIndex);
      if (!added) break;
    }
    while (day.exercises.length < range.target && guard-- > 0 && estimateMinutes(day.exercises, exerciseMap, state.supersets) < state.duration - 5) {
      if (!addAnyComplementaryExercise(day, pool, usedCounts, dayIndex)) break;
    }
  });
}

function chooseCoverageMuscle(day, template, mapping) {
  const counts = Object.fromEntries(MUSCLES.map(m => [m, day.exercises.filter(item => item.primaryMuscle === m).length]));
  const templateMuscles = [...new Set(template.map(slot => slot.muscle))];
  const missing = templateMuscles.find(muscle => counts[muscle] === 0);
  if (missing) return missing;
  const eligible = MUSCLES.filter(muscle => (mapping[muscle] || []).some(index => index >= 0) && day.intended.includes(muscle));
  return eligible.sort((a, b) => counts[a] - counts[b] || Number(state.priorities.includes(b)) - Number(state.priorities.includes(a)))[0] || day.intended[0];
}

function addAnyComplementaryExercise(day, pool, usedCounts, dayIndex) {
  const muscleCounts = Object.fromEntries(MUSCLES.map(m => [m, day.exercises.filter(item => item.primaryMuscle === m).length]));
  const candidates = [...new Set(day.intended.concat(state.priorities.filter(m => dayAllowsMuscle(day.name, m))))]
    .sort((a, b) => muscleCounts[a] - muscleCounts[b] || Number(state.priorities.includes(b)) - Number(state.priorities.includes(a)));
  for (const muscle of candidates) {
    if (addExercise(day, muscle, 2, pool, usedCounts, dayIndex, { role: "coverage" })) return true;
  }
  return false;
}

function dayAllowsMuscle(dayName, muscle) {
  if (muscle === "Core") return true;
  const split = generated?.split || getSplitDefinition(state.days);
  const index = split.names.indexOf(dayName);
  return (split.mapping[muscle] || []).includes(index);
}

function repairDuration(days, exerciseMap) {
  days.forEach(day => {
    let guard = 80;
    while (estimateMinutes(day.exercises, exerciseMap, state.supersets) > state.duration + 4 && guard-- > 0) {
      const candidates = day.exercises
        .filter(item => item.sets > 2)
        .sort((a, b) => Number(state.priorities.includes(a.primaryMuscle)) - Number(state.priorities.includes(b.primaryMuscle))
          || Number(exerciseMap.get(a.id)?.type === "compound") - Number(exerciseMap.get(b.id)?.type === "compound")
          || b.sets - a.sets);
      if (!candidates.length) break;
      candidates[0].sets -= 1;
    }
  });
}

function addExercise(day, muscle, sets, pool, usedCounts, dayIndex, options = {}) {
  const candidate = pickExercise(day, muscle, pool, usedCounts, dayIndex, options);
  if (!candidate) return false;
  day.exercises.push({
    id: candidate.id,
    sets: Math.max(2, sets),
    reps: getRepTarget(candidate),
    primaryMuscle: normalizedDisplayMuscle(candidate.muscleGroup),
    structural: Boolean(options.structural)
  });
  usedCounts.set(candidate.id, (usedCounts.get(candidate.id) || 0) + 1);
  return true;
}

function pickExercise(day, muscle, pool, usedCounts, dayIndex, options) {
  const dayIds = new Set(day.exercises.map(item => item.id));
  const existingPatterns = new Set(day.exercises.map(item => movementPattern(exerciseById(item.id))).filter(Boolean));
  const candidates = pool.filter(exercise => normalizedDisplayMuscle(exercise.muscleGroup) === muscle && !dayIds.has(exercise.id));
  if (!candidates.length) return null;
  return candidates.map(exercise => {
    let score = exercise.type === "compound" ? 18 : 12;
    const pattern = movementPattern(exercise);
    if (state.preferredIds.includes(exercise.id)) score += 100;
    if (options.structural && exercise.type === "compound") score += 22;
    if (roleMatches(options.role, pattern, exercise)) score += 30;
    if (existingPatterns.has(pattern)) score -= 18;
    if (state.priorities.includes(muscle)) score += 8;
    score -= (usedCounts.get(exercise.id) || 0) * 6;
    if (state.experience === "beginner" && isAdvancedTechniqueExercise(exercise)) score -= 40;
    score += deterministicNoise(exercise.id, dayIndex + state.variation);
    return { exercise, score };
  }).sort((a, b) => b.score - a.score)[0]?.exercise || null;
}

function exerciseById(id) {
  return getAllExercises().find(exercise => exercise.id === id);
}

function movementPattern(exercise) {
  if (!exercise) return "";
  const name = String(exercise.name || "").toLowerCase();
  const muscle = normalizedDisplayMuscle(exercise.muscleGroup);
  if (muscle === "Chest") {
    if (name.includes("fly") || name.includes("pec deck")) return "chest-fly";
    if (name.includes("incline")) return "incline-press";
    if (name.includes("dip")) return "dip";
    return "horizontal-press";
  }
  if (muscle === "Back") {
    if (/pull-?up|chin-?up|pulldown/.test(name)) return "vertical-pull";
    if (name.includes("row")) return "row";
    if (name.includes("pullover") || name.includes("straight-arm")) return "pullover";
    return "back-other";
  }
  if (muscle === "Shoulders") {
    if (name.includes("rear") || name.includes("face pull") || exercise.muscleGroup === "Rear Delts") return "rear-delt";
    if (name.includes("lateral")) return "lateral-raise";
    if (name.includes("press")) return "shoulder-press";
    return "shoulder-other";
  }
  if (muscle === "Quads") {
    if (name.includes("extension")) return "knee-extension";
    if (/lunge|split|step-up/.test(name)) return "unilateral-knee";
    if (name.includes("press")) return "leg-press";
    return "squat";
  }
  if (muscle === "Hamstrings") {
    if (name.includes("curl")) return "leg-curl";
    return "hinge";
  }
  if (muscle === "Glutes") return name.includes("thrust") || name.includes("bridge") ? "hip-extension" : "glute-other";
  if (muscle === "Core") {
    if (name.includes("crunch")) return "core-flexion";
    if (name.includes("raise")) return "leg-raise";
    if (name.includes("wheel")) return "rollout";
    if (name.includes("pallof")) return "anti-rotation";
    if (name.includes("plank")) return "plank";
    return "core-other";
  }
  return muscle.toLowerCase();
}

function roleMatches(role, pattern, exercise) {
  if (!role) return false;
  if (role === "vertical-pull") return pattern === "vertical-pull";
  if (role === "row") return pattern === "row";
  if (role === "rear-delt") return pattern === "rear-delt";
  if (role === "posterior") return pattern === "hinge" || pattern === "leg-curl";
  if (role === "knee") return ["squat", "leg-press", "unilateral-knee", "knee-extension"].includes(pattern);
  if (role === "chest-secondary") return ["incline-press", "chest-fly", "dip"].includes(pattern);
  if (role === "press") return exercise.type === "compound";
  if (role === "shoulder") return ["shoulder-press", "lateral-raise", "rear-delt"].includes(pattern);
  if (role === "core") return pattern.startsWith("core") || pattern === "leg-raise" || pattern === "rollout" || pattern === "plank";
  return false;
}

function isAdvancedTechniqueExercise(exercise) {
  const name = String(exercise.name || "").toLowerCase();
  return ["conventional deadlift", "good morning", "weighted pull-up", "front squat"].some(term => name.includes(term));
}

function exerciseRange() {
  if (state.duration <= 30) return { min: 4, target: 4, max: 5 };
  if (state.duration <= 45) return { min: 4, target: 5, max: 6 };
  if (state.duration <= 60) return { min: 4, target: 6, max: 7 };
  if (state.duration <= 75) return { min: 4, target: 7, max: 8 };
  return { min: 4, target: 7, max: 8 };
}

function estimateMinutes(items, exerciseMap, withSupersets) {
  let total = 4;
  items.forEach(item => {
    const exercise = exerciseMap.get(item.id);
    const perSet = isHighFatigueCompound(exercise) ? 2.7 : exercise?.type === "compound" ? 2.15 : 1.45;
    total += item.sets * perSet;
  });
  if (withSupersets) total *= 0.9;
  return Math.round(total * 10) / 10;
}

function isHighFatigueCompound(exercise) {
  if (!exercise || exercise.type !== "compound") return false;
  const name = String(exercise.name || "").toLowerCase();
  return ["squat", "deadlift", "rdl", "leg press", "hack squat", "barbell row", "bench press", "overhead press", "military press"].some(term => name.includes(term));
}

function applyAccessorySupersets(days, exerciseMap) {
  days.forEach(day => day.exercises.forEach(item => delete item.supersetGroup));
  if (!state.supersets || state.duration >= 75) return;
  days.forEach(day => {
    const eligible = day.exercises.filter(item => !item.structural && !isHighFatigueCompound(exerciseMap.get(item.id)));
    let group = 1;
    for (let i = 0; i < eligible.length - 1; i += 2) {
      const first = eligible[i], second = eligible[i + 1];
      if (first.primaryMuscle === second.primaryMuscle || interferes(first.primaryMuscle, second.primaryMuscle)) continue;
      first.supersetGroup = `S${group}`;
      second.supersetGroup = `S${group}`;
      group += 1;
    }
  });
}

function interferes(a, b) {
  const pairs = [
    ["Chest", "Triceps"], ["Chest", "Shoulders"], ["Back", "Biceps"], ["Shoulders", "Triceps"],
    ["Quads", "Glutes"], ["Hamstrings", "Glutes"], ["Quads", "Hamstrings"]
  ];
  return pairs.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

function orderExercises(days, exerciseMap) {
  days.forEach(day => day.exercises.sort((a, b) => {
    const aExercise = exerciseMap.get(a.id), bExercise = exerciseMap.get(b.id);
    return Number(state.priorities.includes(b.primaryMuscle)) - Number(state.priorities.includes(a.primaryMuscle))
      || Number(b.structural) - Number(a.structural)
      || Number(bExercise?.type === "compound") - Number(aExercise?.type === "compound");
  }));
}

function secondaryMuscles(exercise) {
  if (exercise?.type !== "compound") return [];
  const muscle = normalizedDisplayMuscle(exercise.muscleGroup);
  if (muscle === "Chest") return ["Triceps", "Shoulders"];
  if (muscle === "Back") return ["Biceps"];
  if (muscle === "Shoulders") return ["Triceps"];
  if (muscle === "Quads") return ["Glutes"];
  if (muscle === "Hamstrings") return ["Glutes"];
  return [];
}

function calculateEffectiveVolume(days, exerciseMap) {
  const totals = Object.fromEntries(MUSCLES.map(m => [m, 0]));
  days.forEach(day => day.exercises.forEach(item => {
    const exercise = exerciseMap.get(item.id);
    const primary = normalizedDisplayMuscle(exercise?.muscleGroup || item.primaryMuscle);
    if (totals[primary] != null) totals[primary] += Number(item.sets) || 0;
    secondaryMuscles(exercise).forEach(muscle => {
      if (totals[muscle] != null) totals[muscle] += (Number(item.sets) || 0) * SECONDARY_CREDIT;
    });
  }));
  Object.keys(totals).forEach(muscle => totals[muscle] = Math.round(totals[muscle] * 10) / 10);
  return totals;
}

function calculateDirectVolume(days, exerciseMap) {
  const totals = Object.fromEntries(MUSCLES.map(m => [m, 0]));
  days.forEach(day => day.exercises.forEach(item => {
    const primary = normalizedDisplayMuscle(exerciseMap.get(item.id)?.muscleGroup || item.primaryMuscle);
    if (totals[primary] != null) totals[primary] += Number(item.sets) || 0;
  }));
  return totals;
}

function calculateDirectExposureCounts(days, exerciseMap) {
  const totals = Object.fromEntries(MUSCLES.map(m => [m, 0]));
  days.forEach(day => {
    const seen = new Set(day.exercises.map(item => normalizedDisplayMuscle(exerciseMap.get(item.id)?.muscleGroup || item.primaryMuscle)));
    seen.forEach(muscle => { if (totals[muscle] != null) totals[muscle] += 1; });
  });
  return totals;
}

function directExposureCount(days, muscle) {
  return days.reduce((sum, day) => sum + Number(day.exercises.some(item => item.primaryMuscle === muscle)), 0);
}

function validateProgram(days, targets, minimums, effective, exposureCounts, split, exerciseMap, baseTemplate) {
  const issues = [];
  const warnings = [];
  if (!baseTemplate) warnings.push("No exact proven template exists for this schedule, so the evidence-based split fallback was used.");
  days.forEach(day => {
    if (day.exercises.length < 4) issues.push(`${day.name} has only ${day.exercises.length} exercises`);
    const ids = day.exercises.map(item => item.id);
    if (new Set(ids).size !== ids.length) issues.push(`${day.name} contains a duplicate exercise`);
    if (estimateMinutes(day.exercises, exerciseMap, state.supersets) > state.duration + 6) issues.push(`${day.name} is likely too long for the selected duration`);
  });

  for (const muscle of MUSCLES) {
    if ((effective[muscle] || 0) > MAX_EFFECTIVE + 0.5 && muscle !== "Core") warnings.push(`${muscle} is above the preferred effective-volume ceiling`);
    if (!state.priorities.includes(muscle) && (effective[muscle] || 0) + 0.49 < (minimums[muscle] || 0)) {
      warnings.push(`${displayMuscle(muscle)} is below its practical weekly floor because of the selected time or exercise restrictions`);
    }
  }

  for (const muscle of state.priorities) {
    const eligible = split.mapping[muscle] || [];
    const desired = Math.min(2, eligible.length);
    if ((exposureCounts[muscle] || 0) < desired) issues.push(`${displayMuscle(muscle)} priority frequency is too low`);
    if ((effective[muscle] || 0) + 0.49 < (minimums[muscle] || 0)) warnings.push(`${displayMuscle(muscle)} priority volume is below the preferred floor for the selected constraints`);
  }

  return { passed: issues.length === 0, issues, warnings };
}
function buildPlanName(split = getSplitDefinition(state.days)) {
  const priority = state.priorities.length ? ` — ${state.priorities.map(displayMuscle).join(" + ")} Priority` : "";
  const splitName = split.shortLabel || split.label;
  return `${state.days}-Day ${splitName} ${GOAL_LABELS[state.goal]} Program${priority}`;
}

function renderReview() {
  const host = document.querySelector("[data-smart-step]");
  if (!host || !generated) return;
  const heading = document.querySelector("[data-smart-heading]");
  const progress = document.querySelector("[data-smart-progress]");
  if (heading) heading.textContent = `${GOAL_LABELS[state.goal]} Program`;
  if (progress) progress.style.width = "100%";
  const map = new Map(getAllExercises().map(exercise => [exercise.id, exercise]));
  const valid = generated.validation.passed;

  const volumeRows = MUSCLES.map(muscle => {
    const priority = state.priorities.includes(muscle);
    return `<div class="${priority ? "priority" : ""}"><span>${escapeHtml(displayMuscle(muscle))}${priority ? " · priority" : ""}</span><strong>${formatNumber(generated.effective[muscle])} effective · ${generated.direct[muscle] || 0} direct · target ~${generated.targets[muscle]}</strong></div>`;
  }).join("");

  const dayRows = generated.days.map(day => {
    const minutes = estimateMinutes(day.exercises, map, state.supersets);
    return `<details class="smart-review-day" open><summary><strong>${escapeHtml(day.name)}</strong><span>${day.exercises.length} exercises · ${totalDaySets(day)} sets · ~${Math.round(minutes)} min</span></summary><div>${day.exercises.map(item => `<p class="${item.supersetGroup ? "is-superset" : ""}"><strong>${item.supersetGroup ? `<em>${item.supersetGroup}</em> ` : ""}${escapeHtml(map.get(item.id)?.name || item.id)}</strong><span>${item.sets} × ${escapeHtml(item.reps)} · ${escapeHtml(displayMuscle(item.primaryMuscle))}</span></p>`).join("")}</div></details>`;
  }).join("");

  const status = valid
    ? `<div class="smart-volume-grid"><div class="priority"><span>Program validation</span><strong>${generated.validation.warnings.length ? "Passed with notes" : "Passed ✓"}</strong></div><div><span>Session structure</span><strong>4+ exercises protected</strong></div></div>${generated.validation.warnings.length ? `<p class="smart-helper">${escapeHtml(generated.validation.warnings.join("; "))}.</p>` : ""}`
    : `<div class="smart-volume-grid"><div><span>Program validation</span><strong>Needs adjustment</strong></div></div><p class="smart-helper">${escapeHtml(generated.validation.issues.join("; "))}. Try a longer session, broader equipment selection, or fewer avoided exercises.</p>`;

  host.innerHTML = `<div class="smart-review"><span class="eyebrow">YOUR PROGRAM</span><h3>${escapeHtml(generated.name)}</h3><div class="smart-review-meta"><span>${state.days} days/week</span><span>${escapeHtml(generated.split.label)}</span><span>~${state.duration} min/session</span><span>${capitalize(state.experience)}</span><span>${escapeHtml(GOAL_LABELS[state.goal])}</span></div><h4>Program guardrails</h4><p class="smart-helper">Your selected split is respected first. Smart Build then establishes balanced workout structure, allocates weekly effective volume, protects priority muscles, honors equipment and exercise restrictions, and keeps the existing 4-exercise minimum / 8-exercise cap and duration checks. Compound sets contribute 0.5 effective-set credit to commonly involved secondary muscles.</p>${status}<h4>Weekly muscle stimulus</h4><div class="smart-volume-grid effective">${volumeRows}</div><h4>Workout days</h4><div class="smart-review-days">${dayRows}</div><p class="smart-review-note">Volume targets are evidence-informed starting ranges rather than rigid prescriptions. Experience, training frequency, session time, muscle priority and indirect compound work all influence the final allocation. Five- and six-day plans can move toward the higher end of the target ranges when recovery and session time allow; they do not automatically force 20 sets.</p><div class="smart-review-actions"><button class="secondary-btn" type="button" data-smart-edit>Edit Answers</button><button class="secondary-btn" type="button" data-smart-regenerate-exercises>New Exercises</button><button class="secondary-btn" type="button" data-smart-regenerate-program>New Program</button><button class="primary-btn" type="button" data-smart-save ${valid ? "" : "disabled"}>${valid ? "Save Plan" : "Adjust Settings"}</button></div></div>`;
}

function savePlan(button) {
  if (!generated?.validation?.passed || saveInProgress) return;
  saveInProgress = true;
  try {
    const plans = readPlans();
    const plan = {
      id: `smart-${Date.now()}`,
      name: generated.name,
      days: generated.days.map(day => ({ name: day.name, exercises: day.exercises.map(item => {
        const output = { id: item.id, sets: item.sets, reps: item.reps };
        if (item.supersetGroup) output.supersetGroup = item.supersetGroup;
        return output;
      }) })),
      smartBuild: { ...generated.smartBuild },
      adaptedFrom: generated.baseTemplate ? {
        id: generated.baseTemplate.id,
        name: generated.baseTemplate.sourceName,
        templateName: generated.baseTemplate.name,
        url: generated.baseTemplate.sourceUrl,
        note: generated.baseTemplate.adaptationNote
      } : null,
      sourceName: generated.baseTemplate?.sourceName || "",
      sourceUrl: generated.baseTemplate?.sourceUrl || ""
    };
    plans.push(plan);
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plans));
    button.textContent = "Saved ✓";
    button.disabled = true;
    setTimeout(() => document.querySelector('.nav-btn[data-page="workout"]')?.click(), 200);
  } finally {
    setTimeout(() => { saveInProgress = false; }, 300);
  }
}

function readPlans() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function equipmentAllowed(exercise) {
  if (state.equipment.includes("Full Gym")) return true;
  const equipment = String(exercise.equipment || "").toLowerCase();
  return state.equipment.some(item => {
    const selected = item.toLowerCase();
    if (selected === "dumbbells") return equipment.includes("dumbbell");
    if (selected === "machines & cables") return equipment.includes("machine") || equipment.includes("cable");
    if (selected === "bodyweight") return equipment.includes("bodyweight") || equipment.includes("body weight") || equipment.includes("weighted bodyweight");
    return equipment.includes(selected.replace(/s$/, "")) || selected.includes(equipment.replace(/s$/, ""));
  });
}

function getRepTarget(exercise) {
  if (state.goal === "strength" && exercise.type === "compound") return "4-6";
  if (state.goal === "hybrid" && exercise.type === "compound") return "5-8";
  return exercise.recommendedReps || (exercise.type === "compound" ? "6-12" : "10-15");
}

function primarySetsForMuscle(day, muscle) {
  return day.exercises.reduce((sum, item) => sum + (item.primaryMuscle === muscle ? Number(item.sets || 0) : 0), 0);
}
function totalDaySets(day) {
  return day.exercises.reduce((sum, item) => sum + Number(item.sets || 0), 0);
}
function normalizedMuscle(value) {
  const muscle = String(value || "").toLowerCase();
  if (muscle === "rear delts") return "shoulders";
  if (muscle === "lats") return "back";
  if (muscle === "abs" || muscle === "abs / core") return "core";
  return muscle;
}
function normalizedDisplayMuscle(value) {
  const normalized = normalizedMuscle(value);
  return MUSCLES.find(muscle => muscle.toLowerCase() === normalized) || value;
}
function displayMuscle(muscle) { return DISPLAY_NAME[muscle] || muscle; }
function deterministicNoise(text, seed) {
  let hash = 2166136261 ^ Number(seed || 0);
  for (const char of String(text || "")) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return Math.abs(hash % 19);
}
function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}
function capitalize(value) { return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1); }
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function enhanceWizard() {
  const host = document.querySelector("[data-smart-step]");
  if (!host) return;
  const priorityGrid = host.querySelector("[data-priority]")?.closest(".muscle-priority-grid");
  if (priorityGrid && !priorityGrid.querySelector('[data-priority="Core"]')) {
    priorityGrid.insertAdjacentHTML("beforeend", renderMusclePriorityChoice("Core", state.priorities.includes("Core")));
    const helper = priorityGrid.parentElement?.querySelector(".smart-helper");
    if (helper && /selected/.test(helper.textContent || "")) helper.textContent = `${state.priorities.length}/${PRIORITY_LIMIT} selected`;
  }

  const volumeSummary = host.querySelector(".smart-volume-summary");
  if (volumeSummary && host.querySelector("[data-supersets]") && !volumeSummary.querySelector("[data-core-volume]")) {
    const row = document.createElement("div");
    row.dataset.coreVolume = "true";
    const targets = getWeeklyTargets();
    row.innerHTML = `<span>Abs / Core${state.priorities.includes("Core") ? " ★" : ""}</span><strong>${targets.Core} sets/wk</strong>`;
    volumeSummary.appendChild(row);
  }
}

const observer = new MutationObserver(() => {
  if (observerQueued) return;
  observerQueued = true;
  requestAnimationFrame(() => {
    observerQueued = false;
    enhanceWizard();
  });
});
observer.observe(document.documentElement, { childList: true, subtree: true });
enhanceWizard();
