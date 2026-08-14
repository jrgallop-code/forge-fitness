import { getTrainingPreferences } from "../core/training-preferences.js?v=onboarding-1";

const MUSCLES = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves", "Core"];
const DISPLAY_NAME = { Core: "Abs / Core" };
const PRIORITY_LIMIT = 3;

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
let syncQueued = false;

function freshState() {
  const prefs = getTrainingPreferences?.() || {};
  const goalMap = {
    build_muscle: "muscle",
    build_strength: "strength",
    maintain_muscle: "maintain",
    lose_fat_maintain_muscle: "maintain"
  };
  const experienceMap = {
    new: "beginner",
    intermediate: "intermediate",
    experienced: "advanced",
    advanced: "advanced"
  };
  const priorities = Array.isArray(prefs.priorities)
    ? prefs.priorities.map(normalizeMuscle).filter(muscle => MUSCLES.includes(muscle))
    : [];

  return {
    goal: goalMap[prefs.primaryGoal] || "muscle",
    days: [2, 3, 4, 5, 6].includes(Number(prefs.days)) ? Number(prefs.days) : 4,
    duration: [30, 45, 60, 75, 90].includes(Number(prefs.duration)) ? Number(prefs.duration) : 60,
    experience: experienceMap[prefs.experience] || "intermediate",
    priorities: [...new Set(priorities)].slice(0, PRIORITY_LIMIT)
  };
}

function normalizeMuscle(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "abs" || text === "abs / core" || text === "core") return "Core";
  return MUSCLES.find(muscle => muscle.toLowerCase() === text) || value;
}

function displayMuscle(muscle) {
  return DISPLAY_NAME[muscle] || muscle;
}

function togglePriority(muscle) {
  if (!MUSCLES.includes(muscle)) return;
  if (state.priorities.includes(muscle)) {
    state.priorities = state.priorities.filter(item => item !== muscle);
  } else if (state.priorities.length < PRIORITY_LIMIT) {
    state.priorities.push(muscle);
  }
}

function updateStateFromButton(button) {
  if (button.matches("[data-smart-build]")) {
    Object.assign(state, freshState());
    return;
  }
  if (button.dataset.goal) state.goal = button.dataset.goal;
  if (button.dataset.days) state.days = Number(button.dataset.days);
  if (button.dataset.duration) state.duration = Number(button.dataset.duration);
  if (button.dataset.experience) state.experience = button.dataset.experience;
  if (button.dataset.priority) togglePriority(normalizeMuscle(button.dataset.priority));
}

function interpolateRange([low, high], position) {
  return Math.round(low + (high - low) * position);
}

function getWeeklyTargets() {
  const ranges = VOLUME_RANGES[state.goal]?.[state.experience] || VOLUME_RANGES.muscle.intermediate;
  const frequencyPosition = ({ 2: 0.15, 3: 0.35, 4: 0.55, 5: 0.78, 6: 0.95 })[state.days] ?? 0.55;
  const durationPosition = ({ 30: 0.05, 45: 0.3, 60: 0.55, 75: 0.78, 90: 0.95 })[state.duration] ?? 0.55;
  const position = Math.min(1, Math.max(0, frequencyPosition * 0.6 + durationPosition * 0.4));
  const targets = {};

  MUSCLES.forEach(muscle => {
    if (muscle === "Core") {
      targets[muscle] = interpolateRange(state.priorities.includes(muscle) ? [8, 12] : [4, 8], position);
      return;
    }

    const priority = state.priorities.includes(muscle);
    let range = priority ? ranges.priority : ranges.normal;
    if (!priority && ["Shoulders", "Biceps", "Triceps", "Glutes", "Calves"].includes(muscle)) {
      range = [Math.max(4, range[0] - 2), Math.max(6, range[1] - 2)];
    }
    targets[muscle] = Math.min(20, interpolateRange(range, position));
  });

  return targets;
}

function syncProgrammingPreview() {
  const host = document.querySelector("[data-smart-step]");
  if (!host?.querySelector("[data-supersets]")) return;
  const summary = host.querySelector(".smart-volume-summary");
  if (!summary) return;

  const targets = getWeeklyTargets();
  const signature = MUSCLES.map(muscle => `${muscle}:${targets[muscle]}:${Number(state.priorities.includes(muscle))}`).join("|");
  if (summary.dataset.targetSyncSignature !== signature) {
    summary.dataset.targetSyncSignature = signature;
    summary.innerHTML = MUSCLES.map(muscle => {
      const priority = state.priorities.includes(muscle);
      const coreFlag = muscle === "Core" ? ' data-core-volume="true"' : "";
      return `<div${coreFlag}><span>${displayMuscle(muscle)}${priority ? " ★" : ""}</span><strong>target ~${targets[muscle]} effective sets/wk</strong></div>`;
    }).join("");
  }

  const helper = summary.nextElementSibling;
  if (helper?.classList.contains("smart-helper")) {
    const duration = state.duration === 90 ? "90+" : state.duration;
    const targetExercises = state.duration <= 30 ? 4 : state.duration <= 45 ? 5 : state.duration <= 60 ? 6 : 7;
    const copy = `For ${duration}-minute sessions, Smart Build targets about ${targetExercises} exercises with a 4-exercise floor. Values above are weekly effective-set targets, so compound exercises can contribute partial credit to secondary muscles and direct-set totals may be lower.`;
    if (helper.textContent !== copy) helper.textContent = copy;
  }
}

function parseVolumeRow(row) {
  const text = String(row.textContent || "").replace(/\s+/g, " ").trim();
  const match = text.match(/([0-9]+(?:\.[0-9]+)?)\s+effective.*?target\s+~([0-9]+(?:\.[0-9]+)?)/i);
  if (!match) return null;
  const muscle = MUSCLES.find(item => text.toLowerCase().startsWith(displayMuscle(item).toLowerCase()));
  if (!muscle) return null;
  return {
    muscle,
    effective: Number(match[1]),
    target: Number(match[2]),
    priority: row.classList.contains("priority") || text.toLowerCase().includes("priority")
  };
}

function getUnderTargetRows(review) {
  const grid = review.querySelector(".smart-volume-grid.effective");
  if (!grid) return [];
  return [...grid.children]
    .map(parseVolumeRow)
    .filter(Boolean)
    .filter(item => {
      const minimum = item.priority
        ? Math.max(0, item.target - 1)
        : Math.max(item.target * 0.8, item.target - 2);
      return item.effective + 0.01 < minimum;
    });
}

function syncGeneratedValidation() {
  const review = document.querySelector("[data-smart-step] .smart-review");
  if (!review) return;

  const saveButton = review.querySelector("[data-smart-save]");
  const statusGrid = [...review.querySelectorAll(".smart-volume-grid")].find(grid => !grid.classList.contains("effective"));
  if (!saveButton || !statusGrid) return;

  if (!review.dataset.targetSyncBaseValid) {
    review.dataset.targetSyncBaseValid = String(!saveButton.disabled);
  }
  const baseValid = review.dataset.targetSyncBaseValid === "true";
  const underTarget = getUnderTargetRows(review);
  const signature = underTarget.map(item => `${item.muscle}:${item.effective}/${item.target}`).join("|");

  let note = review.querySelector("[data-smart-target-validation-note]");
  if (underTarget.length) {
    const names = underTarget.map(item => `${displayMuscle(item.muscle)} ${item.effective}/${item.target}`).join(", ");
    const noteText = `Volume check: ${names} effective sets are materially below the selected weekly target. Regenerate or adjust session time/equipment before saving.`;
    if (!note) {
      note = document.createElement("p");
      note.className = "smart-helper";
      note.dataset.smartTargetValidationNote = "true";
      statusGrid.insertAdjacentElement("afterend", note);
    }
    if (note.textContent !== noteText) note.textContent = noteText;

    const firstCard = statusGrid.children[0];
    const secondCard = statusGrid.children[1];
    if (firstCard) {
      const label = firstCard.querySelector("span");
      const value = firstCard.querySelector("strong");
      if (label) label.textContent = "Program validation";
      if (value) value.textContent = "Needs adjustment";
    }
    if (secondCard) {
      const label = secondCard.querySelector("span");
      const value = secondCard.querySelector("strong");
      if (label) label.textContent = "Volume alignment";
      if (value) value.textContent = "Below target";
    }

    saveButton.disabled = true;
    saveButton.dataset.targetSyncBlocked = "true";
    saveButton.textContent = "Adjust Settings";
    review.dataset.targetSyncSignature = signature;
    return;
  }

  note?.remove();
  delete saveButton.dataset.targetSyncBlocked;
  review.dataset.targetSyncSignature = "pass";

  if (baseValid) {
    const firstCard = statusGrid.children[0];
    const secondCard = statusGrid.children[1];
    if (firstCard) {
      const label = firstCard.querySelector("span");
      const value = firstCard.querySelector("strong");
      if (label) label.textContent = "Program validation";
      if (value) value.textContent = "Passed ✓";
    }
    if (secondCard) {
      const label = secondCard.querySelector("span");
      const value = secondCard.querySelector("strong");
      if (label) label.textContent = "Session structure";
      if (value) value.textContent = "4+ exercises protected";
    }
    saveButton.disabled = false;
    saveButton.textContent = "Save Plan";
  }
}

function queueSync() {
  if (syncQueued) return;
  syncQueued = true;
  requestAnimationFrame(() => {
    syncQueued = false;
    syncProgrammingPreview();
    syncGeneratedValidation();
  });
}

document.addEventListener("click", event => {
  const button = event.target?.closest?.("button");
  if (!button) return;
  updateStateFromButton(button);
  if (button.matches("[data-smart-save][data-target-sync-blocked='true']")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  queueSync();
}, true);

document.addEventListener("change", queueSync, true);

const observer = new MutationObserver(queueSync);
observer.observe(document.documentElement, { childList: true, subtree: true });
queueSync();
