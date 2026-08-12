import { getAllExercises } from "./exercise-library.js?v=exercise-library-catalogue-2";

const PLAN_STORAGE_KEY = "forge_workout_plans";
const MUSCLES = ["Chest","Back","Shoulders","Biceps","Triceps","Quads","Hamstrings","Glutes","Calves"];

const GOALS = {
  muscle: { label: "Build Muscle", copy: "Optimize weekly hypertrophy volume and distribute it across the week." },
  strength: { label: "Build Strength", copy: "Prioritize compound practice, lower rep ranges and manageable accessory volume." },
  hybrid: { label: "Strength + Muscle", copy: "Blend strength-focused compounds with enough volume for hypertrophy." },
  maintain: { label: "Maintain", copy: "Use the minimum effective dose needed to maintain muscle and strength." }
};

const SPLITS = {
  2: [
    { name:"Full Body A", muscles:MUSCLES },
    { name:"Full Body B", muscles:MUSCLES }
  ],
  3: [
    { name:"Upper", muscles:["Chest","Back","Shoulders","Biceps","Triceps"] },
    { name:"Lower", muscles:["Quads","Hamstrings","Glutes","Calves"] },
    { name:"Full Body", muscles:MUSCLES }
  ],
  4: [
    { name:"Upper A", muscles:["Chest","Back","Shoulders","Biceps","Triceps"] },
    { name:"Lower A", muscles:["Quads","Hamstrings","Glutes","Calves"] },
    { name:"Upper B", muscles:["Chest","Back","Shoulders","Biceps","Triceps"] },
    { name:"Lower B", muscles:["Quads","Hamstrings","Glutes","Calves"] }
  ],
  5: [
    { name:"Push", muscles:["Chest","Shoulders","Triceps"] },
    { name:"Pull", muscles:["Back","Biceps"] },
    { name:"Legs", muscles:["Quads","Hamstrings","Glutes","Calves"] },
    { name:"Upper", muscles:["Chest","Back","Shoulders","Biceps","Triceps"] },
    { name:"Lower", muscles:["Quads","Hamstrings","Glutes","Calves"] }
  ],
  6: [
    { name:"Push A", muscles:["Chest","Shoulders","Triceps"] },
    { name:"Pull A", muscles:["Back","Biceps"] },
    { name:"Legs A", muscles:["Quads","Hamstrings","Glutes","Calves"] },
    { name:"Push B", muscles:["Chest","Shoulders","Triceps"] },
    { name:"Pull B", muscles:["Back","Biceps"] },
    { name:"Legs B", muscles:["Quads","Hamstrings","Glutes","Calves"] }
  ]
};

const NEVER_SUPERSET = [
  /\bsquat\b/i, /\bdeadlift\b/i, /\brdl\b/i, /\bleg press\b/i, /\bhack squat\b/i,
  /\bbarbell row\b/i, /\bpendlay row\b/i, /\bbench press\b/i,
  /\boverhead press\b/i, /\bmilitary press\b/i
];

const INTERFERENCE = new Set([
  "Chest|Triceps","Chest|Shoulders","Back|Biceps","Shoulders|Triceps",
  "Quads|Glutes","Hamstrings|Glutes","Quads|Hamstrings"
].flatMap(x => [x, x.split("|").reverse().join("|")]));

const state = freshState();

export function initializeSmartBuild(root = document) {
  const home = root.querySelector?.("[data-workout-home]");
  if (!home) return;

  home.querySelector("[data-smart-build-launcher]")?.remove();
  root.querySelector("[data-smart-build-wizard]")?.remove();

  home.insertAdjacentHTML("afterbegin", renderLauncher());
  home.insertAdjacentHTML("afterend", renderWizardShell());

  if (root.dataset.smartBuildCleanBound !== "true") {
    root.dataset.smartBuildCleanBound = "true";
    root.addEventListener("click", event => handleClick(root, event));
    root.addEventListener("change", event => handleChange(root, event));
    root.addEventListener("input", event => handleInput(root, event));
  }
}

function freshState() {
  return {
    step: 0,
    goal: "muscle",
    days: 4,
    duration: 60,
    priorities: [],
    experience: "intermediate",
    equipment: ["Full Gym"],
    preferredIds: [],
    excludedIds: [],
    supersets: true,
    variation: 0,
    generated: null
  };
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
      details.scrollIntoView({ behavior:"smooth", block:"start" });
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
  else if (button.matches("[data-picker-toggle]")) {
    const panel = root.querySelector("[data-picker-panel]");
    if (panel) {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) renderExerciseResults(root, root.querySelector("[data-smart-exercise-search]")?.value || "");
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
  if (event.target.matches?.("[data-smart-exercise-search]")) renderExerciseResults(root, event.target.value);
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
    <div class="smart-build-progress"><span data-smart-progress></span></div>
    <div data-smart-step></div>
  </section>`;
}

function openWizard(root) {
  root.querySelector("[data-workout-home]")?.setAttribute("hidden","");
  const wizard = root.querySelector("[data-smart-build-wizard]");
  if (!wizard) return;
  wizard.hidden = false;
  renderStep(root);
  wizard.scrollIntoView({ behavior:"smooth", block:"start" });
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
  return questionCard("1","Primary goal","What should this program optimize for?", Object.entries(GOALS).map(([value,goal]) => `<button class="smart-option ${state.goal===value?"selected":""}" type="button" data-goal="${value}"><strong>${goal.label}</strong><small>${goal.copy}</small></button>`).join(""), false);
}

function renderScheduleStep() {
  return questionCard("2","Schedule","Choose your weekly frequency and typical session length.", `<strong class="smart-field-label">Days per week</strong>${chipRow([2,3,4,5,6],state.days,"days")}<strong class="smart-field-label">Session length</strong>${chipRow([30,45,60,75,90],state.duration,"duration",v=>v===90?"90+ min":`${v} min`)}`);
}

function renderPriorityExperienceStep() {
  const exp = [
    ["beginner","Beginner — ~0–1 year","Still developing technique and consistent progression."],
    ["intermediate","Intermediate — ~1–3 years","Solid technique and comfortable with progressive overload."],
    ["advanced","Advanced — ~3+ years","Highly experienced; progress requires more precise programming."]
  ];
  return questionCard("3","Priorities & experience","Choose up to 3 muscles to emphasize. Priority muscles receive a larger weekly set target.", `<div class="smart-chip-grid">${MUSCLES.map(m=>`<button type="button" class="smart-chip ${state.priorities.includes(m)?"selected":""}" data-priority="${m}">${m}</button>`).join("")}</div><p class="smart-helper">${state.priorities.length}/3 selected</p><div class="smart-option-stack">${exp.map(([v,l,c])=>`<button class="smart-option ${state.experience===v?"selected":""}" type="button" data-experience="${v}"><strong>${l}</strong><small>${c}</small></button>`).join("")}</div><p class="smart-helper">Years are only a guide. Not sure? Choose Intermediate.</p>`);
}

function renderEquipmentStep() {
  const options = ["Full Gym","Barbell","Dumbbells","Machines","Cables","Bodyweight","Home Gym"];
  return questionCard("4","Equipment & exercise preferences","Tell Smart Build what you can use and anything you prefer or want to avoid.", `<div class="smart-chip-grid">${options.map(x=>`<button type="button" class="smart-chip ${state.equipment.includes(x)?"selected":""}" data-equipment="${x}">${x}</button>`).join("")}</div><div class="smart-picker-block"><button class="smart-picker-toggle" type="button" data-picker-toggle>Choose preferred / avoided exercises ▾</button><div class="smart-picker-panel" data-picker-panel hidden><input type="search" data-smart-exercise-search placeholder="Search exercise, muscle or equipment"><div class="smart-search-results" data-smart-search-results></div></div></div><div class="smart-pref-columns"><div><strong>Preferred</strong><div class="smart-selected-list">${renderSelectedExercises(state.preferredIds,"preferred")}</div></div><div><strong>Avoid / discomfort</strong><div class="smart-selected-list">${renderSelectedExercises(state.excludedIds,"excluded")}</div></div></div>`);
}

function renderProgrammingStep() {
  const targets = getVolumeTargets();
  return questionCard("5","Programming approach","Smart Build will fit these weekly targets into your available time.", `<div class="smart-volume-summary">${MUSCLES.map(m=>`<div><span>${m}${state.priorities.includes(m)?" ★":""}</span><strong>${targets[m]} sets/wk</strong></div>`).join("")}</div><label class="smart-superset-toggle"><input type="checkbox" data-supersets ${state.supersets?"checked":""}><span><strong>Allow time-saving supersets</strong><small>Accessory-focused. Squats, deadlifts, leg press, bench press, heavy rows and overhead press stay standalone.</small></span></label><p class="smart-helper">Targets are starting prescriptions, not biological maximums. Higher growth priorities receive more weekly volume; if time is tight, non-priority work is reduced first.</p>`, true,"Build Program");
}

function renderResultStep() {
  if (!state.generated) return `<p class="smart-helper">Program could not be generated.</p>`;
  const targets = getVolumeTargets();
  const actual = calculateWeeklySets(state.generated);
  return `<div class="smart-question-card"><div class="smart-question-number">✓</div><h4>${escapeHtml(GOALS[state.goal].label)} — ${state.days} days</h4><p>${escapeHtml(state.generated.summary)}</p><div class="smart-volume-summary">${MUSCLES.map(m=>`<div><span>${m}${state.priorities.includes(m)?" ★":""}</span><strong>${actual[m]||0}/${targets[m]} sets</strong></div>`).join("")}</div><div class="smart-review-grid">${state.generated.days.map((day,di)=>`<article class="smart-review-day"><h5>${escapeHtml(day.name)}</h5>${day.exercises.map((item,ei)=>renderExerciseRow(item,di,ei)).join("")}</article>`).join("")}</div><div class="smart-question-actions smart-result-actions"><button class="secondary-btn" type="button" data-smart-edit>Edit Inputs</button><button class="secondary-btn" type="button" data-smart-regenerate>Regenerate</button><button class="primary-btn" type="button" data-smart-save>Save Plan</button></div></div>`;
}

function renderExerciseRow(item, dayIndex, exerciseIndex) {
  const def = exerciseMap().get(item.id);
  const superset = item.supersetGroup ? `<em>Superset ${item.supersetGroup}</em>` : "";
  return `<div class="smart-review-exercise ${item.supersetGroup?"is-superset":""}"><div><strong>${escapeHtml(def?.name || item.name || item.id)}</strong><small>${item.sets} × ${escapeHtml(item.reps)} · ${escapeHtml(def?.muscleGroup || "")}</small>${superset}</div><div class="smart-review-controls"><button type="button" data-adjust-set="-1" data-day-index="${dayIndex}" data-exercise-index="${exerciseIndex}" aria-label="Remove set">−</button><button type="button" data-adjust-set="1" data-day-index="${dayIndex}" data-exercise-index="${exerciseIndex}" aria-label="Add set">+</button><button type="button" data-replace-exercise data-day-index="${dayIndex}" data-exercise-index="${exerciseIndex}">Replace</button></div></div>`;
}

function questionCard(number,title,copy,body,showBack=true,nextLabel="Continue") {
  return `<div class="smart-question-card"><div class="smart-question-number">${number}</div><h4>${title}</h4><p>${copy}</p><div class="smart-question-body">${body}</div><div class="smart-question-actions">${showBack?'<button class="secondary-btn" type="button" data-smart-back>Back</button>':'<span></span>'}<button class="primary-btn" type="button" data-smart-next>${nextLabel}</button></div></div>`;
}

function chipRow(values, selected, key, labeler=String) {
  return `<div class="smart-chip-grid">${values.map(v=>`<button type="button" class="smart-chip ${selected===v?"selected":""}" data-${key}="${v}">${labeler(v)}</button>`).join("")}</div>`;
}

function togglePriority(muscle) {
  if (state.priorities.includes(muscle)) state.priorities = state.priorities.filter(m=>m!==muscle);
  else if (state.priorities.length < 3) state.priorities.push(muscle);
}

function toggleEquipment(value) {
  if (value === "Full Gym") { state.equipment = ["Full Gym"]; return; }
  state.equipment = state.equipment.filter(x=>x!=="Full Gym");
  state.equipment = state.equipment.includes(value) ? state.equipment.filter(x=>x!==value) : [...state.equipment,value];
  if (!state.equipment.length) state.equipment = ["Full Gym"];
}

function chooseExercise(id, mode) {
  if (mode === "prefer") {
    state.excludedIds = state.excludedIds.filter(x=>x!==id);
    if (!state.preferredIds.includes(id)) state.preferredIds.push(id);
  } else {
    state.preferredIds = state.preferredIds.filter(x=>x!==id);
    if (!state.excludedIds.includes(id)) state.excludedIds.push(id);
  }
}

function renderExerciseResults(root, query) {
  const host = root.querySelector("[data-smart-search-results]");
  if (!host) return;
  const term = String(query||"").trim().toLowerCase();
  const results = getAllExercises().filter(e=>e.trackingType!=="notes").filter(e=>!term || [e.name,e.muscleGroup,e.equipment].some(v=>String(v||"").toLowerCase().includes(term))).sort((a,b)=>String(a.muscleGroup).localeCompare(String(b.muscleGroup)) || String(a.name).localeCompare(String(b.name))).slice(0,40);
  host.innerHTML = results.length ? results.map(e=>`<div class="smart-search-row"><div><strong>${escapeHtml(e.name)}</strong><small>${escapeHtml(e.muscleGroup)} · ${escapeHtml(e.equipment)}</small></div><button type="button" data-prefer-id="${escapeHtml(e.id)}">Prefer</button><button type="button" data-exclude-id="${escapeHtml(e.id)}">Avoid</button></div>`).join("") : `<p class="smart-helper">No matching exercises.</p>`;
}

function renderSelectedExercises(ids,type) {
  const map = exerciseMap();
  return ids.length ? ids.map(id=>`<button type="button" class="smart-selected-chip" data-remove-${type}="${escapeHtml(id)}">${escapeHtml(map.get(id)?.name || id)} ×</button>`).join("") : `<small>None selected</small>`;
}

function getVolumeTargets() {
  const exp = { beginner:0, intermediate:1, advanced:2 }[state.experience] ?? 1;
  const base = { muscle:[8,10,12], strength:[5,6,7], hybrid:[7,9,10], maintain:[4,5,6] }[state.goal][exp];
  const priorityBoost = { muscle:[3,4,4], strength:[2,2,3], hybrid:[3,3,4], maintain:[1,1,2] }[state.goal][exp];
  return Object.fromEntries(MUSCLES.map(m=>[m, Math.min(18, base + (state.priorities.includes(m) ? priorityBoost : 0))]));
}

function generateProgram() {
  const targets = getVolumeTargets();
  const days = SPLITS[state.days].map(day=>({ name:day.name, muscles:[...day.muscles], exercises:[] }));
  const usedByMuscle = new Map(MUSCLES.map(m=>[m,[]]));
  const preferred = new Set(state.preferredIds);
  const order = [...MUSCLES].sort((a,b)=>Number(state.priorities.includes(b))-Number(state.priorities.includes(a)) || targets[b]-targets[a]);

  order.forEach(muscle => {
    const eligibleDays = days.map((d,i)=>d.muscles.includes(muscle)?i:-1).filter(i=>i>=0);
    if (!eligibleDays.length) return;
    let remaining = targets[muscle];
    let cursor = state.variation % eligibleDays.length;
    while (remaining > 0) {
      const dayIndex = eligibleDays[cursor % eligibleDays.length];
      const chunk = Math.min(3, remaining);
      const def = chooseExerciseForMuscle(muscle, usedByMuscle.get(muscle), preferred, dayIndex);
      if (!def) break;
      const existing = days[dayIndex].exercises.find(x=>x.id===def.id);
      if (existing) existing.sets += chunk;
      else days[dayIndex].exercises.push({ id:def.id, name:def.name, sets:chunk, reps:repRangeFor(def), muscleGroup:muscle });
      usedByMuscle.get(muscle).push(def.id);
      remaining -= chunk;
      cursor += 1;
    }
  });

  days.forEach(day => {
    day.exercises = sortExercises(day.exercises);
    fitSessionTime(day);
    if (state.supersets) assignSupersets(day);
  });

  return { days, summary:buildSummary(days) };
}

function chooseExerciseForMuscle(muscle, used, preferred, dayIndex) {
  const pool = availableExercises().filter(e=>e.muscleGroup===muscle);
  if (!pool.length) return null;
  return pool.map(e=>{
    let score = 0;
    if (preferred.has(e.id)) score += 100;
    if (!used.includes(e.id)) score += 20;
    if (state.goal==="strength" && e.type==="compound") score += 12;
    if (state.goal==="muscle" && e.type==="isolation") score += 2;
    score += deterministicNoise(e.id, dayIndex + state.variation);
    return {e,score};
  }).sort((a,b)=>b.score-a.score)[0]?.e || null;
}

function availableExercises() {
  const excluded = new Set(state.excludedIds);
  return getAllExercises().filter(e=>e.trackingType!=="notes" && MUSCLES.includes(e.muscleGroup) && !excluded.has(e.id) && equipmentAllowed(e));
}

function equipmentAllowed(exercise) {
  if (state.equipment.includes("Full Gym")) return true;
  const eq = String(exercise.equipment||"").toLowerCase();
  const selected = state.equipment.map(x=>x.toLowerCase());
  if (selected.includes("home gym")) return true;
  return selected.some(x=>{
    if (x==="dumbbells") return eq.includes("dumbbell");
    if (x==="machines") return eq.includes("machine");
    if (x==="cables") return eq.includes("cable");
    return eq.includes(x.replace(/s$/,""));
  });
}

function repRangeFor(def) {
  if (state.goal==="strength" && def.type==="compound") return "4-8";
  if (state.goal==="hybrid" && def.type==="compound") return "5-10";
  return def.recommendedReps || (def.type==="compound" ? "6-12" : "10-15");
}

function sortExercises(items) {
  return [...items].sort((a,b)=>Number(belongsToProtectedCompound(exerciseMap().get(b.id)))-Number(belongsToProtectedCompound(exerciseMap().get(a.id))) || Number(exerciseMap().get(b.id)?.type==="compound")-Number(exerciseMap().get(a.id)?.type==="compound") || Number(state.priorities.includes(b.muscleGroup))-Number(state.priorities.includes(a.muscleGroup)));
}

function fitSessionTime(day) {
  const cap = state.duration;
  let estimate = estimateMinutes(day.exercises, false);
  while (estimate > cap) {
    const candidate = day.exercises.map((x,i)=>({x,i})).filter(({x})=>!state.priorities.includes(x.muscleGroup) && x.sets>1).sort((a,b)=>Number(exerciseMap().get(a.x.id)?.type==="compound")-Number(exerciseMap().get(b.x.id)?.type==="compound"))[0];
    if (!candidate) break;
    candidate.x.sets -= 1;
    estimate = estimateMinutes(day.exercises, state.supersets);
  }
  day.exercises = day.exercises.filter(x=>x.sets>0);
}

function estimateMinutes(items, withSupersets) {
  let total = 5;
  items.forEach(item=>{
    const def = exerciseMap().get(item.id);
    const perSet = belongsToProtectedCompound(def) ? 3.2 : def?.type==="compound" ? 2.5 : 1.7;
    total += item.sets * perSet;
  });
  if (withSupersets) total *= 0.88;
  return total;
}

function assignSupersets(day) {
  let groupNum = 1;
  day.exercises.forEach(item=>delete item.supersetGroup);
  for (let i=0;i<day.exercises.length-1;i++) {
    const a = day.exercises[i], b = day.exercises[i+1];
    if (a.supersetGroup || b.supersetGroup) continue;
    const ad = exerciseMap().get(a.id), bd = exerciseMap().get(b.id);
    if (!canSuperset(ad,bd)) continue;
    const group = `S${groupNum++}`;
    a.supersetGroup = group;
    b.supersetGroup = group;
    i += 1;
  }
}

function canSuperset(a,b) {
  if (!a || !b) return false;
  if (belongsToProtectedCompound(a) || belongsToProtectedCompound(b)) return false;
  if (a.muscleGroup===b.muscleGroup) return false;
  if (INTERFERENCE.has(`${a.muscleGroup}|${b.muscleGroup}`)) return false;
  return a.type==="isolation" || b.type==="isolation";
}

function belongsToProtectedCompound(def) {
  return !!def && NEVER_SUPERSET.some(pattern=>pattern.test(def.name||""));
}

function replaceExercise(dayIndex, exerciseIndex) {
  const item = state.generated?.days?.[dayIndex]?.exercises?.[exerciseIndex];
  if (!item) return;
  const pool = availableExercises().filter(e=>e.muscleGroup===item.muscleGroup && e.id!==item.id);
  if (!pool.length) return;
  const next = pool[(state.variation + exerciseIndex + dayIndex + 1) % pool.length];
  item.id = next.id;
  item.name = next.name;
  item.reps = repRangeFor(next);
  if (state.supersets) assignSupersets(state.generated.days[dayIndex]);
}

function adjustSets(dayIndex, exerciseIndex, delta) {
  const item = state.generated?.days?.[dayIndex]?.exercises?.[exerciseIndex];
  if (!item) return;
  item.sets = Math.max(1, Math.min(6, item.sets + delta));
}

function calculateWeeklySets(program) {
  const totals = Object.fromEntries(MUSCLES.map(m=>[m,0]));
  program.days.forEach(day=>day.exercises.forEach(item=>{ if (totals[item.muscleGroup]!==undefined) totals[item.muscleGroup] += Number(item.sets)||0; }));
  return totals;
}

function buildSummary(days) {
  const totalSets = days.reduce((sum,d)=>sum+d.exercises.reduce((s,e)=>s+e.sets,0),0);
  const priorityText = state.priorities.length ? ` Priority: ${state.priorities.join(", ")}.` : "";
  const supersetText = state.supersets ? " Accessory supersets are used only when pairings are low-interference." : "";
  return `${totalSets} working sets across ${days.length} days.${priorityText}${supersetText}`;
}

function saveGeneratedPlan(root) {
  if (!state.generated) return;
  const plans = readPlans();
  const plan = {
    id:`smart-${Date.now()}`,
    name:`Smart Build — ${GOALS[state.goal].label}`,
    days:state.generated.days.map(day=>({ name:day.name, exercises:day.exercises.map(item=>{ const out={id:item.id,sets:item.sets,reps:item.reps}; if(item.supersetGroup) out.supersetGroup=item.supersetGroup; return out; }) })),
    smartBuild:{ version:4, goal:state.goal, days:state.days, duration:state.duration, priorities:[...state.priorities], experience:state.experience, equipment:[...state.equipment], supersets:state.supersets, createdAt:new Date().toISOString() }
  };
  plans.push(plan);
  localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plans));
  const button = root.querySelector("[data-smart-save]");
  if (button) { button.disabled=true; button.textContent="Saved ✓"; }
  window.setTimeout(()=>document.querySelector('.nav-btn[data-page="workout"]')?.click(),150);
}

function readPlans() {
  try { const value=JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY)||"[]"); return Array.isArray(value)?value:[]; } catch { return []; }
}

function exerciseMap() {
  return new Map(getAllExercises().map(e=>[e.id,e]));
}

function deterministicNoise(text, seed) {
  let h = 2166136261 ^ Number(seed||0);
  for (const ch of String(text||"")) { h ^= ch.charCodeAt(0); h = Math.imul(h,16777619); }
  return Math.abs(h % 17);
}

function escapeHtml(value) {
  return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
