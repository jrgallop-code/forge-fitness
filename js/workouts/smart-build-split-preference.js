import { getTrainingPreferences, saveTrainingPreferences } from "../core/training-preferences.js?v=onboarding-1";

const ALLOWED = new Set(["auto", "full-body", "upper-lower"]);
const LABELS = {
  auto: "Choose for me",
  "full-body": "Full Body",
  "upper-lower": "Upper / Lower"
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
  const options = [
    ["auto", "Choose for me", "Level Up selects Full Body or Upper / Lower from your weekly frequency while keeping the same volume and coverage rules."],
    ["full-body", "Full Body", "Train upper and lower body in every session. Smart Build still protects weekly volume, exercise coverage and recovery."],
    ["upper-lower", "Upper / Lower", "Alternate upper- and lower-body emphasis. Odd weekly frequencies use one Full Body bridge day so coverage stays balanced."]
  ];
  return options.map(([value, label, detail]) => `
    <button class="${buttonClass} ${selected === value ? "selected" : ""}" type="button" data-split="${value}">
      <strong>${label}</strong><small>${detail}</small>
    </button>`).join("");
}

function enhanceSmartBuilder(root = document) {
  const host = root.querySelector?.("[data-smart-step]") || (root.matches?.("[data-smart-step]") ? root : null);
  if (!host || host.querySelector("[data-split-preference-block]")) return;
  if (!host.querySelector("[data-days]") || !host.querySelector("[data-duration]")) return;

  const actions = host.querySelector(".smart-question-actions");
  if (!actions) return;
  const block = document.createElement("div");
  block.className = "smart-split-preference";
  block.dataset.splitPreferenceBlock = "smart";
  block.innerHTML = `
    <strong class="smart-field-label">Preferred workout split</strong>
    <p class="smart-helper">Choose the weekly structure. All existing Smart Build volume, priority, exercise-count, duration, equipment, avoidance and superset rules still apply.</p>
    <div class="smart-option-stack">${splitOptions("smart-option")}</div>
  `;
  actions.insertAdjacentElement("beforebegin", block);
}

function enhanceOnboarding(root = document) {
  const overlay = root.matches?.(".levelup-onboarding") ? root : root.querySelector?.(".levelup-onboarding");
  if (!overlay) return;

  const availability = overlay.querySelector("[data-days]")?.closest(".onboarding-screen");
  if (availability && availability.querySelector("[data-duration]") && !availability.querySelector("[data-split-preference-block]")) {
    const block = document.createElement("div");
    block.className = "onboarding-split-preference";
    block.dataset.splitPreferenceBlock = "onboarding";
    block.innerHTML = `
      <h3>Preferred workout split</h3>
      <p class="onboarding-helper">This becomes the default for Smart Build when you finish setup. You can change it whenever you build a program.</p>
      <div class="onboarding-option-stack">${splitOptions("onboarding-option")}</div>
    `;
    availability.appendChild(block);
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
  .smart-split-preference { margin-top: 18px; }
  .smart-split-preference .smart-option-stack { margin-top: 8px; }
  .onboarding-split-preference { margin-top: 22px; }
  .onboarding-split-preference .onboarding-option-stack { margin-top: 10px; }
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
