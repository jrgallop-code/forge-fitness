import { renderFormGuideMuscleSvg } from "./form-guide-anatomy.js?v=female-crops-1";

const VISUAL_MUSCLE = { Abs: "Core", "Abs / Core": "Core" };

export function renderMusclePriorityChoice(muscle, selected) {
  ensureMusclePriorityStyles();
  const label = muscle === "Core" ? "Abs / Core" : muscle;
  const visual = renderFormGuideMuscleSvg(VISUAL_MUSCLE[muscle] || muscle);
  return `<button class="muscle-priority-card ${selected ? "selected" : ""}" type="button" data-priority="${escapeHtml(muscle)}" aria-pressed="${selected}">
    <span class="muscle-priority-visual" aria-hidden="true">${visual}</span>
    <span class="muscle-priority-label">${escapeHtml(label)}</span>
    <span class="muscle-priority-check" aria-hidden="true">✓</span>
  </button>`;
}

function ensureMusclePriorityStyles() {
  if (document.querySelector('link[data-muscle-priority-styles], link[href*="muscle-priority-cards.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "css/muscle-priority-cards.css?v=muscle-priority-cards-2";
  link.dataset.musclePriorityStyles = "true";
  document.head.appendChild(link);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}
