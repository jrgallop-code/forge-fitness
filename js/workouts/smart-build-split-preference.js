import { getTrainingPreferences, saveTrainingPreferences } from "../core/training-preferences.js?v=onboarding-1";

const ALLOWED = new Set(["auto", "full-body", "upper-lower"]);
const LABELS = {
  auto: "Auto",
  "full-body": "Full Body",
  "upper-lower": "Upper / Lower"
};
const DETAILS = {
  auto: "Level Up chooses the split from your weekly frequency while keeping the same programming rules.",
  "full-body": "Train upper and lower body in every session.",
  "upper-lower": "Alternate upper- and lower-body emphasis; odd weekly frequencies use one Full Body bridge day."
};

let selected = readPreference();
let observerQueued = false;

function readPreference() {
  const value = getTrainingPreferences?.()?.splitPreference;
  return ALLOWED.has(value) ? value : "auto";
}

function persistPreference(value = selected) {
  if (!ALLOWED.has(value)) return;
  try { saveTrainingPreferences({ splitPreference: value }); }
  catch (error) { console.warn("Could not save split preference", error); }
}

function selectPreference(value, { persist = true } = {}) {
  if (!ALLOWED.has(value)) return;
  selected = value;
  if (persist) persistPreference(value);
  updateSelectedButtons(document);
}

function splitOptions(buttonClass) {
  return Object.entries(LABELS).map(([value, label]) => `
    <button class="${buttonClass} compact-split-option ${selected === value ? "selected" : ""}" type="button" data-split="${value}">
      <strong>${label}</strong>
    </button>`).join("");
}

function splitDetailMarkup(helperClass) {
  return `<p class="${helperClass} split-selected-copy" data-split-copy><strong>${LABELS[selected]}:</strong> ${DETAILS[selected]}</p>`;
}

function enhanceSmartBuilder(root = document) {
  const host = root.querySelector?.("[data-smart-step]") || (root.matches?.("[data-smart-step]") ? root : null);
  if (!host) return;

  const isSchedule = Boolean(host.querySelector("[data-days]") && host.querySelector("[data-duration]"));
  host.classList.toggle("smart-schedule-compact", isSchedule);
  if (!isSchedule || host.querySelector("[data-split-preference-block]")) return;

  const actions = host.querySelector(".smart-question-actions");
  if (!actions) return;
  const block = document.createElement("div");
  block.className = "smart-split-preference";
  block.dataset.splitPreferenceBlock = "smart";
  block.innerHTML = `
    <strong class="smart-field-label">Preferred workout split</strong>
    <div class="compact-split-row">${splitOptions("smart-option")}</div>
    ${splitDetailMarkup("smart-helper")}
  `;
  actions.insertAdjacentElement("beforebegin", block);
}

function enhanceOnboarding(root = document) {
  const overlay = root.matches?.(".levelup-onboarding") ? root : root.querySelector?.(".levelup-onboarding");
  if (!overlay) return;

  const availability = overlay.querySelector("[data-days]")?.closest(".onboarding-screen");
  if (availability && availability.querySelector("[data-duration]")) {
    availability.classList.add("onboarding-schedule-compact");
    if (!availability.querySelector("[data-split-preference-block]")) {
      const block = document.createElement("div");
      block.className = "onboarding-split-preference";
      block.dataset.splitPreferenceBlock = "onboarding";
      block.innerHTML = `
        <h3>Preferred workout split</h3>
        <div class="compact-split-row">${splitOptions("onboarding-option")}</div>
        ${splitDetailMarkup("onboarding-helper")}
      `;
      availability.appendChild(block);
    }
  }

  const summary = overlay.querySelector(".onboarding-completion .onboarding-summary");
  if (summary && !summary.querySelector("[data-split-summary]")) {
    const row = document.createElement("div");
    row.dataset.splitSummary = "true";
    row.innerHTML = `<span>Workout split</span><strong>${LABELS[selected]}</strong>`;
    const trainingRow = [...summary.children].find(node => node.querySelector("span")?.textContent?.trim() === "Training");
    if (trainingRow) trainingRow.insertAdjacentElement("afterend", row);
    else summary.appendChild(row);
  }
}

function updateSelectedButtons(root = document) {
  root.querySelectorAll?.("[data-split]").forEach(button => {
    button.classList.toggle("selected", button.dataset.split === selected);
    button.setAttribute("aria-pressed", button.dataset.split === selected ? "true" : "false");
  });
  root.querySelectorAll?.("[data-split-copy]").forEach(node => {
    node.innerHTML = `<strong>${LABELS[selected]}:</strong> ${DETAILS[selected]}`;
  });
  root.querySelectorAll?.("[data-split-summary] strong").forEach(node => { node.textContent = LABELS[selected]; });
}

function enhanceAll(root = document) {
  enhanceSmartBuilder(root);
  enhanceOnboarding(root);
  updateSelectedButtons(root);
}

document.addEventListener("click", event => {
  const button = event.target.closest?.("button");
  if (!button) return;

  if (button.dataset.split) {
    selectPreference(button.dataset.split, { persist: !button.closest(".levelup-onboarding") });
    return;
  }

  if (button.matches("[data-onboarding-next]") && button.closest(".levelup-onboarding")?.querySelector('[data-choice-group="limitations"]')) {
    persistPreference();
    return;
  }

  if (button.matches("[data-onboarding-skip]")) {
    requestAnimationFrame(() => {
      selected = readPreference();
      updateSelectedButtons(document);
    });
    return;
  }

  if (button.matches("[data-smart-build]")) {
    selected = readPreference();
    requestAnimationFrame(() => enhanceAll(document));
  }
}, true);

window.addEventListener("levelup:training-preferences-updated", event => {
  const value = event.detail?.splitPreference;
  if (ALLOWED.has(value)) {
    selected = value;
    updateSelectedButtons(document);
  }
});

const style = document.createElement("style");
style.textContent = `
  .smart-schedule-compact .smart-question-card { padding: 14px; }
  .smart-schedule-compact .smart-question-card > p { margin-bottom: 10px; }
  .smart-schedule-compact .smart-question-body { gap: 5px; }
  .smart-schedule-compact .smart-field-label { margin-top: 2px; }
  .smart-schedule-compact .smart-question-body .smart-chip-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 5px;
    width: 100%;
  }
  .smart-schedule-compact .smart-question-body .smart-chip {
    min-width: 0;
    padding: 9px 3px;
    font-size: .78rem;
    white-space: nowrap;
  }
  .smart-split-preference { margin-top: 10px; }
  .compact-split-row {
    display: grid;
    grid-template-columns: .78fr 1fr 1.18fr;
    gap: 6px;
    margin-top: 7px;
  }
  .compact-split-option {
    min-width: 0;
    min-height: 44px;
    padding: 9px 6px !important;
    display: grid !important;
    place-items: center;
    text-align: center !important;
  }
  .compact-split-option strong {
    font-size: .78rem;
    line-height: 1.15;
    white-space: normal;
  }
  .split-selected-copy {
    margin: 7px 2px 0 !important;
    line-height: 1.35;
  }
  .split-selected-copy strong { color: #d7d7dc; }
  .smart-schedule-compact .smart-question-actions { margin-top: 12px; }

  .onboarding-split-preference { margin-top: 15px; }
  .onboarding-split-preference h3 { margin-bottom: 6px; }
  .onboarding-schedule-compact .onboarding-number-row,
  .onboarding-schedule-compact .onboarding-duration-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 5px;
  }
  .onboarding-schedule-compact .onboarding-number-row .onboarding-chip,
  .onboarding-schedule-compact .onboarding-duration-grid .onboarding-chip {
    min-width: 0;
    padding-left: 4px;
    padding-right: 4px;
    font-size: .78rem;
    white-space: nowrap;
  }
  .onboarding-split-preference .compact-split-row { margin-top: 6px; }

  @media (max-width: 360px) {
    .smart-schedule-compact .smart-question-body .smart-chip,
    .onboarding-schedule-compact .onboarding-number-row .onboarding-chip,
    .onboarding-schedule-compact .onboarding-duration-grid .onboarding-chip { font-size: .72rem; }
    .compact-split-option strong { font-size: .72rem; }
  }
`;
document.head.appendChild(style);

const observer = new MutationObserver(() => {
  if (observerQueued) return;
  observerQueued = true;
  requestAnimationFrame(() => {
    observerQueued = false;
    enhanceAll(document);
  });
});
observer.observe(document.documentElement, { childList: true, subtree: true });
enhanceAll(document);
