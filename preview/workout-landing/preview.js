import { renderWorkoutBuilder } from "../../js/workouts/workout-ui.js?v=proven-template-builder-1";
import { initializeWorkoutBuilder } from "../../js/workouts/workouts.js?v=cardio-rpe-1";
import { initializeOneOffWorkout } from "../../js/workouts/one-off-workout.js?v=cardio-rpe-1";
import { initializeWorkoutCatalogue } from "../../js/workouts/workout-catalogue.js?v=proven-template-builder-1";
import { initializeSmartBuild } from "../../js/workouts/smart-build.js?v=hide-adapted-source-1";
import { initializeSmartBuildSupersetGuard } from "../../js/workouts/smart-build-superset-guard.js?v=superset-clean-1";
import { initializeRoutineImporter } from "../../js/workouts/routine-importer.js?v=launcher-grid-hotfix-1";
import { initializeWorkoutSchedule } from "../../js/workouts/workout-schedule.js?v=onboarding-training-days-1";
import { getTrainingPreferences } from "../../js/core/training-preferences.js?v=onboarding-training-days-1";
import { getAllExercises } from "../../js/workouts/exercise-library.js?v=exercise-library-catalogue-2";
import { presetPlans } from "../../js/workouts/workout-plans.js?v=proven-template-builder-1";
import { celebrityWorkoutPlans } from "../../js/workouts/celebrity-workout-plans.js?v=celebrity-plans-2-women-heroes";
import { bodybuilderWorkoutPlans } from "../../js/workouts/bodybuilder-workout-plans.js?v=bodybuilder-library-3";
import { celebrityExpansionPlans } from "../../js/workouts/celebrity-expansion-plans.js?v=celebrity-expansion-2";
import "../../js/workouts/workout-plan-details.js?v=hide-adapted-source-1";

const content = document.getElementById("content");
if (!content) throw new Error("Workout preview root is missing.");

const PLAN_KEY = "forge_workout_plans";
const allCataloguePlans = [...presetPlans, ...celebrityWorkoutPlans, ...bodybuilderWorkoutPlans, ...celebrityExpansionPlans]
  .filter((plan, index, plans) => plans.findIndex(candidate => candidate.id === plan.id) === index);
const exerciseMap = new Map(getAllExercises().map(exercise => [exercise.id, exercise]));

// Commercial-use preview photography. Each source page is marked free under the Unsplash License.
const STOCK_IMAGES = [
  "https://images.unsplash.com/photo-1745329532593-53a9ec306787?auto=format&fit=crop&w=1200&q=78",
  "https://images.unsplash.com/photo-1772450014094-8ecd08c5a589?auto=format&fit=crop&w=1200&q=78",
  "https://images.unsplash.com/photo-1704223523204-504405c9331a?auto=format&fit=crop&w=1200&q=78",
  "https://images.unsplash.com/photo-1770026137145-e792e19b9060?auto=format&fit=crop&w=1200&q=78",
  "https://images.unsplash.com/photo-1745329532589-4f33352c4b10?auto=format&fit=crop&w=1200&q=78",
  "https://images.unsplash.com/photo-1741478551825-e7e5c77a2247?auto=format&fit=crop&w=1200&q=78"
];

const prefs = safePreferences();
const filters = {
  goal: normalizeGoal(prefs.primaryGoal),
  days: Number(prefs.days) || 4,
  level: normalizeLevel(prefs.experience),
  equipment: "Gym"
};
let showAllRoutines = false;

content.innerHTML = renderWorkoutBuilder();
safeInitialize("Workout builder", initializeWorkoutBuilder);
safeInitialize("Smart Build", () => initializeSmartBuild(content));
safeInitialize("Routine importer", () => initializeRoutineImporter(content));
safeInitialize("Smart Build superset guard", () => initializeSmartBuildSupersetGuard(content));
safeInitialize("One-off workout", initializeOneOffWorkout);
safeInitialize("Workout schedule", () => initializeWorkoutSchedule(content));
safeInitialize("Workout catalogue", () => initializeWorkoutCatalogue(content));

const page = content.querySelector(".workout-page");
const sourceHome = page?.querySelector("[data-workout-home]");
if (!page || !sourceHome) throw new Error("Workout preview source UI is missing.");
page.classList.add("workout-landing-preview");
sourceHome.classList.add("prototype-source-home");
page.querySelector(".workout-page-title")?.setAttribute("hidden", "");

const landing = document.createElement("section");
landing.className = "prototype-workout-landing";
landing.dataset.previewLanding = "";
page.insertBefore(landing, sourceHome);
renderLanding();
bindGlobalPreviewActions();

function renderLanding() {
  const matches = filteredPlans();
  const recommended = selectRecommended(matches, 5);
  const saved = readSavedPlans();
  const sourceRows = [
    ...saved.map(plan => ({ ...plan, isSavedPlan: true })),
    ...(showAllRoutines ? allCataloguePlans : matches)
  ];
  const uniqueRows = sourceRows.filter((plan, index, plans) =>
    plans.findIndex(candidate => String(candidate.id) === String(plan.id)) === index
  );
  const rows = showAllRoutines ? uniqueRows : uniqueRows.slice(0, 14);

  landing.innerHTML = `
    <header class="prototype-hero">
      <div>
        <span class="prototype-kicker">TRAINING</span>
        <h1>Workout Plans</h1>
        <p>Structured programs. Real progress.</p>
      </div>
      <button class="prototype-new-plan" type="button" data-preview-new-plan>+ New Plan</button>
    </header>

    <div class="prototype-filter-strip" aria-label="Program filters">
      ${filterButton("goal", "Goal", filters.goal, targetIcon())}
      ${filterButton("days", "Days / week", `${filters.days} days`, calendarIcon())}
      ${filterButton("level", "Level", filters.level, barsIcon())}
      ${filterButton("equipment", "Equipment", filters.equipment, dumbbellOutlineIcon())}
    </div>

    <section class="prototype-section">
      <div class="prototype-section-heading">
        <div><h2>Recommended for You</h2><p>Based on the selections above.</p></div>
        <button type="button" data-preview-see-all>See All</button>
      </div>
      <div class="prototype-recommended" aria-label="Recommended workout plans">
        ${recommended.map((plan, index) => renderRecommendedCard(plan, index)).join("") || renderNoMatches()}
      </div>
    </section>

    <section class="prototype-section" data-preview-all-plans>
      <div class="prototype-section-heading">
        <div>
          <h2>${showAllRoutines ? "All Workout Routines" : "All Workout Plans"}</h2>
          <p>${showAllRoutines
            ? `${allCataloguePlans.length} Level Up routines${saved.length ? ` · ${saved.length} saved plan${saved.length === 1 ? "" : "s"} shown first` : ""}`
            : `${saved.length ? `${saved.length} saved plan${saved.length === 1 ? "" : "s"} shown first · ` : ""}${matches.length} matching programs`
          }</p>
        </div>
        ${showAllRoutines
          ? '<button type="button" data-preview-show-matches>Show Matches</button>'
          : '<button type="button" data-preview-filter="goal">Filter</button>'
        }
      </div>
      <div class="prototype-plan-list">
        ${rows.map((plan, index) => renderPlanRow(plan, index)).join("") || renderNoMatches()}
      </div>
    </section>

    <p class="prototype-stock-note">Preview photography uses free commercial-use imagery under the Unsplash License.</p>
  `;

  bindLandingActions();
}

function renderRecommendedCard(plan, index) {
  const stats = planStats(plan);
  const badge = index === 0 ? "BEST MATCH" : index === 1 ? "POPULAR" : index === 2 ? "TRENDING" : "FOR YOU";
  return `<article class="prototype-program-card" data-preview-plan-card="${escapeHtml(plan.id)}" tabindex="0" role="button" aria-label="Open ${escapeHtml(plan.name)}">
    <img src="${imageForPlan(plan, index)}" alt="" loading="lazy">
    <div class="prototype-program-shade"></div>
    <span class="prototype-program-badge">${badge}</span>
    <div class="prototype-program-copy">
      <h3>${escapeHtml(plan.name)}</h3>
      <p>${escapeHtml(shortDescription(plan.description))}</p>
      <div class="prototype-program-meta">
        <span>${calendarIcon()} ${stats.days} days/week</span>
        <span>${barsIcon()} ${escapeHtml(shortLevel(plan.level))}</span>
      </div>
    </div>
  </article>`;
}

function renderPlanRow(plan, index) {
  const stats = planStats(plan);
  const isSaved = Boolean(plan.isSavedPlan);
  const next = plan.days?.[0]?.name?.replace(/^Day\s*\d+\s*[-–:]?\s*/i, "") || "Workout A";
  return `<article class="prototype-plan-row">
    <button class="prototype-row-main" type="button" data-preview-${isSaved ? "saved" : "catalogue"}-plan="${escapeHtml(plan.id)}">
      <img src="${imageForPlan(plan, index + 2)}" alt="" loading="lazy">
      <span class="prototype-row-copy">
        <small>${isSaved ? "YOUR PLAN" : escapeHtml(plan.sourceLabel || "LEVEL UP")}</small>
        <strong>${escapeHtml(plan.name || "Workout Plan")}</strong>
        <em>${escapeHtml(shortDescription(plan.description || "Your saved workout plan."))}</em>
        <span class="prototype-row-meta">
          <b>${calendarIcon()} ${stats.days}d/wk</b>
          <b>${dumbbellOutlineIcon()} ${stats.exercises} exercises</b>
          <b>${documentIcon()} Next: ${escapeHtml(next)}</b>
        </span>
      </span>
    </button>
    <button class="prototype-row-action" type="button" data-preview-${isSaved ? "saved" : "catalogue"}-plan="${escapeHtml(plan.id)}">${isSaved ? "Open" : "View"}</button>
  </article>`;
}

function filterButton(key, label, value, icon) {
  return `<button class="prototype-filter" type="button" data-preview-filter="${key}">
    <span class="prototype-filter-icon">${icon}</span>
    <span><small>${label}</small><strong>${escapeHtml(value)}</strong></span>
    <i>⌄</i>
  </button>`;
}

function bindLandingActions() {
  landing.querySelector("[data-preview-new-plan]")?.addEventListener("click", openNewPlanSheet);
  landing.querySelector("[data-preview-see-all]")?.addEventListener("click", showAllRoutinesOnLanding);
  landing.querySelector("[data-preview-show-matches]")?.addEventListener("click", () => {
    showAllRoutines = false;
    renderLanding();
    requestAnimationFrame(() => landing.querySelector("[data-preview-all-plans]")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  });
  landing.querySelectorAll("[data-preview-filter]").forEach(button => button.addEventListener("click", () => openFilterSheet(button.dataset.previewFilter)));
  landing.querySelectorAll("[data-preview-plan-card]").forEach(card => {
    const open = () => openCataloguePlan(card.dataset.previewPlanCard);
    card.addEventListener("click", open);
    card.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
  });
  landing.querySelectorAll("[data-preview-catalogue-plan]").forEach(button => button.addEventListener("click", () => openCataloguePlan(button.dataset.previewCataloguePlan)));
  landing.querySelectorAll("[data-preview-saved-plan]").forEach(button => button.addEventListener("click", () => openSavedPlan(button.dataset.previewSavedPlan)));
}

function showAllRoutinesOnLanding() {
  showAllRoutines = true;
  closeSheet();
  landing.hidden = false;
  renderLanding();
  requestAnimationFrame(() => landing.querySelector("[data-preview-all-plans]")?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function openFilterSheet(key) {
  const options = {
    goal: ["Hypertrophy", "Hybrid", "Cardio", "Any goal"],
    days: [2, 3, 4, 5, 6],
    level: ["Beginner", "Intermediate", "Advanced", "Any level"],
    equipment: ["Gym", "Dumbbells", "Barbell", "Machines & Cables", "Bodyweight"]
  }[key] || [];
  const current = filters[key];
  openSheet({
    eyebrow: "PROGRAM FILTER",
    title: ({ goal: "Training goal", days: "Days per week", level: "Experience level", equipment: "Equipment" })[key],
    body: `<div class="prototype-sheet-options">${options.map(option => {
      const value = String(option);
      const selected = value === String(current);
      return `<button type="button" data-filter-value="${escapeHtml(value)}" class="${selected ? "selected" : ""}"><span>${escapeHtml(value)}</span><b>${selected ? "✓" : ""}</b></button>`;
    }).join("")}</div>`,
    onReady(sheet) {
      sheet.querySelectorAll("[data-filter-value]").forEach(button => button.addEventListener("click", () => {
        filters[key] = key === "days" ? Number(button.dataset.filterValue) : button.dataset.filterValue;
        showAllRoutines = false;
        closeSheet();
        renderLanding();
      }));
    }
  });
}

function openNewPlanSheet() {
  openSheet({
    eyebrow: "ADD WORKOUT",
    title: "What do you want to do?",
    body: `<div class="prototype-action-list">
      ${actionRow("smart", "Smart Build", "Personalized around your goals, schedule, equipment, and priorities.", sparkIcon())}
      ${actionRow("manual", "Create Manually", "Build a reusable plan exercise by exercise.", pencilIcon())}
      ${actionRow("import", "Import Routine", "Paste a routine from Notes, Reddit, ChatGPT, or anywhere else.", importIcon())}
      ${actionRow("all-routines", "Browse All Routines", "See every Level Up routine on the main Workout Plans page.", gridIcon())}
    </div>`,
    onReady(sheet) {
      sheet.querySelectorAll("[data-preview-create-action]").forEach(button => button.addEventListener("click", async () => {
        const action = button.dataset.previewCreateAction;
        if (action === "all-routines") {
          showAllRoutinesOnLanding();
          return;
        }
        closeSheet();
        await launchExistingFlow(action);
      }));
    }
  });
}

function actionRow(action, title, copy, icon) {
  return `<button type="button" class="prototype-action-row" data-preview-create-action="${action}">
    <span class="prototype-action-icon">${icon}</span>
    <span><strong>${title}</strong><small>${copy}</small></span><i>›</i>
  </button>`;
}

async function launchExistingFlow(action) {
  const selectors = {
    smart: "[data-smart-build]",
    manual: "#new-plan-btn",
    import: "[data-routine-import-open]"
  };
  const button = await clickWhenReady(selectors[action]);
  if (!button) return showToast("That preview action is still loading. Try again.");
  landing.hidden = true;
  button.click();
  window.setTimeout(() => revealOpenedSurface(), 40);
}

async function clickWhenReady(selector, attempts = 30, delay = 60) {
  if (!selector) return null;
  for (let index = 0; index < attempts; index += 1) {
    const element = content.querySelector(selector);
    if (element) return element;
    await new Promise(resolve => window.setTimeout(resolve, delay));
  }
  return null;
}

function revealOpenedSurface() {
  ["#plan-builder", "[data-smart-build-wizard]", "[data-routine-import-wizard]", ".workout-catalogue-details"].forEach(selector => {
    const element = content.querySelector(selector);
    if (element && !element.hidden) element.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function openCataloguePlan(planId) {
  const card = content.querySelector(`.catalogue-plan-card[data-plan-id="${cssEscape(planId)}"]`);
  if (!card) return showToast("This plan is still loading in the preview.");
  landing.hidden = true;
  card.click();
}

function openSavedPlan(planId) {
  const card = content.querySelector(`[data-custom-plan-id="${cssEscape(planId)}"]`);
  if (!card) return showToast("Open the preview from the same browser as Level Up to use your saved plan.");
  landing.hidden = true;
  card.click();
}

function bindGlobalPreviewActions() {
  content.addEventListener("click", event => {
    if (event.target.closest?.("#close-plan-builder-btn, [data-smart-close], [data-routine-import-close], .plan-detail-back")) {
      window.setTimeout(showLanding, 80);
    }
  }, true);
}

function showLanding() {
  landing.hidden = false;
  sourceHome.classList.add("prototype-source-home");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openSheet({ eyebrow, title, body, onReady }) {
  closeSheet();
  const overlay = document.createElement("div");
  overlay.className = "prototype-sheet-overlay";
  overlay.dataset.previewSheet = "";
  overlay.innerHTML = `<button class="prototype-sheet-scrim" type="button" aria-label="Close"></button><section class="prototype-sheet" role="dialog" aria-modal="true"><div class="prototype-sheet-grabber"></div><div class="prototype-sheet-head"><div><span>${eyebrow}</span><h2>${title}</h2></div><button type="button" data-sheet-close>Done</button></div>${body}</section>`;
  document.body.appendChild(overlay);
  overlay.querySelector(".prototype-sheet-scrim")?.addEventListener("click", closeSheet);
  overlay.querySelector("[data-sheet-close]")?.addEventListener("click", closeSheet);
  onReady?.(overlay.querySelector(".prototype-sheet"));
}

function closeSheet() { document.querySelector("[data-preview-sheet]")?.remove(); }

function filteredPlans() {
  return allCataloguePlans.filter(plan => {
    const type = String(plan.trainingType || "Hypertrophy").toLowerCase();
    const goalMatch = filters.goal === "Any goal"
      || (filters.goal === "Hypertrophy" && type.includes("hypertrophy"))
      || (filters.goal === "Hybrid" && type.includes("hybrid"))
      || (filters.goal === "Cardio" && type.includes("cardio"));
    const daysMatch = !filters.days || Number(plan.daysPerWeek || plan.days?.length) === Number(filters.days);
    const levelText = String(plan.level || "").toLowerCase();
    const levelMatch = filters.level === "Any level" || levelText.includes(String(filters.level).toLowerCase());
    const equipmentMatch = matchesEquipment(plan, filters.equipment);
    return goalMatch && daysMatch && levelMatch && equipmentMatch;
  });
}

function matchesEquipment(plan, equipment) {
  if (!equipment || equipment === "Gym") return true;
  const values = new Set((plan.days || []).flatMap(day => (day.exercises || []).map(item => String(exerciseMap.get(item.id)?.equipment || ""))));
  if (equipment === "Dumbbells") return [...values].every(value => !value || /dumbbell|bodyweight/i.test(value));
  if (equipment === "Barbell") return [...values].some(value => /barbell/i.test(value));
  if (equipment === "Machines & Cables") return [...values].some(value => /machine|cable/i.test(value));
  if (equipment === "Bodyweight") return [...values].every(value => !value || /bodyweight/i.test(value));
  return true;
}

function selectRecommended(plans, count) {
  const preferred = [...plans].sort((a, b) => recommendationScore(b) - recommendationScore(a));
  if (preferred.length >= count) return preferred.slice(0, count);
  const fallback = allCataloguePlans.filter(plan => !preferred.some(item => item.id === plan.id)).slice(0, count - preferred.length);
  return [...preferred, ...fallback];
}

function recommendationScore(plan) {
  let score = 0;
  if (Number(plan.daysPerWeek) === Number(filters.days)) score += 4;
  if (String(plan.level || "").toLowerCase().includes(String(filters.level).toLowerCase())) score += 3;
  if (filters.goal === "Any goal" || String(plan.trainingType || "").toLowerCase().includes(filters.goal.toLowerCase())) score += 3;
  if (matchesEquipment(plan, filters.equipment)) score += 2;
  if (plan.sourceLabel) score += 0.25;
  return score;
}

function planStats(plan) {
  const days = Array.isArray(plan.days) ? plan.days : [];
  return {
    days: Number(plan.daysPerWeek) || days.length || 1,
    exercises: days.reduce((sum, day) => sum + (day.exercises?.length || 0), 0)
  };
}

function imageForPlan(plan, index = 0) {
  const hash = [...String(plan.id || plan.name || index)].reduce((sum, char) => sum + char.charCodeAt(0), index);
  return STOCK_IMAGES[Math.abs(hash) % STOCK_IMAGES.length];
}

function readSavedPlans() {
  try {
    const value = JSON.parse(localStorage.getItem(PLAN_KEY) || "[]");
    return Array.isArray(value) ? value.filter(plan => plan?.id && Array.isArray(plan.days)) : [];
  } catch { return []; }
}

function safePreferences() { try { return getTrainingPreferences() || {}; } catch { return {}; } }
function normalizeGoal(value) { return value === "track_training" ? "Any goal" : value === "build_strength" ? "Hybrid" : "Hypertrophy"; }
function normalizeLevel(value) { return ({ new: "Beginner", intermediate: "Intermediate", experienced: "Intermediate", advanced: "Advanced" })[value] || "Intermediate"; }
function shortLevel(value) { const text = String(value || "All levels"); return text.includes("/") ? text.split("/")[0].trim() : text; }
function shortDescription(value) { const text = String(value || "A structured Level Up training plan.").replace(/\s+/g, " ").trim(); return text.length > 78 ? `${text.slice(0, 75).trim()}…` : text; }
function renderNoMatches() { return `<div class="prototype-empty"><strong>No exact matches</strong><span>Try changing one of the filters above.</span></div>`; }
function showToast(message) { let toast = document.querySelector(".prototype-toast"); if (!toast) { toast = document.createElement("div"); toast.className = "prototype-toast"; document.body.appendChild(toast); } toast.textContent = message; toast.classList.add("show"); window.setTimeout(() => toast?.classList.remove("show"), 2600); }
function cssEscape(value) { return globalThis.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/["\\]/g, "\\$&"); }
function safeInitialize(name, initializer) { try { return initializer(); } catch (error) { console.error(`${name} failed in workout preview:`, error); return undefined; } }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[character])); }

function svg(path){return `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;}
function targetIcon(){return svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v3M20 12h-3"/>');}
function calendarIcon(){return svg('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16"/>');}
function barsIcon(){return svg('<path d="M5 19v-5M12 19V9M19 19V4"/>');}
function dumbbellOutlineIcon(){return svg('<path d="M3 9v6M6 7v10M6 12h12M18 7v10M21 9v6"/>');}
function documentIcon(){return svg('<path d="M7 3h7l4 4v14H7V3Z"/><path d="M14 3v5h5M10 12h5M10 16h5"/>');}
function sparkIcon(){return svg('<path d="m12 3 1.4 4.5L18 9l-4.6 1.5L12 15l-1.4-4.5L6 9l4.6-1.5L12 3Z"/><path d="m19 15 .6 1.8 1.8.6-1.8.6L19 20l-.6-2-1.8-.6 1.8-.6L19 15Z"/>');}
function pencilIcon(){return svg('<path d="m4 20 4-1 11-11-3-3L5 16l-1 4Z"/><path d="m14.5 6.5 3 3"/>');}
function importIcon(){return svg('<path d="M12 3v12M8 7l4-4 4 4M5 13v6h14v-6"/>');}
function playIcon(){return svg('<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/>');}
function gridIcon(){return svg('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>');}
