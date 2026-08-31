import { getAnatomyConfig } from "../core/anatomy-profile.js?v=female-anatomy-2";

if (typeof document !== "undefined" && !document.querySelector('link[data-exercise-browser-styles]')) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "css/exercise-browser.css?v=static-anatomy-assets-1";
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
  }).join("")}<button class="exercise-muscle-card exercise-custom-card" type="button" data-exercise-browser-custom><span class="exercise-custom-icon" aria-hidden="true">+</span><span>Custom</span></button></div>`;
}

export function renderCustomExerciseFields() {
  return `<div class="exercise-browser-custom-fields">
    <label>Exercise Name<input name="custom-name" type="text" maxlength="80" placeholder="Example: Landmine Row"></label>
    <label>Primary Muscle<select name="custom-muscle"><option>Chest</option><option>Back</option><option>Shoulders</option><option>Rear Delts</option><option>Biceps</option><option>Triceps</option><option>Quads</option><option>Hamstrings</option><option>Glutes</option><option>Calves</option><option>Core</option><option>Other</option></select></label>
    <label>Equipment<select name="custom-equipment"><option>Barbell</option><option>Dumbbells</option><option>Cable</option><option>Machine</option><option>Bodyweight</option><option>Other</option></select></label>
    <label>Exercise Type<select name="custom-type"><option value="compound">Compound</option><option value="isolation">Isolation</option></select></label>
    <label>Recommended Reps<input name="custom-reps" type="text" maxlength="20" value="8-12"></label>
    <label>Default Sets<input name="custom-sets" type="number" inputmode="numeric" min="1" max="20" value="3"></label>
  </div>`;
}

function renderMuscleFigure(item) {
  const config = getAnatomyConfig(item.facing);
  const label = item.id ? `${item.label} highlighted on ${config.sex} anatomy` : `${config.sex} anatomy`;
  const slug = (item.id || "All").toLowerCase().replaceAll(" ", "-");
  return `<img class="exercise-muscle-figure" src="assets/exercise-anatomy/${config.sex}-${slug}.svg?v=static-anatomy-assets-1" alt="${escapeHtml(label)}" width="38" height="58">`;
}

export function matchesExerciseBrowser(exercise, { muscle = "", query = "", equipment = "" } = {}) {
  const term = String(query).trim().toLowerCase();
  return (!muscle || exercise?.muscleGroup === muscle) &&
    (!equipment || exercise?.equipment === equipment) &&
    (!term || [exercise?.name, exercise?.muscleGroup, exercise?.equipment]
      .filter(Boolean).some(value => String(value).toLowerCase().includes(term)));
}
