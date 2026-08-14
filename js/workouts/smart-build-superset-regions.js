import { getAllExercises } from "./exercise-library.js?v=exercise-library-catalogue-2";

const PLAN_STORAGE_KEY = "forge_workout_plans";
const UPPER = new Set(["Chest", "Back", "Shoulders", "Biceps", "Triceps"]);
const LOWER = new Set(["Quads", "Hamstrings", "Glutes", "Calves"]);
let syncQueued = false;

function normalizeMuscle(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "rear delts") return "Shoulders";
  if (text === "lats") return "Back";
  if (text === "abs" || text === "abs / core" || text === "core") return "Core";
  const known = [...UPPER, ...LOWER, "Core"];
  return known.find(muscle => muscle.toLowerCase() === text) || value;
}

function bodyRegion(muscle) {
  const normalized = normalizeMuscle(muscle);
  if (UPPER.has(normalized)) return "upper";
  if (LOWER.has(normalized)) return "lower";
  if (normalized === "Core") return "core";
  return "unknown";
}

function sameRegion(a, b) {
  const first = bodyRegion(a);
  const second = bodyRegion(b);
  return first !== "unknown" && first === second;
}

function muscleFromReviewRow(row) {
  const detail = row.querySelector("span")?.textContent || "";
  const parts = detail.split("·").map(part => part.trim()).filter(Boolean);
  return normalizeMuscle(parts[parts.length - 1] || "");
}

function enforceReviewSupersets() {
  const review = document.querySelector("[data-smart-step] .smart-review");
  if (!review) return;

  review.querySelectorAll(".smart-review-day").forEach(day => {
    const groups = new Map();
    day.querySelectorAll("p.is-superset").forEach(row => {
      const badge = row.querySelector("em");
      const group = badge?.textContent?.trim();
      if (!group) return;
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(row);
    });

    groups.forEach(rows => {
      if (rows.length !== 2) {
        rows.forEach(clearReviewSuperset);
        return;
      }
      const [first, second] = rows;
      if (!sameRegion(muscleFromReviewRow(first), muscleFromReviewRow(second))) {
        clearReviewSuperset(first);
        clearReviewSuperset(second);
      }
    });
  });
}

function clearReviewSuperset(row) {
  row.classList.remove("is-superset");
  row.querySelector("em")?.remove();
}

function exerciseMuscleMap() {
  return new Map(getAllExercises().map(exercise => [exercise.id, normalizeMuscle(exercise.muscleGroup)]));
}

function sanitizePlan(plan, muscleMap) {
  if (!plan?.smartBuild?.unifiedEngine || !Array.isArray(plan.days)) return false;
  let changed = false;

  plan.days.forEach(day => {
    if (!Array.isArray(day.exercises)) return;
    const groups = new Map();
    day.exercises.forEach(exercise => {
      if (!exercise?.supersetGroup) return;
      if (!groups.has(exercise.supersetGroup)) groups.set(exercise.supersetGroup, []);
      groups.get(exercise.supersetGroup).push(exercise);
    });

    groups.forEach(exercises => {
      const validPair = exercises.length === 2
        && sameRegion(muscleMap.get(exercises[0].id), muscleMap.get(exercises[1].id));
      if (validPair) return;
      exercises.forEach(exercise => {
        if (exercise.supersetGroup) {
          delete exercise.supersetGroup;
          changed = true;
        }
      });
    });
  });

  return changed;
}

function sanitizeSavedSmartPlans() {
  let plans;
  try {
    plans = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || "[]");
  } catch {
    return;
  }
  if (!Array.isArray(plans) || !plans.length) return;

  const muscleMap = exerciseMuscleMap();
  let changed = false;
  plans.forEach(plan => {
    if (sanitizePlan(plan, muscleMap)) changed = true;
  });
  if (changed) localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plans));
}

function syncSupersetCopy() {
  const toggle = document.querySelector("[data-smart-step] .smart-superset-toggle");
  const small = toggle?.querySelector("small");
  if (!small) return;
  const copy = "Accessory-focused. Supersets stay within the same body region; high-fatigue compounds stay standalone.";
  if (small.textContent !== copy) small.textContent = copy;
}

function queueSync() {
  if (syncQueued) return;
  syncQueued = true;
  requestAnimationFrame(() => {
    syncQueued = false;
    enforceReviewSupersets();
    syncSupersetCopy();
  });
}

// This listener is intentionally registered before the unified engine's save handler.
// The engine saves synchronously; the queued microtask then removes any legacy/cross-region
// superset markers from the saved Smart Build plan before the user can launch it.
document.addEventListener("click", event => {
  const button = event.target?.closest?.("button");
  if (button?.matches?.("[data-smart-save]")) {
    queueMicrotask(sanitizeSavedSmartPlans);
  }
}, true);

const observer = new MutationObserver(queueSync);
observer.observe(document.documentElement, { childList: true, subtree: true });

sanitizeSavedSmartPlans();
queueSync();
