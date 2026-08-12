import { getAllExercises } from "./exercise-library.js?v=exercise-library-catalogue-2";

const PLAN_STORAGE_KEY = "forge_workout_plans";
const MUSCLES = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves"];
const GOALS = {
  muscle: { label: "Build Muscle", copy: "Prioritize hypertrophy volume, exercise quality and recovery." },
  strength: { label: "Build Strength", copy: "Prioritize heavy compound practice with enough accessory work to support it." },
  hybrid: { label: "Strength + Muscle", copy: "Blend strength-focused compounds with hypertrophy-focused volume." },
  maintain: { label: "Maintain Muscle & Strength", copy: "Use a lower training dose while preserving meaningful intensity and practice." }
};

const state = {
  step: 0,
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
  variation: 0,
  generated: null
};

export function initializeSmartBuild(root = document) {
  const home = root.querySelector?.("[data-workout-home]");
  if (!home || home.querySelector("[data-smart-build-launcher]")) return;

  home.insertAdjacentHTML("afterbegin", renderLauncher());
  home.insertAdjacentHTML("afterend", renderWizardShell());

  if (root.dataset.smartBuildV3Bound !== "true") {
    root.dataset.smartBuildV3Bound = "true";
    root.addEventListener("click", event => handleClick(root, event));
    root.addEventListener("change", event => handleChange(root, event));
    root.addEventListener("input", event => handleInput(root, event));
  }

  renderStep(root);
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
    if (state.step === 7) {
      button.disabled = true;
      button.textContent = "Building…";
      requestAnimationFrame(() => {
        try {
          state.generated = generateProgram();
          state.step = 8;
          renderStep(root);
        } catch (error) {
          console.error("Smart Build generation failed:", error);
          button.disabled = false;
          button.textContent = "Generate Program";
        }
      });
    } else {
      state.step += 1;
      renderStep(root);
    }
    return;
  }

  if (button.dataset.goal) {
    state.goal = button.dataset.goal;
    renderStep(root);
    return;
  }

  if (button.dataset.days) {
    state.days = Number(button.dataset.days);
    renderStep(root);
    return;
  }

  if (button.dataset.duration) {
    state.duration = Number(button.dataset.duration);
    renderStep(root);
    return;
  }

  if (button.dataset.priority) {
    togglePriority(root, button.dataset.priority);
    return;
  }

  if (button.dataset.experience) {
    state.experience = button.dataset.experience;
    renderStep(root);
    return;
  }

  if (button.dataset.equipment) {
    toggleEquipment(button.dataset.equipment);
    renderStep(root);
    return;
  }

  if (button.dataset.style) {
    state.style = button.dataset.style;
    renderStep(root);
    return;
  }

  if (button.matches("[data-picker-toggle]")) {
    const panel = root.querySelector("[data-picker-panel]");
    if (panel) {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) renderExerciseResults(root, root.querySelector("[data-smart-exercise-search]")?.value || "");
    }
    return;
  }

  if (button.dataset.preferId) {
    const id = button.dataset.preferId;
    state.excludedIds = state.excludedIds.filter(x => x !== id);
    if (!state.preferredIds.includes(id)) state.preferredIds.push(id);
    renderStep(root);
    reopenPicker(root);
    return;
  }

  if (button.dataset.excludeId) {
    const id = button.dataset.excludeId;
    state.preferredIds = state.preferredIds.filter(x => x !== id);
    if (!state.excludedIds.includes(id)) state.excludedIds.push(id);
    renderStep(root);
    reopenPicker(root);
    return;
  }

  if (button.dataset.removePreferred) {
    state.preferredIds = state.preferredIds.filter(x => x !== button.dataset.removePreferred);
    renderStep(root);
    return;
  }

  if (button.dataset.removeExcluded) {
    state.excludedIds = state.excludedIds.filter(x => x !== button.dataset.removeExcluded);
    renderStep(root);
    return;
  }

  if (button.matches("[data-smart-regenerate-exercises]")) {
    state.variation += 1;
    state.generated = generateProgram({ keepStructure: true });
    renderStep(root);
    return;
  }

  if (button.matches("[data-smart-regenerate-program]")) {
    state.variation += 1;
    state.generated = generateProgram({ alternateSplit: true });
    renderStep(root);
    return;
  }

  if (button.matches("[data-smart-save]")) {
    saveGeneratedPlan(root);
    return;
  }

  if (button.matches("[data-smart-edit]")) {
    state.step = 0;
    renderStep(root);
  }
}

function handleChange(root, event) {
  if (event.target.matches?.("[data-supersets]")) state.supersets = event.target.checked;
}

function handleInput(root, event) {
  if (event.target.matches?.("[data-smart-exercise-search]")) renderExerciseResults(root, event.target.value);
}

function togglePriority(root, muscle) {
  if (state.priorities.includes(muscle)) {
    state.priorities = state.priorities.filter(x => x !== muscle);
  } else if (state.priorities.length < 3) {
    state.priorities = [...state.priorities, muscle];
  }

  root.querySelectorAll("[data-priority]").forEach(button => {
    button.classList.toggle("selected", state.priorities.includes(button.dataset.priority));
  });

  const helper = root.querySelector("[data-priority-count]");
  if (helper) helper.textContent = `${state.priorities.length}/3 selected`;
}

function toggleEquipment(value) {
  if (value === "Full Gym") {
    state.equipment = ["Full Gym"];
    return;
  }
  state.equipment = state.equipment.filter(v => v !== "Full Gym");
  state.equipment = state.equipment.includes(value)
    ? state.equipment.filter(v => v !== value)
    : [...state.equipment, value];
  if (!state.equipment.length) state.equipment = ["Full Gym"];
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
  state.step = 0;
  wizard.hidden = false;
  renderStep(root);
  wizard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeWizard(root) {
  const wizard = root.querySelector("[data-smart-build-wizard]");
  const home = root.querySelector("[data-workout-home]");
  if (wizard) wizard.hidden = true;
  if (home) {
    home.hidden = false;
    home.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderStep(root) {
  const host = root.querySelector("[data-smart-step]");
  const progress = root.querySelector("[data-smart-progress]");
  const heading = root.querySelector("[data-smart-heading]");
  if (!host || !progress) return;

  const steps = [renderGoalStep, renderDaysStep, renderDurationStep, renderPriorityStep, renderExperienceStep, renderEquipmentStep, renderExercisePreferenceStep, renderStyleStep, renderReview];
  progress.style.width = `${Math.min(100, ((state.step + 1) / 8) * 100)}%`;
  if (heading) heading.textContent = `${GOALS[state.goal].label} Program`;
  host.innerHTML = steps[state.step]();
}

function renderGoalStep() {
  return questionCard("1", "Primary goal", "What should this program optimize for?", Object.entries(GOALS).map(([value, goal]) => `<button class="smart-option ${state.goal === value ? "selected" : ""}" type="button" data-goal="${value}"><strong>${goal.label}</strong><small>${goal.copy}</small></button>`).join(""), false);
}

function renderDaysStep() {
  return questionCard("2", "Training days", "How many days per week do you want to train?", chipRow([2,3,4,5,6], state.days, "days"));
}

function renderDurationStep() {
  return questionCard("3", "Session length", "How long should most workouts take?", chipRow([30,45,60,75,90], state.duration, "duration", v => v === 90 ? "90+ min" : `${v} min`));
}

function renderPriorityStep() {
  const verb = state.goal === "maintain" ? "keep especially strong" : state.goal === "strength" ? "prioritize for strength" : "prioritize for growth";
  const chips = MUSCLES.map(m => `<button type="button" class="smart-chip ${state.priorities.includes(m) ? "selected" : ""}" data-priority="${m}">${m}</button>`).join("");
  return questionCard("4", "Muscle priorities", `Choose up to 3 muscles to ${verb}. Priority targets are protected when time is limited.`, `<div class="smart-chip-grid">${chips}</div><p class="smart-helper" data-priority-count>${state.priorities.length}/3 selected</p>`);
}

function renderExperienceStep() {
  const options = [
    ["beginner", "Beginner — ~0–1 year", "Still developing technique and learning consistent progression."],
    ["intermediate", "Intermediate — ~1–3 years", "Solid technique and comfortable with progressive overload."],
    ["advanced", "Advanced — ~3+ years", "Highly experienced; progress is slower and requires more precise programming."]
  ];
  const body = options.map(([v,l,c]) => `<button class="smart-option ${state.experience === v ? "selected" : ""}" type="button" data-experience="${v}"><strong>${l}</strong><small>${c}</small></button>`).join("") + `<p class="smart-helper">Years are only a guide—choose the description that fits you best. Not sure? Choose Intermediate.</p>`;
  return questionCard("5", "What best describes your lifting experience?", "Experience adjusts the starting prescription.", body);
}

function renderEquipmentStep() {
  const options = ["Full Gym", "Barbell", "Dumbbells", "Machines", "Cables", "Bodyweight", "Home Gym"];
  return questionCard("6", "Available equipment", "Select what you can reliably use.", `<div class="smart-chip-grid">${options.map(x => `<button type="button" class="smart-chip ${state.equipment.includes(x) ? "selected" : ""}" data-equipment="${x}">${x}</button>`).join("")}</div>`);
}

function renderExercisePreferenceStep() {
  return questionCard("7", "Exercise preferences / discomfort", "Choose exercises you want included or exercises you want Smart Build to avoid.", `<div class="smart-picker-block"><button class="smart-picker-toggle" type="button" data-picker-toggle>Choose exercises ▾</button><div class="smart-picker-panel" data-picker-panel hidden><input type="search" data-smart-exercise-search placeholder="Search exercise, muscle or equipment"><div class="smart-search-results" data-smart-search-results></div></div></div><div class="smart-pref-columns"><div><strong>Preferred</strong><div class="smart-selected-list">${renderSelectedExercises(state.preferredIds,"preferred")}</div></div><div><strong>Avoid / discomfort</strong><div class="smart-selected-list">${renderSelectedExercises(state.excludedIds,"excluded")}</div></div></div>`);
}

function renderStyleStep() {
  const options = [["no-preference","No equipment preference"],["machines","Prefer machines / cables"],["free-weights","Prefer free weights"]];
  return questionCard("8", "Programming preferences", "One final preference. Smart Build may use non-competing supersets when the session-time target is tight.", `${options.map(([v,l]) => `<button class="smart-option ${state.style === v ? "selected" : ""}" type="button" data-style="${v}"><strong>${l}</strong></button>`).join("")}<label class="smart-superset-toggle"><input type="checkbox" data-supersets ${state.supersets ? "checked" : ""}><span><strong>Allow time-saving supersets</strong><small>Used mainly for non-competing accessory exercises when needed.</small></span></label>`, true, "Generate Program");
}

function questionCard(number, title, copy, body, showBack = true, nextLabel = "Continue") {
  return `<div class="smart-question-card"><div class="smart-question-number">${number}</div><h4>${title}</h4><p>${copy}</p><div class="smart-question-body">${body}</div><div class="smart-question-actions">${showBack ? '<button class="secondary-btn" type="button" data-smart-back>Back</button>' : '<span></span>'}<button class="primary-btn" type="button" data-smart-next>${nextLabel}</button></div></div>`;
}

function chipRow(values, selected, key, labeler = String) {
  return `<div class="smart-chip-grid">${values.map(v => `<button type="button" class="smart-chip ${selected === v ? "selected" : ""}" data-${key}="${v}">${labeler(v)}</button>`).join("")}</div>`;
}

function renderExerciseResults(root, query) {
  const host = root.querySelector("[data-smart-search-results]");
  if (!host) return;
  const term = String(query || "").trim().toLowerCase();
  const results = getAllExercises()
    .filter(e => e.trackingType !== "notes")
    .filter(e => !term || [e.name, e.muscleGroup, e.equipment].some(v => String(v || "").toLowerCase().includes(term)))
    .sort((a,b) => String(a.muscleGroup).localeCompare(String(b.muscleGroup)) || String(a.name).localeCompare(String(b.name)))
    .slice(0, 30);

  host.innerHTML = results.length
    ? results.map(e => `<div class="smart-search-row"><div><strong>${escapeHtml(e.name)}</strong><small>${escapeHtml(e.muscleGroup)} · ${escapeHtml(e.equipment)}</small></div><button type="button" data-prefer-id="${e.id}">Prefer</button><button type="button" data-exclude-id="${e.id}">Avoid</button></div>`).join("")
    : `<p class="smart-helper">No matching exercises.</p>`;
}

function reopenPicker(root) {
  requestAnimationFrame(() => {
    const panel = root.querySelector("[data-picker-panel]");
    if (panel) {
      panel.hidden = false;
      renderExerciseResults(root, "");
    }
  });
}

function renderSelectedExercises(ids, type) {
  const map = new Map(getAllExercises().map(e => [e.id, e]));
  return ids.length
    ? ids.map(id => `<button type="button" class="smart-selected-chip" data-remove-${type}="${id}">${escapeHtml(map.get(id)?.name || id)} ×</button>`).join("")
    : `<small>None selected</small>`;
}

function getVolumeTargets() {
  const expIndex = { beginner: 0, intermediate: 1, advanced: 2 }[state.experience] ?? 1;
  const targets = {};
  MUSCLES.forEach(m => {
    if (state.goal === "maintain") targets[m] = [4,5,6][expIndex];
    else if (state.goal === "strength") targets[m] = [5,6,7][expIndex];
    else if (state.goal === "hybrid") targets[m] = [7,9,10][expIndex];
    else targets[m] = [8,10,12][expIndex];
  });
  state.priorities.forEach(m => {
    if (state.goal === "maintain") targets[m] = [6,7,8][expIndex];
    else if (state.goal === "strength") targets[m] = [7,9,10][expIndex];
    else if (state.goal === "hybrid") targets[m] = [10,13,15][expIndex];
    else targets[m] = [12,14,16][expIndex];
  });
  return fitVolumeToTime(targets);
}

function fitVolumeToTime(targets) {
  const result = { ...targets };
  const capacityPerSession = Math.max(8, Math.round(state.duration / 5));
  const supersetBonus = state.supersets ? Math.round(capacityPerSession * 0.2) : 0;
  const weeklyCapacity = (capacityPerSession + supersetBonus) * state.days;
  let total = sumValues(result);
  const floor = { muscle: 6, hybrid: 6, strength: 4, maintain: 3 }[state.goal] || 6;
  const reductionOrder = MUSCLES.filter(m => !state.priorities.includes(m)).sort((a,b) => result[b] - result[a]);
  let guard = 500;
  while (total > weeklyCapacity && guard-- > 0) {
    let changed = false;
    for (const m of reductionOrder) {
      if (result[m] > floor) {
        result[m] -= 1;
        total -= 1;
        changed = true;
        if (total <= weeklyCapacity) break;
      }
    }
    if (!changed) break;
  }
  if (total > weeklyCapacity) {
    const priorityFloor = state.goal === "muscle" ? 10 : state.goal === "hybrid" ? 8 : state.goal === "strength" ? 6 : 4;
    for (const m of state.priorities) {
      while (total > weeklyCapacity && result[m] > priorityFloor) {
        result[m] -= 1;
        total -= 1;
      }
    }
  }
  return result;
}

function generateProgram(options = {}) {
  const allExercises = getAllExercises();
  const all = allExercises.filter(e => e.trackingType !== "notes" && !state.excludedIds.includes(e.id));
  const exerciseMap = new Map(allExercises.map(e => [e.id, e]));
  const volumes = getVolumeTargets();
  const split = getSplitNames(state.days, options.alternateSplit || false);
  const days = split.map(name => ({ name, exercises: [] }));
  const mapping = assignMusclesToDays(state.days, options.alternateSplit || false);
  const used = new Set();

  Object.entries(volumes).forEach(([muscle, weeklySets]) => {
    const targets = mapping[muscle] || [0];
    let remaining = weeklySets;
    targets.forEach((dayIndex, i) => {
      const left = targets.length - i;
      const sets = Math.max(2, Math.round(remaining / left));
      remaining -= sets;
      addMuscleWork(days[dayIndex], muscle, sets, all, used, options.keepStructure);
    });
  });

  days.forEach(day => {
    day.exercises.sort((a,b) => Number(b._compound) - Number(a._compound));
    day.exercises.forEach(x => delete x._compound);
    applySupersets(day, exerciseMap);
  });

  const effective = calculateEffectiveVolume(days, exerciseMap);
  return {
    name: buildPlanName(),
    days,
    smartBuild: { version: 3, goal: GOALS[state.goal].label, duration: state.duration, experience: state.experience, priorities: [...state.priorities], supersetsAllowed: state.supersets, generatedAt: new Date().toISOString() },
    volumes,
    effective
  };
}

function buildPlanName() {
  const priority = state.priorities.length ? ` — ${state.priorities.join(" + ")} Priority` : "";
  return `${state.days}-Day ${GOALS[state.goal].label} Program${priority}`;
}

function addMuscleWork(day, muscle, totalSets, exercises, used, variationMode) {
  let candidates = exercises.filter(e => normalizedMuscle(e.muscleGroup) === normalizedMuscle(muscle) && equipmentAllowed(e));
  candidates.sort((a,b) => scoreExercise(b, used, variationMode) - scoreExercise(a, used, variationMode));
  if (!candidates.length) return;
  const exerciseCount = totalSets >= 8 ? 3 : totalSets >= 5 ? 2 : 1;
  const picks = candidates.slice(0, Math.min(exerciseCount, candidates.length));
  let remaining = totalSets;
  picks.forEach((e, i) => {
    const left = picks.length - i;
    const sets = Math.max(2, Math.round(remaining / left));
    remaining -= sets;
    day.exercises.push({ id: e.id, sets, reps: getRepTarget(e), _compound: e.type === "compound", primaryMuscle: normalizedDisplayMuscle(e.muscleGroup) });
    used.add(e.id);
  });
}

function getRepTarget(e) {
  if (state.goal === "strength" && e.type === "compound") return "4-6";
  if (state.goal === "hybrid" && e.type === "compound") return "5-8";
  return e.recommendedReps || "8-12";
}

function scoreExercise(e, used, variationMode) {
  let score = e.type === "compound" ? 12 : 8;
  if (state.preferredIds.includes(e.id)) score += 100;
  if (used.has(e.id)) score -= 16;
  if (state.style === "machines" && ["Machine", "Cable"].includes(e.equipment)) score += 10;
  if (state.style === "free-weights" && ["Barbell", "Dumbbells"].includes(e.equipment)) score += 10;
  const seed = (hashString(e.id) + state.variation * 17) % 23;
  if (variationMode || state.variation) score += seed;
  return score;
}

function applySupersets(day, exerciseMap) {
  if (!state.supersets || state.duration >= 75) return;
  const eligible = day.exercises.map((x,i) => ({ x, i })).filter(({x}) => !isHighFatigueCompound(x, exerciseMap));
  let group = 0;
  for (let i = 0; i < eligible.length - 1; i += 2) {
    const a = eligible[i];
    const b = eligible[i + 1];
    if (!canSuperset(a.x, b.x)) continue;
    group += 1;
    a.x.supersetGroup = `S${group}`;
    b.x.supersetGroup = `S${group}`;
  }
}

function isHighFatigueCompound(item, exerciseMap) {
  const e = exerciseMap.get(item.id);
  if (!e || e.type !== "compound") return false;
  const name = String(e.name || "").toLowerCase();
  return ["squat", "deadlift", "romanian deadlift", "rdl", "leg press", "hack squat", "barbell row", "bench press", "overhead press", "military press"].some(term => name.includes(term));
}

function canSuperset(a, b) {
  const ma = a.primaryMuscle;
  const mb = b.primaryMuscle;
  if (ma === mb) return false;
  const competing = [new Set(["Chest","Triceps"]), new Set(["Back","Biceps"]), new Set(["Shoulders","Triceps"]), new Set(["Quads","Glutes"]), new Set(["Hamstrings","Glutes"])];
  return !competing.some(set => set.has(ma) && set.has(mb));
}

function calculateEffectiveVolume(days, exerciseMap) {
  const totals = Object.fromEntries(MUSCLES.map(m => [m, 0]));
  days.forEach(day => day.exercises.forEach(item => {
    const e = exerciseMap.get(item.id);
    if (!e) return;
    const primary = normalizedDisplayMuscle(e.muscleGroup);
    if (totals[primary] != null) totals[primary] += item.sets;
    secondaryMuscles(e).forEach(m => { if (totals[m] != null) totals[m] += item.sets * 0.5; });
  }));
  Object.keys(totals).forEach(m => totals[m] = Math.round(totals[m] * 10) / 10);
  return totals;
}

function secondaryMuscles(e) {
  if (e.type !== "compound") return [];
  const m = normalizedDisplayMuscle(e.muscleGroup);
  if (m === "Chest") return ["Triceps", "Shoulders"];
  if (m === "Back") return ["Biceps"];
  if (m === "Shoulders") return ["Triceps"];
  if (m === "Quads") return ["Glutes"];
  if (m === "Hamstrings") return ["Glutes"];
  return [];
}

function getSplitNames(days, alternate) {
  const primary = { 2:["Full Body A","Full Body B"], 3:["Upper","Lower","Full Body"], 4:["Upper A","Lower A","Upper B","Lower B"], 5:["Upper","Lower","Push","Pull","Legs"], 6:["Push A","Pull A","Legs A","Push B","Pull B","Legs B"] };
  const alt = { 2:["Full Body 1","Full Body 2"], 3:["Full Body A","Full Body B","Full Body C"], 4:["Push","Pull","Lower A","Lower B"], 5:["Push","Pull","Legs","Upper","Lower"], 6:["Upper A","Lower A","Upper B","Lower B","Upper C","Lower C"] };
  return (alternate ? alt : primary)[days] || Array.from({ length: days }, (_,i) => `Day ${i + 1}`);
}

function assignMusclesToDays(days, alternate) {
  if (alternate && days === 3) return Object.fromEntries(MUSCLES.map(m => [m, [0,1,2]]));
  if (alternate && days === 4) return { Chest:[0,2], Back:[1,3], Shoulders:[0,1], Biceps:[1,3], Triceps:[0,2], Quads:[2,3], Hamstrings:[2,3], Glutes:[2,3], Calves:[2,3] };
  if (days === 2) return Object.fromEntries(MUSCLES.map(m => [m, [0,1]]));
  if (days === 3) return { Chest:[0,2], Back:[0,2], Shoulders:[0,2], Biceps:[0,2], Triceps:[0,2], Quads:[1,2], Hamstrings:[1,2], Glutes:[1,2], Calves:[1,2] };
  if (days === 4) return { Chest:[0,2], Back:[0,2], Shoulders:[0,2], Biceps:[0,2], Triceps:[0,2], Quads:[1,3], Hamstrings:[1,3], Glutes:[1,3], Calves:[1,3] };
  if (days === 5) return { Chest:[0,2], Back:[0,3], Shoulders:[0,2], Biceps:[0,3], Triceps:[0,2], Quads:[1,4], Hamstrings:[1,4], Glutes:[1,4], Calves:[1,4] };
  return { Chest:[0,3], Back:[1,4], Shoulders:[0,3], Biceps:[1,4], Triceps:[0,3], Quads:[2,5], Hamstrings:[2,5], Glutes:[2,5], Calves:[2,5] };
}

function renderReview() {
  const p = state.generated;
  if (!p) return `<div class="smart-review"><p>Program could not be generated.</p></div>`;
  const map = new Map(getAllExercises().map(e => [e.id, e]));
  const volumeRows = Object.entries(p.volumes).map(([m,s]) => `<div class="${state.priorities.includes(m) ? "priority" : ""}"><span>${m}${state.priorities.includes(m) ? " · priority" : ""}</span><strong>${s} target sets</strong></div>`).join("");
  const effectiveRows = Object.entries(p.effective).filter(([,s]) => s > 0).map(([m,s]) => `<div><span>${m}</span><strong>${s} effective</strong></div>`).join("");
  const days = p.days.map(day => `<details class="smart-review-day"><summary><strong>${escapeHtml(day.name)}</strong><span>${day.exercises.length} exercises</span></summary><div>${day.exercises.map(item => `<p class="${item.supersetGroup ? "is-superset" : ""}"><strong>${item.supersetGroup ? `<em>${item.supersetGroup}</em> ` : ""}${escapeHtml(map.get(item.id)?.name || item.id)}</strong><span>${item.sets} × ${escapeHtml(item.reps)}</span></p>`).join("")}</div></details>`).join("");
  return `<div class="smart-review"><span class="eyebrow">YOUR PROGRAM</span><h3>${escapeHtml(p.name)}</h3><div class="smart-review-meta"><span>${state.days} days/week</span><span>~${state.duration} min/session</span><span>${capitalize(state.experience)}</span><span>${GOALS[state.goal].label}</span></div><h4>Weekly target sets</h4><p class="smart-helper">Priority muscles are protected first when time is limited.</p><div class="smart-volume-grid">${volumeRows}</div><h4>Estimated effective volume</h4><p class="smart-helper">Compound exercises add fractional credit to commonly involved secondary muscles.</p><div class="smart-volume-grid effective">${effectiveRows}</div><h4>Workout days</h4><div class="smart-review-days">${days}</div><p class="smart-review-note">These are evidence-informed starting targets, not a claim that one exact weekly set number is universally optimal.</p><div class="smart-review-actions"><button class="secondary-btn" type="button" data-smart-edit>Edit Answers</button><button class="secondary-btn" type="button" data-smart-regenerate-exercises>New Exercises</button><button class="secondary-btn" type="button" data-smart-regenerate-program>New Program</button><button class="primary-btn" type="button" data-smart-save>Save Plan</button></div></div>`;
}

function saveGeneratedPlan(root) {
  if (!state.generated) return;
  const saved = getSavedPlans();
  const plan = JSON.parse(JSON.stringify(state.generated));
  delete plan.volumes;
  delete plan.effective;
  plan.id = `plan-${Date.now()}`;
  saved.push(plan);
  localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(saved));
  const button = root.querySelector("[data-smart-save]");
  if (button) {
    button.textContent = "Saved ✓";
    button.disabled = true;
  }
  setTimeout(() => document.querySelector('.nav-btn[data-page="workout"]')?.click(), 250);
}

function getSavedPlans() {
  try {
    const value = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function equipmentAllowed(e) {
  if (state.equipment.includes("Full Gym")) return true;
  const eq = String(e.equipment || "").toLowerCase();
  const selected = state.equipment.map(x => x.toLowerCase());
  if (selected.includes("home gym")) return ["dumbbells", "bodyweight", "barbell"].some(x => eq.includes(x));
  return selected.some(x => eq.includes(x.replace(/s$/, "")) || x.includes(eq.replace(/s$/, "")));
}

function normalizedMuscle(v) {
  const m = String(v || "").toLowerCase();
  if (m === "rear delts") return "shoulders";
  if (m === "lats") return "back";
  return m;
}

function normalizedDisplayMuscle(v) {
  const n = normalizedMuscle(v);
  return MUSCLES.find(m => m.toLowerCase() === n) || v;
}

function sumValues(o) { return Object.values(o).reduce((a,b) => a + Number(b || 0), 0); }
function hashString(v) { return String(v).split("").reduce((h,c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0); }
function capitalize(v) { return String(v || "").charAt(0).toUpperCase() + String(v || "").slice(1); }
function escapeHtml(v) { return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;"); }
