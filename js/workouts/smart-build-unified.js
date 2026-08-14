import { getAllExercises } from "./exercise-library.js?v=exercise-library-catalogue-2";
import { getTrainingPreferences } from "../core/training-preferences.js?v=onboarding-1";

const PLAN_STORAGE_KEY = "forge_workout_plans";
const MUSCLES = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves", "Core"];
const PRIORITY_LIMIT = 3;
const GOALS = {
  muscle: { label: "Build Muscle", copy: "Build hypertrophy volume while balancing coverage, recovery and session time." },
  strength: { label: "Build Strength", copy: "Prioritize compound practice, lower rep ranges and manageable accessory volume." },
  hybrid: { label: "Strength + Muscle", copy: "Blend strength-focused compounds with enough volume for hypertrophy." },
  maintain: { label: "Maintain", copy: "Use an efficient dose to maintain muscle and strength." }
};

const SPLITS = {
  2: [
    { name: "Full Body A", muscles: MUSCLES },
    { name: "Full Body B", muscles: MUSCLES }
  ],
  3: [
    { name: "Full Body A", muscles: MUSCLES },
    { name: "Full Body B", muscles: MUSCLES },
    { name: "Full Body C", muscles: MUSCLES }
  ],
  4: [
    { name: "Upper A", muscles: ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Core"] },
    { name: "Lower A", muscles: ["Quads", "Hamstrings", "Glutes", "Calves", "Core"] },
    { name: "Upper B", muscles: ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Core"] },
    { name: "Lower B", muscles: ["Quads", "Hamstrings", "Glutes", "Calves", "Core"] }
  ],
  5: [
    { name: "Upper", muscles: ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Core"] },
    { name: "Lower", muscles: ["Quads", "Hamstrings", "Glutes", "Calves", "Core"] },
    { name: "Push", muscles: ["Chest", "Shoulders", "Triceps", "Core"] },
    { name: "Pull", muscles: ["Back", "Shoulders", "Biceps", "Core"] },
    { name: "Legs", muscles: ["Quads", "Hamstrings", "Glutes", "Calves", "Core"] }
  ],
  6: [
    { name: "Push A", muscles: ["Chest", "Shoulders", "Triceps", "Core"] },
    { name: "Pull A", muscles: ["Back", "Shoulders", "Biceps", "Core"] },
    { name: "Legs A", muscles: ["Quads", "Hamstrings", "Glutes", "Calves", "Core"] },
    { name: "Push B", muscles: ["Chest", "Shoulders", "Triceps", "Core"] },
    { name: "Pull B", muscles: ["Back", "Shoulders", "Biceps", "Core"] },
    { name: "Legs B", muscles: ["Quads", "Hamstrings", "Glutes", "Calves", "Core"] }
  ]
};

const VOLUME_RANGES = {
  muscle: {
    beginner: { normal: [8, 12], priority: [10, 14] },
    intermediate: { normal: [10, 14], priority: [12, 16] },
    advanced: { normal: [10, 16], priority: [14, 20] }
  },
  hybrid: {
    beginner: { normal: [7, 11], priority: [9, 13] },
    intermediate: { normal: [8, 13], priority: [11, 16] },
    advanced: { normal: [9, 15], priority: [12, 18] }
  },
  strength: {
    beginner: { normal: [5, 8], priority: [7, 10] },
    intermediate: { normal: [6, 9], priority: [8, 12] },
    advanced: { normal: [6, 10], priority: [9, 13] }
  },
  maintain: {
    beginner: { normal: [4, 7], priority: [6, 9] },
    intermediate: { normal: [5, 8], priority: [7, 10] },
    advanced: { normal: [5, 9], priority: [8, 11] }
  }
};

const FREQUENCY_POSITION = {
  normal: { 2: 0.2, 3: 0.35, 4: 0.5, 5: 0.65, 6: 0.75 },
  priority: { 2: 0.3, 3: 0.45, 4: 0.6, 5: 0.8, 6: 0.9 }
};

const NEVER_SUPERSET = [
  /\bsquat\b/i, /\bdeadlift\b/i, /\brdl\b/i, /\bleg press\b/i, /\bhack squat\b/i,
  /\bbarbell row\b/i, /\bpendlay row\b/i, /\bbench press\b/i, /\boverhead press\b/i, /\bmilitary press\b/i
];
const INTERFERENCE = new Set([
  "Chest|Triceps", "Chest|Shoulders", "Back|Biceps", "Shoulders|Triceps",
  "Quads|Glutes", "Hamstrings|Glutes", "Quads|Hamstrings"
].flatMap(value => [value, value.split("|").reverse().join("|")]));
const BEGINNER_COMPLEX = /weighted pull-up|conventional deadlift|good morning|front squat|barbell row/i;

const state = freshState();

export function initializeSmartBuild(root = document) {
  const home = root.querySelector?.("[data-workout-home]");
  if (!home) return;
  home.querySelector("[data-smart-build-launcher]")?.remove();
  root.querySelector("[data-smart-build-wizard]")?.remove();
  home.insertAdjacentHTML("afterbegin", renderLauncher());
  home.insertAdjacentHTML("afterend", renderWizardShell());
  if (root.dataset.smartBuildUnifiedBound !== "true") {
    root.dataset.smartBuildUnifiedBound = "true";
    root.addEventListener("click", event => handleClick(root, event));
    root.addEventListener("change", event => handleChange(root, event));
    root.addEventListener("input", event => handleInput(root, event));
  }
}

function freshState() {
  const prefs = getTrainingPreferences();
  const goalMap = { build_muscle: "muscle", build_strength: "strength", maintain_muscle: "maintain", lose_fat_maintain_muscle: "maintain" };
  const experienceMap = { new: "beginner", intermediate: "intermediate", experienced: "advanced", advanced: "advanced" };
  const days = [2, 3, 4, 5, 6].includes(Number(prefs.days)) ? Number(prefs.days) : 4;
  const duration = [30, 45, 60, 75, 90].includes(Number(prefs.duration)) ? Number(prefs.duration) : 60;
  const priorities = (Array.isArray(prefs.priorities) ? prefs.priorities : [])
    .map(normalizePriority)
    .filter(muscle => MUSCLES.includes(muscle))
    .slice(0, PRIORITY_LIMIT);
  const excludedIds = Array.isArray(prefs.excludedIds) ? [...prefs.excludedIds] : [];
  return {
    step: 0,
    goal: goalMap[prefs.primaryGoal] || "muscle",
    days,
    duration,
    priorities,
    experience: experienceMap[prefs.experience] || "intermediate",
    equipment: ["Full Gym"],
    preferredIds: [],
    excludedIds,
    supersets: true,
    variation: 0,
    generated: null
  };
}

function normalizePriority(value) {
  const text = String(value || "").trim().toLowerCase();
  if (["abs", "abs / core", "core", "abdominals"].includes(text)) return "Core";
  return MUSCLES.find(muscle => muscle.toLowerCase() === text) || value;
}

function resetState() {
  Object.assign(state, freshState());
}

function handleClick(root, event) {
  const button = event.target.closest?.("button");
  if (!button || !root.contains(button)) return;

  if (button.matches("[data-manual-build]")) {
    root.querySelector("#new-plan-btn")?.click();
    return;
  }
  if (button.matches("[data-template-build]")) {
    const details = root.querySelector(".workout-catalogue-details");
    if (details) {
      details.open = true;
      details.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return;
  }
  if (button.matches("[data-smart-build]")) {
    resetState();
    openWizard(root);
    return;
  }
  if (button.matches("[data-smart-close]")) {
    closeWizard(root);
    return;
  }
  if (button.matches("[data-smart-back]")) {
    state.step = Math.max(0, state.step - 1);
    renderStep(root);
    return;
  }
  if (button.matches("[data-smart-next]")) {
    if (state.step === 4) {
      state.generated = generateProgram();
      state.step = 5;
    } else {
      state.step += 1;
    }
    renderStep(root);
    return;
  }

  if (button.dataset.goal) state.goal = button.dataset.goal;
  else if (button.dataset.days) state.days = Number(button.dataset.days);
  else if (button.dataset.duration) state.duration = Number(button.dataset.duration);
  else if (button.dataset.experience) state.experience = button.dataset.experience;
  else if (button.dataset.priority) togglePriority(button.dataset.priority);
  else if (button.dataset.equipment) toggleEquipment(button.dataset.equipment);
  else if (button.dataset.preferId) chooseExercise(button.dataset.preferId, "prefer");
  else if (button.dataset.excludeId) chooseExercise(button.dataset.excludeId, "exclude");
  else if (button.dataset.removePreferred) state.preferredIds = state.preferredIds.filter(id => id !== button.dataset.removePreferred);
  else if (button.dataset.removeExcluded) state.excludedIds = state.excludedIds.filter(id => id !== button.dataset.removeExcluded);
  else if (button.matches("[data-preferred-toggle]")) {
    const panel = root.querySelector("[data-preferred-panel]");
    if (panel) {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) renderExerciseResults(root, root.querySelector("[data-preferred-search]")?.value || "", "prefer");
    }
    return;
  } else if (button.matches("[data-avoid-toggle]")) {
    const panel = root.querySelector("[data-avoid-panel]");
    if (panel) {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) renderExerciseResults(root, root.querySelector("[data-avoid-search]")?.value || "", "avoid");
    }
    return;
  } else if (button.matches("[data-smart-regenerate]")) {
    state.variation += 1;
    state.generated = generateProgram();
  } else if (button.matches("[data-smart-edit]")) {
    state.step = 0;
  } else if (button.matches("[data-smart-save]")) {
    saveGeneratedPlan(root);
    return;
  } else if (button.dataset.adjustSet) {
    adjustSets(Number(button.dataset.dayIndex), Number(button.dataset.exerciseIndex), Number(button.dataset.adjustSet));
  } else if (button.matches("[data-replace-exercise]")) {
    replaceExercise(Number(button.dataset.dayIndex), Number(button.dataset.exerciseIndex));
  } else {
    return;
  }
  renderStep(root);
}

function handleChange(root, event) {
  if (event.target.matches?.("[data-supersets]")) state.supersets = event.target.checked;
}

function handleInput(root, event) {
  if (event.target.matches?.("[data-preferred-search]")) renderExerciseResults(root, event.target.value, "prefer");
  if (event.target.matches?.("[data-avoid-search]")) renderExerciseResults(root, event.target.value, "avoid");
}

function renderLauncher() {
  return `<section class="smart-build-launcher" data-smart-build-launcher>
    <div class="smart-build-launcher-head"><span class="eyebrow">BUILD A PROGRAM</span><p>Choose how you want to create your training plan.</p></div>
    <div class="smart-build-choice-grid">
      <button class="smart-build-choice" type="button" data-manual-build><span class="smart-build-choice-title">Manual Build</span><small>Build it yourself</small></button>
      <button class="smart-build-choice" type="button" data-template-build><span class="smart-build-choice-title">Templates</span><small>Start from a proven split</small></button>
      <button class="smart-build-choice smart-build-choice-primary" type="button" data-smart-build><span class="smart-build-badge">GUIDED</span><span class="smart-build-choice-title">Smart Build</span><small>Goal-driven personalized programming</small></button>
    </div>
  </section>`;
}

function renderWizardShell() {
  return `<section class="smart-build-wizard" data-smart-build-wizard hidden>
    <div class="smart-build-topbar"><div><span class="eyebrow">SMART BUILD</span><h3 data-smart-heading>Program Builder</h3></div><button class="secondary-btn smart-build-close" type="button" data-smart-close>Close</button></div>
    <div class="smart-build-progress"><span data-smart-progress></span></div><div data-smart-step></div>
  </section>`;
}

function openWizard(root) {
  root.querySelector("[data-workout-home]")?.setAttribute("hidden", "");
  const wizard = root.querySelector("[data-smart-build-wizard]");
  if (!wizard) return;
  wizard.hidden = false;
  renderStep(root);
  wizard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeWizard(root) {
  const wizard = root.querySelector("[data-smart-build-wizard]");
  const home = root.querySelector("[data-workout-home]");
  if (wizard) wizard.hidden = true;
  if (home) home.hidden = false;
}

function renderStep(root) {
  const host = root.querySelector("[data-smart-step]");
  const progress = root.querySelector("[data-smart-progress]");
  const heading = root.querySelector("[data-smart-heading]");
  if (!host || !progress) return;
  const steps = [renderGoalStep, renderScheduleStep, renderPriorityExperienceStep, renderEquipmentStep, renderProgrammingStep, renderResultStep];
  progress.style.width = `${((state.step + 1) / steps.length) * 100}%`;
  if (heading) heading.textContent = `${GOALS[state.goal].label} Program`;
  host.innerHTML = steps[state.step]();
}

function renderGoalStep() {
  return questionCard("1", "Primary goal", "What should this program optimize for?", Object.entries(GOALS).map(([value, goal]) =>
    `<button class="smart-option ${state.goal === value ? "selected" : ""}" type="button" data-goal="${value}"><strong>${goal.label}</strong><small>${goal.copy}</small></button>`
  ).join(""), false);
}

function renderScheduleStep() {
  return questionCard("2", "Schedule", "Choose your weekly frequency and typical session length.",
    `<strong class="smart-field-label">Days per week</strong>${chipRow([2, 3, 4, 5, 6], state.days, "days")}
     <strong class="smart-field-label">Session length</strong>${chipRow([30, 45, 60, 75, 90], state.duration, "duration", value => value === 90 ? "90+ min" : `${value} min`)}`);
}

function renderPriorityExperienceStep() {
  const experience = [
    ["beginner", "Beginner — ~0–1 year", "Still developing technique and consistent progression."],
    ["intermediate", "Intermediate — ~1–3 years", "Solid technique and comfortable with progressive overload."],
    ["advanced", "Advanced — ~3+ years", "Highly experienced; progress may require more precise volume and exercise selection."]
  ];
  return questionCard("3", "Priorities & experience", "Choose up to 3 muscles to emphasize. Experience sets the starting volume range; priority, frequency and time determine where within that range the plan lands.",
    `<div class="smart-chip-grid">${MUSCLES.map(muscle => `<button type="button" class="smart-chip ${state.priorities.includes(muscle) ? "selected" : ""}" data-priority="${muscle}">${displayMuscle(muscle)}</button>`).join("")}</div>
     <p class="smart-helper">${state.priorities.length}/${PRIORITY_LIMIT} selected</p>
     <div class="smart-option-stack">${experience.map(([value, label, copy]) => `<button class="smart-option ${state.experience === value ? "selected" : ""}" type="button" data-experience="${value}"><strong>${label}</strong><small>${copy}</small></button>`).join("")}</div>
     <p class="smart-helper">Years are a ballpark only. Training quality and consistency matter more than the exact number of years.</p>`);
}

function renderEquipmentStep() {
  const presets = ["Full Gym", "Barbell", "Dumbbells", "Machines & Cables", "Bodyweight"];
  return questionCard("4", "Choose your equipment", "Select everything you have access to. Full Gym includes all equipment types.",
    `<strong class="smart-field-label">Available equipment</strong>
     <div class="smart-chip-grid">${presets.map(value => `<button type="button" class="smart-chip ${state.equipment.includes(value) ? "selected" : ""}" data-equipment="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("")}</div>
     <p class="smart-helper">Selected: ${state.equipment.join(", ")}</p>
     <div class="smart-picker-block"><button class="smart-picker-toggle" type="button" data-preferred-toggle>Preferred exercises ▾</button><div class="smart-picker-panel" data-preferred-panel hidden><input type="search" data-preferred-search placeholder="Search exercises to prefer"><div class="smart-search-results" data-preferred-results></div></div></div>
     <div class="smart-selected-list">${renderSelectedExercises(state.preferredIds, "preferred")}</div>
     <div class="smart-picker-block"><button class="smart-picker-toggle" type="button" data-avoid-toggle>Avoid / discomfort ▾</button><div class="smart-picker-panel" data-avoid-panel hidden><input type="search" data-avoid-search placeholder="Search exercises to avoid"><div class="smart-search-results" data-avoid-results></div></div></div>
     <div class="smart-selected-list">${renderSelectedExercises(state.excludedIds, "excluded")}</div>`);
}

function renderProgrammingStep() {
  const targets = getVolumePlan();
  const range = sessionExerciseRange();
  return questionCard("5", "Programming approach", "Smart Build now protects workout structure first, then fills effective weekly volume, priorities and duration.",
    `<div class="smart-volume-summary">${MUSCLES.map(muscle => `<div><span>${displayMuscle(muscle)}${state.priorities.includes(muscle) ? " ★" : ""}</span><strong>${targets[muscle].target} effective sets/wk</strong></div>`).join("")}</div>
     <p class="smart-helper">For ${state.duration === 90 ? "90+" : state.duration}-minute sessions, Smart Build targets about ${range.target} exercises, with a 4-exercise minimum and an 8-exercise hard cap. Short sessions can use lower volume rather than sacrificing balanced coverage.</p>
     <label class="smart-superset-toggle"><input type="checkbox" data-supersets ${state.supersets ? "checked" : ""}><span><strong>Allow time-saving supersets</strong><small>Accessory-focused. High-fatigue compounds stay standalone.</small></span></label>
     <p class="smart-helper">Compound sets count as 1.0 set for the primary muscle and 0.5 effective set for common secondary muscles so arms and shoulders are not padded with unnecessary direct work.</p>`, true, "Build Program");
}

function renderResultStep() {
  if (!state.generated) return `<p class="smart-helper">Program could not be generated.</p>`;
  const program = state.generated;
  const validation = program.validation;
  const status = validation.passed
    ? `<div class="smart-volume-summary"><div><span>Program validation</span><strong>Passed ✓</strong></div><div><span>Structure</span><strong>4+ exercises every day</strong></div></div>`
    : `<div class="smart-volume-summary"><div><span>Program validation</span><strong>Needs attention</strong></div></div><p class="smart-helper">${escapeHtml(validation.message)}</p>`;
  const volumeRows = MUSCLES.map(muscle => {
    const priority = state.priorities.includes(muscle);
    const actual = Number(program.effective[muscle] || 0);
    const target = program.volumePlan[muscle].target;
    const exposures = Number(program.exposures[muscle] || 0);
    return `<div class="${priority ? "priority" : ""}"><span>${displayMuscle(muscle)}${priority ? " ★" : ""}</span><strong>${formatNumber(actual)}/${target} effective · ${exposures}× direct</strong></div>`;
  }).join("");
  return `<div class="smart-question-card"><div class="smart-question-number">✓</div>
    <h4>${escapeHtml(GOALS[state.goal].label)} — ${state.days} days</h4>
    <p>${escapeHtml(program.summary)}</p>
    ${status}
    <div class="smart-volume-summary">${volumeRows}</div>
    <div class="smart-review-grid">${program.days.map((day, dayIndex) => `<article class="smart-review-day"><h5>${escapeHtml(day.name)}</h5><p class="smart-helper">~${Math.round(estimateMinutes(day.exercises, state.supersets))} min · ${day.exercises.length} exercises</p>${day.exercises.map((item, exerciseIndex) => renderExerciseRow(item, dayIndex, exerciseIndex)).join("")}</article>`).join("")}</div>
    <div class="smart-question-actions smart-result-actions"><button class="secondary-btn" type="button" data-smart-edit>Edit Inputs</button><button class="secondary-btn" type="button" data-smart-regenerate>Regenerate</button><button class="primary-btn" type="button" data-smart-save ${validation.passed ? "" : "disabled"}>${validation.passed ? "Save Plan" : "Adjust Inputs"}</button></div>
  </div>`;
}

function renderExerciseRow(item, dayIndex, exerciseIndex) {
  const def = exerciseMap().get(item.id);
  const superset = item.supersetGroup ? `<em>Superset ${item.supersetGroup}</em>` : "";
  return `<div class="smart-review-exercise ${item.supersetGroup ? "is-superset" : ""}"><div><strong>${escapeHtml(def?.name || item.name || item.id)}</strong><small>${item.sets} × ${escapeHtml(item.reps)} · ${escapeHtml(displayMuscle(normalizedDisplayMuscle(def?.muscleGroup || item.muscleGroup || "")))}</small>${superset}</div><div class="smart-review-controls"><button type="button" data-adjust-set="-1" data-day-index="${dayIndex}" data-exercise-index="${exerciseIndex}" aria-label="Remove set">−</button><button type="button" data-adjust-set="1" data-day-index="${dayIndex}" data-exercise-index="${exerciseIndex}" aria-label="Add set">+</button><button type="button" data-replace-exercise data-day-index="${dayIndex}" data-exercise-index="${exerciseIndex}">Replace</button></div></div>`;
}

function questionCard(number, title, copy, body, back = true, next = "Continue") {
  return `<div class="smart-question-card"><div class="smart-question-number">${number}</div><h4>${title}</h4><p>${copy}</p><div class="smart-question-body">${body}</div><div class="smart-question-actions">${back ? '<button class="secondary-btn" type="button" data-smart-back>Back</button>' : "<span></span>"}<button class="primary-btn" type="button" data-smart-next>${next}</button></div></div>`;
}

function chipRow(values, selected, key, labeler = String) {
  return `<div class="smart-chip-grid">${values.map(value => `<button type="button" class="smart-chip ${selected === value ? "selected" : ""}" data-${key}="${value}">${labeler(value)}</button>`).join("")}</div>`;
}

function togglePriority(muscle) {
  if (state.priorities.includes(muscle)) state.priorities = state.priorities.filter(value => value !== muscle);
  else if (state.priorities.length < PRIORITY_LIMIT) state.priorities.push(muscle);
}

function toggleEquipment(value) {
  if (value === "Full Gym") {
    state.equipment = ["Full Gym"];
    return;
  }
  state.equipment = state.equipment.filter(item => item !== "Full Gym");
  state.equipment = state.equipment.includes(value) ? state.equipment.filter(item => item !== value) : [...state.equipment, value];
  if (!state.equipment.length) state.equipment = ["Full Gym"];
}

function chooseExercise(id, mode) {
  if (mode === "prefer") {
    state.excludedIds = state.excludedIds.filter(value => value !== id);
    if (!state.preferredIds.includes(id)) state.preferredIds.push(id);
  } else {
    state.preferredIds = state.preferredIds.filter(value => value !== id);
    if (!state.excludedIds.includes(id)) state.excludedIds.push(id);
  }
}

function renderExerciseResults(root, query, mode) {
  const host = root.querySelector(mode === "prefer" ? "[data-preferred-results]" : "[data-avoid-results]");
  if (!host) return;
  const term = String(query || "").trim().toLowerCase();
  const results = getAllExercises()
    .filter(exercise => exercise.trackingType !== "notes")
    .filter(exercise => !term || [exercise.name, exercise.muscleGroup, exercise.equipment].some(value => String(value || "").toLowerCase().includes(term)))
    .sort((a, b) => String(a.muscleGroup).localeCompare(String(b.muscleGroup)) || String(a.name).localeCompare(String(b.name)))
    .slice(0, 40);
  host.innerHTML = results.length ? results.map(exercise => `<div class="smart-search-row"><div><strong>${escapeHtml(exercise.name)}</strong><small>${escapeHtml(exercise.muscleGroup)} · ${escapeHtml(exercise.equipment)}</small></div><button type="button" ${mode === "prefer" ? `data-prefer-id="${escapeHtml(exercise.id)}"` : `data-exclude-id="${escapeHtml(exercise.id)}"`}>${mode === "prefer" ? "Prefer" : "Avoid"}</button></div>`).join("") : `<p class="smart-helper">No matching exercises.</p>`;
}

function renderSelectedExercises(ids, type) {
  const map = exerciseMap();
  return ids.length ? ids.map(id => `<button type="button" class="smart-selected-chip" data-remove-${type}="${escapeHtml(id)}">${escapeHtml(map.get(id)?.name || id)} ×</button>`).join("") : `<small>None selected</small>`;
}

function sessionExerciseRange() {
  if (state.duration <= 30) return { min: 4, target: 4, max: 5 };
  if (state.duration <= 45) return { min: 4, target: 5, max: 6 };
  if (state.duration <= 60) return { min: 4, target: 6, max: 7 };
  return { min: 4, target: 7, max: 8 };
}

function getVolumePlan() {
  const config = VOLUME_RANGES[state.goal]?.[state.experience] || VOLUME_RANGES.muscle.intermediate;
  const durationAdjustment = state.duration <= 30 ? -2 : state.duration <= 45 ? -1 : state.duration >= 90 ? 1 : 0;
  const plan = {};
  MUSCLES.forEach(muscle => {
    const priority = state.priorities.includes(muscle);
    if (muscle === "Core") {
      const target = priority
        ? clamp(8 + (state.days >= 4 ? 2 : 0) + (state.days >= 6 ? 2 : 0) + (state.experience === "advanced" ? 1 : 0) + Math.min(0, durationAdjustment), 6, 14)
        : clamp((state.duration <= 30 ? 2 : 4) + (state.days >= 4 ? 2 : 0), 2, 8);
      const floor = priority ? Math.max(6, target - 3) : state.duration <= 30 ? 0 : Math.max(2, target - 3);
      plan[muscle] = { target, floor, priority };
      return;
    }
    const range = priority ? config.priority : config.normal;
    const position = FREQUENCY_POSITION[priority ? "priority" : "normal"][state.days] ?? 0.5;
    let target = Math.round(range[0] + (range[1] - range[0]) * position + durationAdjustment);
    if (state.goal === "muscle") target = clamp(target, 6, priority ? 20 : 18);
    else target = clamp(target, 4, 18);
    const floorGap = state.duration <= 30 ? 4 : priority ? 2 : 3;
    const minimumFloor = state.goal === "muscle" ? (state.duration <= 30 ? 5 : 7) : 4;
    plan[muscle] = { target, floor: Math.max(minimumFloor, target - floorGap), priority };
  });
  scaleFloorsToCapacity(plan);
  return plan;
}

function scaleFloorsToCapacity(plan) {
  const weeklyCapacity = estimatedWeeklySetCapacity();
  const totalFloors = MUSCLES.reduce((sum, muscle) => sum + (plan[muscle]?.floor || 0), 0);
  if (totalFloors <= weeklyCapacity * 1.45) return;
  const ratio = (weeklyCapacity * 1.45) / totalFloors;
  MUSCLES.forEach(muscle => {
    const item = plan[muscle];
    if (!item || item.priority) return;
    const minimum = muscle === "Core" ? 0 : ["Chest", "Back", "Quads", "Hamstrings"].includes(muscle) ? 4 : 2;
    item.floor = Math.max(minimum, Math.floor(item.floor * ratio));
  });
}

function estimatedWeeklySetCapacity() {
  const base = state.duration <= 30 ? 10 : state.duration <= 45 ? 14 : state.duration <= 60 ? 18 : state.duration <= 75 ? 22 : 26;
  const bonus = state.supersets ? Math.round(base * 0.1) : 0;
  return (base + bonus) * state.days;
}

function generateProgram() {
  const pool = availableExercises();
  const preferred = new Set(state.preferredIds);
  const volumePlan = getVolumePlan();
  let best = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const usedCounts = new Map();
    const days = SPLITS[state.days].map(day => ({ name: day.name, muscles: [...day.muscles], exercises: [] }));
    seedWorkoutStructure(days, pool, preferred, usedCounts, attempt);
    ensureMinimumExercises(days, pool, preferred, usedCounts, attempt);
    ensurePriorityFrequency(days, pool, preferred, usedCounts, volumePlan, attempt);
    fillVolume(days, pool, preferred, usedCounts, volumePlan, attempt);
    trimExcessVolume(days, volumePlan);
    days.forEach(day => fitSessionTime(day, volumePlan));
    ensureMinimumExercises(days, pool, preferred, usedCounts, attempt + 9);
    repairCoverage(days, pool, preferred, usedCounts, attempt);
    days.forEach(day => fitSessionTime(day, volumePlan));
    days.forEach(day => {
      day.exercises = sortExercises(day.exercises);
      if (state.supersets) assignSupersets(day);
    });

    const effective = calculateEffectiveVolume(days);
    const direct = calculateDirectVolume(days);
    const exposures = calculateExposureCounts(days);
    const validation = validateProgram(days, volumePlan, effective, exposures);
    const candidate = {
      days,
      volumePlan,
      effective,
      direct,
      exposures,
      validation,
      summary: buildSummary(days, validation)
    };
    best = candidate;
    if (validation.passed) break;
    state.variation += 1;
  }
  return best;
}

function seedWorkoutStructure(days, pool, preferred, usedCounts, attempt) {
  days.forEach((day, dayIndex) => {
    const requirements = requirementsForDay(day.name, dayIndex);
    requirements.forEach((requirement, requirementIndex) => {
      addExerciseForRequirement(day, requirement, pool, preferred, usedCounts, dayIndex + attempt + requirementIndex, true);
    });
  });
}

function requirementsForDay(name, dayIndex) {
  if (/full body/i.test(name)) {
    return [
      { muscles: ["Chest"], patterns: ["chest-press"], preferCompound: true },
      { muscles: ["Back"], patterns: dayIndex % 2 === 0 ? ["back-horizontal", "back-vertical"] : ["back-vertical", "back-horizontal"], preferCompound: true },
      { muscles: ["Quads"], patterns: ["knee-compound"], preferCompound: true },
      { muscles: ["Hamstrings", "Glutes"], patterns: ["hinge", "glute-compound"], preferCompound: true }
    ];
  }
  if (/^upper/i.test(name)) {
    return [
      { muscles: ["Chest"], patterns: ["chest-press"], preferCompound: true },
      { muscles: ["Back"], patterns: ["back-vertical"], preferCompound: true },
      { muscles: ["Back"], patterns: ["back-horizontal"], preferCompound: true },
      { muscles: ["Shoulders"], patterns: ["shoulder-press", "shoulder-isolation", "rear-delt"] }
    ];
  }
  if (/^push/i.test(name)) {
    return [
      { muscles: ["Chest"], patterns: ["chest-press"], preferCompound: true },
      { muscles: ["Shoulders"], patterns: ["shoulder-press", "shoulder-isolation"] },
      { muscles: ["Triceps"], patterns: ["triceps"] },
      { muscles: ["Chest", "Shoulders"], patterns: ["chest-isolation", "shoulder-isolation", "chest-press"] }
    ];
  }
  if (/^pull/i.test(name)) {
    return [
      { muscles: ["Back"], patterns: ["back-vertical"], preferCompound: true },
      { muscles: ["Back"], patterns: ["back-horizontal"], preferCompound: true },
      { muscles: ["Biceps"], patterns: ["biceps"] },
      { muscles: ["Shoulders", "Back"], patterns: ["rear-delt", "back-horizontal", "back-vertical"] }
    ];
  }
  if (/^(lower|legs)/i.test(name)) {
    return [
      { muscles: ["Quads"], patterns: ["knee-compound"], preferCompound: true },
      { muscles: ["Hamstrings", "Glutes"], patterns: ["hinge", "glute-compound"], preferCompound: true },
      { muscles: ["Quads", "Hamstrings"], patterns: ["knee-isolation", "ham-isolation", "knee-compound", "hinge"] },
      { muscles: ["Calves", "Glutes"], patterns: ["calves", "glute-isolation", "glute-compound"] }
    ];
  }
  return [];
}

function addExerciseForRequirement(day, requirement, pool, preferred, usedCounts, seed, structural = false) {
  const candidate = chooseExercise(day, requirement.muscles, pool, preferred, usedCounts, seed, {
    patterns: requirement.patterns,
    preferCompound: requirement.preferCompound
  });
  if (!candidate) return false;
  const sets = state.goal === "strength" && candidate.type === "compound" ? 3 : 2;
  day.exercises.push(makeExercise(candidate, sets, structural));
  usedCounts.set(candidate.id, (usedCounts.get(candidate.id) || 0) + 1);
  return true;
}

function ensureMinimumExercises(days, pool, preferred, usedCounts, attempt) {
  const range = sessionExerciseRange();
  days.forEach((day, dayIndex) => {
    let guard = 20;
    while (day.exercises.length < range.min && guard-- > 0) {
      const represented = muscleCounts(day);
      const candidates = day.muscles
        .filter(muscle => muscle !== "Core" || state.priorities.includes("Core") || state.duration >= 45)
        .sort((a, b) => (represented[a] || 0) - (represented[b] || 0) || Number(state.priorities.includes(b)) - Number(state.priorities.includes(a)));
      let added = false;
      for (const muscle of candidates) {
        const candidate = chooseExercise(day, [muscle], pool, preferred, usedCounts, dayIndex + attempt + guard, { preferVariety: true });
        if (!candidate) continue;
        const item = makeExercise(candidate, 2, false);
        if (!canFitAddition(day, item)) continue;
        day.exercises.push(item);
        usedCounts.set(candidate.id, (usedCounts.get(candidate.id) || 0) + 1);
        added = true;
        break;
      }
      if (!added) break;
    }
  });
}

function ensurePriorityFrequency(days, pool, preferred, usedCounts, volumePlan, attempt) {
  state.priorities.forEach(muscle => {
    const desired = desiredDirectFrequency(muscle);
    let guard = 12;
    while (directExposureCount(days, muscle) < desired && guard-- > 0) {
      const eligible = days
        .map((day, index) => ({ day, index }))
        .filter(({ day }) => day.muscles.includes(muscle) && !day.exercises.some(item => normalizedItemMuscle(item) === muscle))
        .sort((a, b) => estimateMinutes(a.day.exercises, state.supersets) - estimateMinutes(b.day.exercises, state.supersets));
      let added = false;
      for (const slot of eligible) {
        if (slot.day.exercises.length >= sessionExerciseRange().max) continue;
        const candidate = chooseExercise(slot.day, [muscle], pool, preferred, usedCounts, slot.index + attempt + guard, { preferVariety: true });
        if (!candidate) continue;
        const item = makeExercise(candidate, 2, false);
        if (!canFitAddition(slot.day, item)) continue;
        slot.day.exercises.push(item);
        usedCounts.set(candidate.id, (usedCounts.get(candidate.id) || 0) + 1);
        added = true;
        break;
      }
      if (!added) break;
    }
  });
}

function desiredDirectFrequency(muscle) {
  const eligibleCount = SPLITS[state.days].filter(day => day.muscles.includes(muscle)).length;
  if (muscle === "Core") {
    const desired = state.priorities.includes("Core") ? (state.days >= 6 ? 4 : state.days >= 4 ? 3 : 2) : (state.duration >= 60 ? 2 : 1);
    return Math.min(desired, eligibleCount);
  }
  return Math.min(state.priorities.includes(muscle) ? 2 : 1, eligibleCount);
}

function fillVolume(days, pool, preferred, usedCounts, volumePlan, attempt) {
  let guard = 700;
  while (guard-- > 0) {
    const effective = calculateEffectiveVolume(days);
    const deficits = MUSCLES.map(muscle => ({
      muscle,
      deficit: (volumePlan[muscle]?.target || 0) - (effective[muscle] || 0),
      priority: state.priorities.includes(muscle)
    })).filter(item => item.deficit > 0.45)
      .sort((a, b) => Number(b.priority) - Number(a.priority) || b.deficit - a.deficit);
    if (!deficits.length) break;
    let changed = false;
    for (const item of deficits) {
      if (addStimulusStep(days, item.muscle, pool, preferred, usedCounts, attempt + guard)) {
        changed = true;
        break;
      }
    }
    if (!changed) break;
  }
}

function addStimulusStep(days, muscle, pool, preferred, usedCounts, seed) {
  const eligible = days
    .map((day, index) => ({ day, index, direct: dayDirectSets(day, muscle), minutes: estimateMinutes(day.exercises, state.supersets) }))
    .filter(slot => slot.day.muscles.includes(muscle) && slot.direct < maxDirectSetsPerMuscleSession(muscle))
    .sort((a, b) => a.direct - b.direct || a.minutes - b.minutes || a.index - b.index);

  for (const slot of eligible) {
    const day = slot.day;
    const existing = day.exercises.filter(item => normalizedItemMuscle(item) === muscle).sort((a, b) => a.sets - b.sets)[0];
    if (existing && existing.sets < 3) {
      if (canFitSet(day, existing)) {
        existing.sets += 1;
        return true;
      }
    }

    if (day.exercises.length < sessionExerciseRange().max && (!existing || existing.sets >= 3)) {
      const candidate = chooseExercise(day, [muscle], pool, preferred, usedCounts, seed + slot.index, { preferVariety: true });
      if (candidate) {
        const item = makeExercise(candidate, 2, false);
        if (canFitAddition(day, item)) {
          day.exercises.push(item);
          usedCounts.set(candidate.id, (usedCounts.get(candidate.id) || 0) + 1);
          return true;
        }
      }
    }

    if (existing && existing.sets < 4 && canFitSet(day, existing)) {
      existing.sets += 1;
      return true;
    }

    if (!existing && day.exercises.length < sessionExerciseRange().max) {
      const candidate = chooseExercise(day, [muscle], pool, preferred, usedCounts, seed + slot.index + 17, {});
      if (!candidate) continue;
      const item = makeExercise(candidate, 2, false);
      if (!canFitAddition(day, item)) continue;
      day.exercises.push(item);
      usedCounts.set(candidate.id, (usedCounts.get(candidate.id) || 0) + 1);
      return true;
    }
  }
  return false;
}

function maxDirectSetsPerMuscleSession(muscle) {
  if (muscle === "Core") return 6;
  return state.priorities.includes(muscle) ? 9 : 8;
}

function trimExcessVolume(days, volumePlan) {
  let guard = 120;
  while (guard-- > 0) {
    const effective = calculateEffectiveVolume(days);
    const excessive = MUSCLES.map(muscle => {
      const cap = state.goal === "muscle" ? Math.min(20, (volumePlan[muscle]?.target || 0) + 3) : (volumePlan[muscle]?.target || 0) + 3;
      return { muscle, excess: (effective[muscle] || 0) - cap };
    }).filter(item => item.excess > 0.45).sort((a, b) => b.excess - a.excess)[0];
    if (!excessive) break;
    const candidates = [];
    days.forEach(day => day.exercises.forEach(item => {
      if (normalizedItemMuscle(item) === excessive.muscle && !item._structural && item.sets > 2) candidates.push({ day, item });
    }));
    candidates.sort((a, b) => Number(state.priorities.includes(a.item.muscleGroup)) - Number(state.priorities.includes(b.item.muscleGroup)) || b.item.sets - a.item.sets);
    if (!candidates.length) break;
    candidates[0].item.sets -= 1;
  }
}

function fitSessionTime(day, volumePlan) {
  let guard = 80;
  while (estimateMinutes(day.exercises, state.supersets) > state.duration * 1.08 && guard-- > 0) {
    const reducible = day.exercises
      .filter(item => item.sets > 2)
      .sort((a, b) => Number(state.priorities.includes(normalizedItemMuscle(a))) - Number(state.priorities.includes(normalizedItemMuscle(b))) || Number(a._structural) - Number(b._structural) || Number(isCompound(a)) - Number(isCompound(b)));
    if (reducible.length) {
      reducible[0].sets -= 1;
      continue;
    }
    if (day.exercises.length <= sessionExerciseRange().min) break;
    const removable = day.exercises
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item._structural && !state.priorities.includes(normalizedItemMuscle(item)))
      .sort((a, b) => (volumePlan[normalizedItemMuscle(b.item)]?.target || 0) - (volumePlan[normalizedItemMuscle(a.item)]?.target || 0));
    if (!removable.length) break;
    day.exercises.splice(removable[0].index, 1);
  }
}

function repairCoverage(days, pool, preferred, usedCounts, attempt) {
  days.forEach((day, dayIndex) => {
    const requirements = requirementsForDay(day.name, dayIndex);
    requirements.forEach((requirement, requirementIndex) => {
      if (requirementSatisfied(day, requirement)) return;
      if (day.exercises.length < sessionExerciseRange().max) {
        addExerciseForRequirement(day, requirement, pool, preferred, usedCounts, dayIndex + attempt + requirementIndex + 31, true);
        return;
      }
      const replaceIndex = day.exercises.findIndex(item => !item._structural && !state.priorities.includes(normalizedItemMuscle(item)));
      if (replaceIndex < 0) return;
      const candidate = chooseExercise({ ...day, exercises: day.exercises.filter((_, index) => index !== replaceIndex) }, requirement.muscles, pool, preferred, usedCounts, dayIndex + attempt + requirementIndex + 41, { patterns: requirement.patterns, preferCompound: requirement.preferCompound });
      if (!candidate) return;
      day.exercises.splice(replaceIndex, 1, makeExercise(candidate, 2, true));
    });
  });
}

function requirementSatisfied(day, requirement) {
  const matchingMuscleItems = day.exercises.filter(item => requirement.muscles.includes(normalizedItemMuscle(item)));
  if (!matchingMuscleItems.length) return false;
  if (!requirement.patterns?.length) return true;
  if (matchingMuscleItems.some(item => requirement.patterns.includes(movementPattern(exerciseMap().get(item.id))))) return true;
  const patternAvailable = availableExercises().some(exercise => requirement.muscles.includes(normalizedDisplayMuscle(exercise.muscleGroup)) && requirement.patterns.includes(movementPattern(exercise)));
  return !patternAvailable;
}

function chooseExercise(day, muscles, pool, preferred, usedCounts, seed, options = {}) {
  const dayIds = new Set(day.exercises.map(item => item.id));
  let candidates = pool.filter(exercise => muscles.includes(normalizedDisplayMuscle(exercise.muscleGroup)) && !dayIds.has(exercise.id));
  if (!candidates.length) return null;
  if (options.patterns?.length) {
    const matching = candidates.filter(exercise => options.patterns.includes(movementPattern(exercise)));
    if (matching.length) candidates = matching;
  }
  const existingPatterns = new Set(day.exercises.map(item => movementPattern(exerciseMap().get(item.id))));
  return [...candidates].sort((a, b) => scoreExercise(b, preferred, usedCounts, existingPatterns, seed, options) - scoreExercise(a, preferred, usedCounts, existingPatterns, seed, options))[0] || null;
}

function scoreExercise(exercise, preferred, usedCounts, existingPatterns, seed, options) {
  const muscle = normalizedDisplayMuscle(exercise.muscleGroup);
  const pattern = movementPattern(exercise);
  let score = exercise.type === "compound" ? 12 : 9;
  if (options.preferCompound && exercise.type === "compound") score += 18;
  if (preferred.has(exercise.id)) score += 100;
  if (state.priorities.includes(muscle)) score += 16;
  score -= (usedCounts.get(exercise.id) || 0) * 7;
  if (options.preferVariety && existingPatterns.has(pattern)) score -= 14;
  if (state.experience === "beginner") {
    if (/machine|cable/i.test(exercise.equipment || "")) score += 6;
    if (BEGINNER_COMPLEX.test(exercise.name || "")) score -= 12;
  }
  if (state.experience === "advanced" && exercise.type === "compound" && /barbell/i.test(exercise.equipment || "")) score += 3;
  if (muscle === "Core" && state.priorities.includes("Core")) {
    if (/cable crunch|hanging knee raise|ab wheel/i.test(exercise.name || "")) score += 18;
    if (/plank|bird dog|dead bug/i.test(exercise.name || "")) score -= 4;
  }
  score += deterministicNoise(exercise.id, seed + state.variation);
  return score;
}

function makeExercise(def, sets, structural) {
  return {
    id: def.id,
    name: def.name,
    sets: Math.max(2, sets),
    reps: repRangeFor(def),
    muscleGroup: normalizedDisplayMuscle(def.muscleGroup),
    _structural: Boolean(structural)
  };
}

function availableExercises() {
  const excluded = new Set(state.excludedIds);
  return getAllExercises().filter(exercise => {
    const muscle = normalizedDisplayMuscle(exercise.muscleGroup);
    return exercise.trackingType !== "notes" && MUSCLES.includes(muscle) && !excluded.has(exercise.id) && equipmentAllowed(exercise);
  });
}

function equipmentAllowed(exercise) {
  if (state.equipment.includes("Full Gym")) return true;
  const equipment = String(exercise.equipment || "").toLowerCase();
  return state.equipment.some(selection => {
    const value = selection.toLowerCase();
    if (value === "dumbbells") return equipment.includes("dumbbell");
    if (value === "machines & cables") return equipment.includes("machine") || equipment.includes("cable");
    if (value === "bodyweight") return equipment.includes("bodyweight") || equipment.includes("body weight") || equipment.includes("weighted bodyweight");
    return equipment === value || equipment.includes(value.replace(/s$/, ""));
  });
}

function normalizedMuscle(value) {
  const muscle = String(value || "").trim().toLowerCase();
  if (muscle === "rear delts") return "shoulders";
  if (muscle === "lats") return "back";
  if (["abs", "abdominals", "abs / core"].includes(muscle)) return "core";
  return muscle;
}

function normalizedDisplayMuscle(value) {
  const normalized = normalizedMuscle(value);
  return MUSCLES.find(muscle => muscle.toLowerCase() === normalized) || value;
}

function normalizedItemMuscle(item) {
  return normalizedDisplayMuscle(exerciseMap().get(item.id)?.muscleGroup || item.muscleGroup);
}

function displayMuscle(muscle) {
  return muscle === "Core" ? "Abs / Core" : muscle;
}

function movementPattern(exercise) {
  if (!exercise) return "other";
  const name = String(exercise.name || "").toLowerCase();
  const sourceMuscle = String(exercise.muscleGroup || "");
  const muscle = normalizedDisplayMuscle(sourceMuscle);
  if (sourceMuscle.toLowerCase() === "rear delts" || /face pull|rear.?delt|reverse pec/i.test(name)) return "rear-delt";
  if (muscle === "Chest") return /fly|pec deck/.test(name) ? "chest-isolation" : "chest-press";
  if (muscle === "Back") {
    if (/pull.?up|chin.?up|pulldown|pull-over|pullover|straight-arm/.test(name)) return "back-vertical";
    if (/row/.test(name)) return "back-horizontal";
    return "back-horizontal";
  }
  if (muscle === "Shoulders") return /press|pike/.test(name) ? "shoulder-press" : "shoulder-isolation";
  if (muscle === "Biceps") return "biceps";
  if (muscle === "Triceps") return "triceps";
  if (muscle === "Quads") return exercise.type === "compound" ? "knee-compound" : "knee-isolation";
  if (muscle === "Hamstrings") return exercise.type === "compound" ? "hinge" : "ham-isolation";
  if (muscle === "Glutes") return exercise.type === "compound" ? "glute-compound" : "glute-isolation";
  if (muscle === "Calves") return "calves";
  if (muscle === "Core") {
    if (/crunch/.test(name)) return "core-flexion";
    if (/knee raise|leg raise/.test(name)) return "core-raise";
    if (/ab wheel|rollout/.test(name)) return "core-rollout";
    return "core-stability";
  }
  return "other";
}

function repRangeFor(def) {
  if (def.trackingType === "duration") return def.recommendedReps || "20-60 sec";
  if (state.goal === "strength" && def.type === "compound") return "4-8";
  if (state.goal === "hybrid" && def.type === "compound") return "5-10";
  return def.recommendedReps || (def.type === "compound" ? "6-12" : "10-15");
}

function sortExercises(items) {
  return [...items].sort((a, b) => exerciseOrderScore(b) - exerciseOrderScore(a));
}

function exerciseOrderScore(item) {
  const def = exerciseMap().get(item.id);
  let score = 0;
  if (state.priorities.includes(normalizedItemMuscle(item))) score += 40;
  if (item._structural) score += 20;
  if (def?.type === "compound") score += 12;
  return score;
}

function calculateEffectiveVolume(days) {
  const totals = Object.fromEntries(MUSCLES.map(muscle => [muscle, 0]));
  days.forEach(day => day.exercises.forEach(item => {
    const def = exerciseMap().get(item.id);
    const primary = normalizedDisplayMuscle(def?.muscleGroup || item.muscleGroup);
    if (totals[primary] != null) totals[primary] += Number(item.sets) || 0;
    secondaryMuscles(def).forEach(muscle => {
      if (totals[muscle] != null) totals[muscle] += (Number(item.sets) || 0) * 0.5;
    });
  }));
  Object.keys(totals).forEach(muscle => { totals[muscle] = Math.round(totals[muscle] * 10) / 10; });
  return totals;
}

function calculateDirectVolume(days) {
  const totals = Object.fromEntries(MUSCLES.map(muscle => [muscle, 0]));
  days.forEach(day => day.exercises.forEach(item => {
    const muscle = normalizedItemMuscle(item);
    if (totals[muscle] != null) totals[muscle] += Number(item.sets) || 0;
  }));
  return totals;
}

function calculateExposureCounts(days) {
  const totals = Object.fromEntries(MUSCLES.map(muscle => [muscle, 0]));
  days.forEach(day => {
    const seen = new Set(day.exercises.map(normalizedItemMuscle));
    seen.forEach(muscle => { if (totals[muscle] != null) totals[muscle] += 1; });
  });
  return totals;
}

function secondaryMuscles(exercise) {
  if (!exercise || exercise.type !== "compound") return [];
  const muscle = normalizedDisplayMuscle(exercise.muscleGroup);
  if (muscle === "Chest") return ["Triceps", "Shoulders"];
  if (muscle === "Back") return ["Biceps"];
  if (muscle === "Shoulders") return ["Triceps"];
  if (muscle === "Quads") return ["Glutes"];
  if (muscle === "Hamstrings") return ["Glutes"];
  return [];
}

function dayDirectSets(day, muscle) {
  return day.exercises.filter(item => normalizedItemMuscle(item) === muscle).reduce((sum, item) => sum + (Number(item.sets) || 0), 0);
}

function directExposureCount(days, muscle) {
  return days.filter(day => day.exercises.some(item => normalizedItemMuscle(item) === muscle)).length;
}

function muscleCounts(day) {
  return day.exercises.reduce((counts, item) => {
    const muscle = normalizedItemMuscle(item);
    counts[muscle] = (counts[muscle] || 0) + 1;
    return counts;
  }, {});
}

function canFitAddition(day, item) {
  if (day.exercises.length >= sessionExerciseRange().max) return false;
  return estimateMinutes([...day.exercises, item], state.supersets) <= state.duration * 1.08;
}

function canFitSet(day, item) {
  const cloned = day.exercises.map(entry => entry === item ? { ...entry, sets: entry.sets + 1 } : entry);
  return estimateMinutes(cloned, state.supersets) <= state.duration * 1.08;
}

function estimateMinutes(items, withSupersets) {
  let total = 5;
  let accessoryTime = 0;
  items.forEach(item => {
    const def = exerciseMap().get(item.id);
    const perSet = isProtectedCompound(def) ? 3.15 : def?.type === "compound" ? 2.45 : normalizedDisplayMuscle(def?.muscleGroup) === "Core" ? 1.5 : 1.7;
    const time = (Number(item.sets) || 0) * perSet;
    total += time;
    if (!isProtectedCompound(def) && def?.type !== "compound") accessoryTime += time;
  });
  if (withSupersets) total -= accessoryTime * 0.22;
  return total;
}

function assignSupersets(day) {
  let number = 1;
  day.exercises.forEach(item => delete item.supersetGroup);
  for (let index = 0; index < day.exercises.length - 1; index += 1) {
    const first = day.exercises[index];
    const second = day.exercises[index + 1];
    if (first.supersetGroup || second.supersetGroup) continue;
    const a = exerciseMap().get(first.id);
    const b = exerciseMap().get(second.id);
    if (!canSuperset(a, b)) continue;
    const group = `S${number++}`;
    first.supersetGroup = group;
    second.supersetGroup = group;
    index += 1;
  }
}

function canSuperset(a, b) {
  if (!a || !b || isProtectedCompound(a) || isProtectedCompound(b)) return false;
  const firstMuscle = normalizedDisplayMuscle(a.muscleGroup);
  const secondMuscle = normalizedDisplayMuscle(b.muscleGroup);
  if (firstMuscle === secondMuscle || INTERFERENCE.has(`${firstMuscle}|${secondMuscle}`)) return false;
  return a.type === "isolation" || b.type === "isolation";
}

function isProtectedCompound(def) {
  if (!def) return false;
  const muscle = normalizedDisplayMuscle(def.muscleGroup);
  const lowerMajor = ["Quads", "Hamstrings", "Glutes"].includes(muscle) && def.type === "compound";
  return lowerMajor || NEVER_SUPERSET.some(pattern => pattern.test(def.name || ""));
}

function isCompound(item) {
  return exerciseMap().get(item.id)?.type === "compound";
}

function validateProgram(days, volumePlan, effective, exposures) {
  const problems = [];
  const range = sessionExerciseRange();
  days.forEach((day, dayIndex) => {
    if (day.exercises.length < range.min) problems.push(`${day.name} has only ${day.exercises.length} exercises`);
    const ids = day.exercises.map(item => item.id);
    if (new Set(ids).size !== ids.length) problems.push(`${day.name} contains a duplicate exercise`);
    const requirements = requirementsForDay(day.name, dayIndex);
    if (requirements.some(requirement => !requirementSatisfied(day, requirement))) problems.push(`${day.name} is missing intended movement coverage`);
    if (estimateMinutes(day.exercises, state.supersets) > state.duration * 1.12) problems.push(`${day.name} exceeds the selected session length`);
    day.exercises.forEach(item => {
      const def = exerciseMap().get(item.id);
      if (!def || state.excludedIds.includes(item.id) || !equipmentAllowed(def)) problems.push(`${day.name} contains an unavailable or avoided exercise`);
    });
    const patternCounts = day.exercises.reduce((counts, item) => {
      const pattern = movementPattern(exerciseMap().get(item.id));
      counts[pattern] = (counts[pattern] || 0) + 1;
      return counts;
    }, {});
    if (Object.values(patternCounts).some(count => count > 2)) problems.push(`${day.name} has excessive same-pattern overlap`);
  });

  MUSCLES.forEach(muscle => {
    const actual = Number(effective[muscle] || 0);
    const floor = Number(volumePlan[muscle]?.floor || 0);
    const target = Number(volumePlan[muscle]?.target || 0);
    if (floor > 0 && actual + 0.01 < floor) problems.push(`${displayMuscle(muscle)} is below its time-adjusted weekly volume floor`);
    const cap = state.goal === "muscle" ? Math.min(20, target + 4) : target + 4;
    if (actual > cap + 0.5) problems.push(`${displayMuscle(muscle)} has excessive overlapping volume`);
  });

  state.priorities.forEach(muscle => {
    if ((exposures[muscle] || 0) < desiredDirectFrequency(muscle)) problems.push(`${displayMuscle(muscle)} priority does not have enough direct weekly exposures`);
    const actual = Number(effective[muscle] || 0);
    const nonPriorityTargets = MUSCLES.filter(value => !state.priorities.includes(value) && value !== "Core").map(value => volumePlan[value]?.target || 0);
    const comparison = nonPriorityTargets.length ? Math.max(...nonPriorityTargets) : 0;
    if (muscle !== "Core" && actual + 0.5 < Math.min(volumePlan[muscle].target, comparison)) problems.push(`${displayMuscle(muscle)} priority is not receiving meaningful emphasis`);
  });

  const unique = [...new Set(problems)];
  return {
    passed: unique.length === 0,
    problems: unique,
    message: unique.length ? `${unique.slice(0, 3).join("; ")}. Adjust equipment, restrictions, frequency or session length and regenerate.` : "Program passed structure, volume, priority, equipment and duration checks."
  };
}

function replaceExercise(dayIndex, exerciseIndex) {
  const day = state.generated?.days?.[dayIndex];
  const item = day?.exercises?.[exerciseIndex];
  if (!day || !item) return;
  const pool = availableExercises();
  const muscle = normalizedItemMuscle(item);
  const candidate = chooseExercise({ ...day, exercises: day.exercises.filter((_, index) => index !== exerciseIndex) }, [muscle], pool, new Set(state.preferredIds), new Map(), dayIndex + exerciseIndex + state.variation + 13, { preferVariety: true });
  if (!candidate) return;
  day.exercises[exerciseIndex] = { ...item, id: candidate.id, name: candidate.name, reps: repRangeFor(candidate), muscleGroup: muscle };
  refreshGeneratedMetrics();
}

function adjustSets(dayIndex, exerciseIndex, delta) {
  const item = state.generated?.days?.[dayIndex]?.exercises?.[exerciseIndex];
  if (!item) return;
  item.sets = clamp(item.sets + delta, 2, 4);
  refreshGeneratedMetrics();
}

function refreshGeneratedMetrics() {
  if (!state.generated) return;
  state.generated.days.forEach(day => {
    day.exercises = sortExercises(day.exercises);
    if (state.supersets) assignSupersets(day);
  });
  state.generated.effective = calculateEffectiveVolume(state.generated.days);
  state.generated.direct = calculateDirectVolume(state.generated.days);
  state.generated.exposures = calculateExposureCounts(state.generated.days);
  state.generated.validation = validateProgram(state.generated.days, state.generated.volumePlan, state.generated.effective, state.generated.exposures);
  state.generated.summary = buildSummary(state.generated.days, state.generated.validation);
}

function buildSummary(days, validation) {
  const totalSets = days.reduce((sum, day) => sum + day.exercises.reduce((daySum, item) => daySum + (Number(item.sets) || 0), 0), 0);
  const counts = days.map(day => day.exercises.length);
  const priority = state.priorities.length ? ` Priority: ${state.priorities.map(displayMuscle).join(", ")}.` : "";
  const status = validation.passed ? " Validated for coverage, volume and session time." : " Some constraints could not be fully satisfied.";
  return `${totalSets} working sets across ${days.length} days; ${Math.min(...counts)}–${Math.max(...counts)} exercises per session.${priority}${status}`;
}

function saveGeneratedPlan(root) {
  if (!state.generated?.validation?.passed) return;
  const plans = readPlans();
  const plan = {
    id: `smart-${Date.now()}`,
    name: `Smart Build — ${GOALS[state.goal].label}`,
    days: state.generated.days.map(day => ({
      name: day.name,
      exercises: day.exercises.map(item => {
        const output = { id: item.id, sets: item.sets, reps: item.reps };
        if (item.supersetGroup) output.supersetGroup = item.supersetGroup;
        return output;
      })
    })),
    smartBuild: {
      version: 9,
      engine: "unified",
      goal: state.goal,
      days: state.days,
      duration: state.duration,
      priorities: [...state.priorities],
      experience: state.experience,
      equipment: [...state.equipment],
      supersets: state.supersets,
      createdAt: new Date().toISOString()
    }
  };
  plans.push(plan);
  localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plans));
  const button = root.querySelector("[data-smart-save]");
  if (button) {
    button.disabled = true;
    button.textContent = "Saved ✓";
  }
  window.setTimeout(() => document.querySelector('.nav-btn[data-page="workout"]')?.click(), 150);
}

function readPlans() {
  try {
    const value = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function exerciseMap() {
  return new Map(getAllExercises().map(exercise => [exercise.id, exercise]));
}

function deterministicNoise(text, seed) {
  let hash = 2166136261 ^ Number(seed || 0);
  for (const character of String(text || "")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash % 17);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
}
