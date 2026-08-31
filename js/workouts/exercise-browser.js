if (typeof document !== "undefined" && !document.querySelector('link[data-exercise-browser-styles]')) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "css/exercise-browser.css?v=visual-muscle-browser-1";
  link.dataset.exerciseBrowserStyles = "";
  document.head.appendChild(link);
}

export const MUSCLE_FILTERS = [
  { id: "", label: "All", facing: "front" },
  { id: "Chest", label: "Chest", facing: "front" },
  { id: "Back", label: "Back", facing: "back" },
  { id: "Shoulders", label: "Shoulders", facing: "front" },
  { id: "Biceps", label: "Biceps", facing: "front" },
  { id: "Triceps", label: "Triceps", facing: "back" },
  { id: "Forearms", label: "Forearms", facing: "front" },
  { id: "Quads", label: "Quadriceps", facing: "front" },
  { id: "Hamstrings", label: "Hamstrings", facing: "back" },
  { id: "Glutes", label: "Glutes", facing: "back" },
  { id: "Calves", label: "Calves", facing: "back" },
  { id: "Core", label: "Abs/Core", facing: "front" },
  { id: "Rear Delts", label: "Rear Delts", facing: "back" }
];

const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

export function renderMuscleCarousel(selected = "", attribute = "data-muscle-filter") {
  return `<div class="exercise-muscle-carousel" role="listbox" aria-label="Filter exercises by muscle">${MUSCLE_FILTERS.map(item => {
    const active = item.id === selected;
    return `<button class="exercise-muscle-card${active ? " selected" : ""}" type="button" role="option" aria-selected="${active}" ${attribute}="${escapeHtml(item.id)}">${renderMuscleFigure(item)}<span>${escapeHtml(item.label)}</span></button>`;
  }).join("")}</div>`;
}

function renderMuscleFigure(item) {
  const config = getAnatomyConfig(item.facing);
  const regionIds = item.id ? (config.regions[item.id] || []) : [];
  const uses = regionIds.map(id => {
    const href = `${config.asset}#${id}`;
    return `<use href="${href}" xlink:href="${href}" class="exercise-muscle-highlight"/>`;
  }).join("");
  const label = item.id ? `${item.label} highlighted on ${config.sex} anatomy` : `${config.sex} anatomy`;
  return `<svg class="exercise-muscle-figure" viewBox="${config.viewBox}" role="img" aria-label="${escapeHtml(label)}" xmlns:xlink="http://www.w3.org/1999/xlink"><image href="${config.asset}" xlink:href="${config.asset}" x="${config.imageX}" y="0" width="960" height="1920" preserveAspectRatio="xMidYMid meet"/>${uses}</svg>`;
}

export function matchesExerciseBrowser(exercise, { muscle = "", query = "", equipment = "" } = {}) {
  const term = String(query).trim().toLowerCase();
  return (!muscle || exercise?.muscleGroup === muscle) &&
    (!equipment || exercise?.equipment === equipment) &&
    (!term || [exercise?.name, exercise?.muscleGroup, exercise?.equipment]
      .filter(Boolean).some(value => String(value).toLowerCase().includes(term)));
}
import { getAnatomyConfig } from "../core/anatomy-profile.js?v=female-anatomy-2";
