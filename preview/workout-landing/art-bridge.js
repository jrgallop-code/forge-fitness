import { getPlanArtwork } from "./art-manifest.js?v=art-direction-1";
import { presetPlans } from "../../js/workouts/workout-plans.js?v=proven-template-builder-1";
import { celebrityWorkoutPlans } from "../../js/workouts/celebrity-workout-plans.js?v=celebrity-plans-2-women-heroes";
import { bodybuilderWorkoutPlans } from "../../js/workouts/bodybuilder-workout-plans.js?v=bodybuilder-library-3";
import { celebrityExpansionPlans } from "../../js/workouts/celebrity-expansion-plans.js?v=celebrity-expansion-2";

const PLAN_KEY = "forge_workout_plans";
const cataloguePlans = [...presetPlans, ...celebrityWorkoutPlans, ...bodybuilderWorkoutPlans, ...celebrityExpansionPlans];
const planMap = new Map(cataloguePlans.filter(Boolean).map(plan => [String(plan.id), plan]));

const root = document.getElementById("content");
if (root) {
  hydrateSavedPlans();
  applyArtDirection();
  const observer = new MutationObserver(() => applyArtDirection());
  observer.observe(root, { childList: true, subtree: true });
}

function hydrateSavedPlans() {
  try {
    const saved = JSON.parse(localStorage.getItem(PLAN_KEY) || "[]");
    if (!Array.isArray(saved)) return;
    saved.forEach(plan => {
      if (plan?.id) planMap.set(String(plan.id), plan);
    });
  } catch {}
}

function applyArtDirection() {
  root.querySelectorAll(".prototype-program-card").forEach((card, index) => {
    const id = card.dataset.previewPlanCard;
    const plan = resolvePlan(id, card);
    setArtwork(card, card.querySelector("img"), plan, index);
  });

  root.querySelectorAll(".prototype-plan-row").forEach((row, index) => {
    const trigger = row.querySelector("[data-preview-catalogue-plan], [data-preview-saved-plan]");
    const id = trigger?.dataset.previewCataloguePlan || trigger?.dataset.previewSavedPlan || "";
    const plan = resolvePlan(id, row);
    setArtwork(row, row.querySelector("img"), plan, index + 11);
  });
}

function resolvePlan(id, node) {
  if (id && planMap.has(String(id))) return planMap.get(String(id));
  const name = node.querySelector("h3, .prototype-row-copy>strong")?.textContent?.trim() || "Workout Plan";
  const sourceLabel = node.querySelector(".prototype-row-copy>small")?.textContent?.trim() || "";
  return { id: id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, sourceLabel };
}

function setArtwork(container, image, plan, index) {
  if (!image || image.dataset.artDirected === "true") return;
  const artwork = getPlanArtwork(plan, index);
  if (!artwork?.src) return;
  image.src = artwork.src;
  image.dataset.artDirected = "true";
  image.dataset.artFamily = artwork.family;
  container.dataset.artFamily = artwork.family;
  image.referrerPolicy = "no-referrer";
  image.addEventListener("error", () => {
    image.dataset.artDirected = "fallback";
    image.src = "https://images.unsplash.com/photo-1745329532593-53a9ec306787?auto=format&fit=crop&w=1200&q=82";
  }, { once: true });
}
