const PHASES_KEY = "level_up_nutrition_phases";
const WEIGHT_KEY = "forge_weight_entries";
const GOAL_WEIGHT_KEY = "level_up_goal_weight";
const DAY_MS = 86400000;

function readPhases() {
  try {
    const value = JSON.parse(localStorage.getItem(PHASES_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writePhases(phases) {
  localStorage.setItem(PHASES_KEY, JSON.stringify(phases));
}

function activePhaseIndex(phases) {
  for (let index = phases.length - 1; index >= 0; index -= 1) {
    if (phases[index] && !phases[index].endDate && phases[index].goalId) return index;
  }
  return -1;
}

function previousPhaseIndex(phases, activeIndex) {
  for (let index = activeIndex - 1; index >= 0; index -= 1) {
    if (phases[index]?.startDate) return index;
  }
  return -1;
}

function readWeights() {
  try {
    const rows = JSON.parse(localStorage.getItem(WEIGHT_KEY) || "[]");
    if (!Array.isArray(rows)) return [];
    return rows
      .map(row => ({ date: String(row?.date || ""), weight: Number(row?.weight) }))
      .filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.weight) && row.weight > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateMs(value) {
  return new Date(`${value}T12:00:00`).getTime();
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value)) && Number.isFinite(dateMs(value)) && value <= today();
}

function previousDay(value) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function trendWeightAsOf(date) {
  const eligible = readWeights().filter(entry => entry.date <= date);
  if (!eligible.length) return null;
  const latest = eligible.at(-1);
  const cutoff = dateMs(latest.date) - (6 * DAY_MS);
  const recent = eligible.filter(entry => dateMs(entry.date) >= cutoff);
  const value = recent.length
    ? recent.reduce((sum, entry) => sum + entry.weight, 0) / recent.length
    : latest.weight;
  return Math.round(value * 100) / 100;
}

function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value || "--";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function phaseDayNumber(startDate) {
  if (!validDate(startDate)) return null;
  return Math.max(1, Math.floor((dateMs(today()) - dateMs(startDate)) / DAY_MS) + 1);
}

function formatRate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  if (Math.abs(number) < 0.005) return "Maintain";
  return `${number > 0 ? "+" : "−"}${Math.abs(number).toFixed(2).replace(/0$/, "")} lb/week`;
}

function readGoalWeight(phase) {
  const phaseValue = Number(phase?.goalWeight ?? phase?.targetWeight);
  if (Number.isFinite(phaseValue) && phaseValue > 0) return phaseValue;
  const legacy = Number(localStorage.getItem(GOAL_WEIGHT_KEY));
  return Number.isFinite(legacy) && legacy > 0 ? legacy : null;
}

function ensureStyles() {
  if (document.getElementById("phase-details-editor-styles")) return;
  const style = document.createElement("style");
  style.id = "phase-details-editor-styles";
  style.textContent = `
    #phase-details-editor-wrap{margin-top:10px}
    #edit-current-phase-details{width:100%}
    #phase-details-editor{margin-top:10px;padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.025)}
    #phase-details-editor[hidden]{display:none!important}
    #phase-details-editor h4{margin:4px 0 6px;font-size:16px;color:#fff}
    #phase-details-editor .phase-details-note{margin:0 0 12px;color:var(--muted,#a1a1aa);font-size:12px;line-height:1.45}
    #phase-details-editor .phase-details-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    #phase-details-editor label{display:flex;flex-direction:column;gap:6px;color:#f4f4f5;font-size:12px;font-weight:700}
    #phase-details-editor input{width:100%;box-sizing:border-box}
    #phase-details-editor .phase-details-readonly{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
    #phase-details-editor .phase-details-readonly>div{padding:9px;border-radius:10px;background:rgba(255,255,255,.035)}
    #phase-details-editor .phase-details-readonly span{display:block;color:var(--muted,#a1a1aa);font-size:9px;text-transform:uppercase;letter-spacing:.08em}
    #phase-details-editor .phase-details-readonly strong{display:block;margin-top:3px;color:#fff;font-size:12px}
    #phase-details-editor .phase-details-actions{display:flex;gap:8px;margin-top:12px}
    #phase-details-editor .phase-details-actions button{flex:1}
    #phase-details-editor-status{min-height:18px;margin:8px 0 0;color:var(--muted,#a1a1aa);font-size:11px;line-height:1.35}
    #nutrition-phase-start-date[data-current-phase-locked="1"]{opacity:.72}
    @media(max-width:390px){#phase-details-editor .phase-details-grid,#phase-details-editor .phase-details-readonly{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function getActivePhase() {
  const phases = readPhases();
  const index = activePhaseIndex(phases);
  return index >= 0 ? { phases, index, phase: phases[index] } : null;
}

function syncSetPhaseDateControl() {
  const activeState = getActivePhase();
  const input = document.getElementById("nutrition-phase-start-date");
  const select = document.getElementById("unified-goal-select");
  if (!input || !select || !activeState) return;

  const samePhase = select.value === activeState.phase.goalId;
  if (samePhase) {
    input.value = activeState.phase.startDate || today();
    input.disabled = true;
    input.dataset.currentPhaseLocked = "1";
    input.title = "Use Edit Phase Details above to change the current phase start date.";
  } else {
    input.disabled = false;
    delete input.dataset.currentPhaseLocked;
    input.title = "Start date for the new phase.";
  }
}

function renderEditor() {
  ensureStyles();
  const host = document.getElementById("nutrition-current-phase");
  const activeState = getActivePhase();
  if (!host || !activeState) {
    document.getElementById("phase-details-editor-wrap")?.remove();
    return;
  }

  let wrap = document.getElementById("phase-details-editor-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "phase-details-editor-wrap";
    host.appendChild(wrap);
  }

  const phase = activeState.phase;
  const goalWeight = readGoalWeight(phase);
  const currentCalories = Number(phase.currentCalories ?? phase.startCalories);
  wrap.innerHTML = `
    <button id="edit-current-phase-details" class="secondary-btn" type="button">Edit Phase Details</button>
    <div id="phase-details-editor" hidden>
      <span class="eyebrow">EDIT CURRENT PHASE</span>
      <h4>${escapeHtml(phase.label || "Current Phase")}</h4>
      <p class="phase-details-note">This edits the existing phase record. It does not start a new phase or change your phase ID, calories, or target rate.</p>
      <div class="phase-details-grid">
        <label>Phase Start Date<input id="phase-details-start-date" type="date" max="${today()}" value="${escapeHtml(phase.startDate || today())}"></label>
        <label>Goal Weight (lb)<input id="phase-details-goal-weight" type="number" min="1" step="0.1" inputmode="decimal" value="${Number.isFinite(goalWeight) ? goalWeight : ""}" placeholder="Optional"></label>
      </div>
      <div class="phase-details-readonly">
        <div><span>Target Rate</span><strong>${formatRate(phase.targetWeeklyRate)}</strong></div>
        <div><span>Current Calories</span><strong>${Number.isFinite(currentCalories) ? `${Math.round(currentCalories)} kcal/day` : "--"}</strong></div>
      </div>
      <div class="phase-details-actions">
        <button id="cancel-phase-details-edit" class="secondary-btn" type="button">Cancel</button>
        <button id="save-phase-details-edit" class="primary-btn" type="button">Save Changes</button>
      </div>
      <p id="phase-details-editor-status" aria-live="polite"></p>
    </div>`;

  document.getElementById("edit-current-phase-details")?.addEventListener("click", () => {
    const editor = document.getElementById("phase-details-editor");
    if (editor) editor.hidden = !editor.hidden;
  });
  document.getElementById("cancel-phase-details-edit")?.addEventListener("click", () => {
    const editor = document.getElementById("phase-details-editor");
    if (editor) editor.hidden = true;
  });
  document.getElementById("save-phase-details-edit")?.addEventListener("click", saveEditorChanges);
  syncSetPhaseDateControl();
}

function saveEditorChanges() {
  const startDate = String(document.getElementById("phase-details-start-date")?.value || "");
  const goalWeightRaw = Number(document.getElementById("phase-details-goal-weight")?.value);
  const goalWeight = Number.isFinite(goalWeightRaw) && goalWeightRaw > 0 ? Math.round(goalWeightRaw * 10) / 10 : null;
  const status = document.getElementById("phase-details-editor-status");

  if (!validDate(startDate)) {
    if (status) status.textContent = "Choose a valid start date that is not in the future.";
    return;
  }

  const phases = readPhases();
  const index = activePhaseIndex(phases);
  if (index < 0) {
    if (status) status.textContent = "No active phase was found.";
    return;
  }

  const active = phases[index];
  const previousIndex = previousPhaseIndex(phases, index);
  const previous = previousIndex >= 0 ? phases[previousIndex] : null;
  if (previous?.startDate && startDate <= previous.startDate) {
    if (status) status.textContent = `The current phase must start after the previous phase began (${formatDate(previous.startDate)}).`;
    return;
  }

  const now = new Date().toISOString();
  if (previousIndex >= 0) {
    const endDate = previousDay(startDate);
    phases[previousIndex] = {
      ...previous,
      endDate,
      endTrendWeight: trendWeightAsOf(endDate),
      status: "completed",
      updatedAt: now
    };
  }

  phases[index] = {
    ...active,
    startDate,
    startingTrendWeight: trendWeightAsOf(startDate),
    ...(Number.isFinite(goalWeight) ? { goalWeight } : {}),
    updatedAt: now
  };

  writePhases(phases);
  if (Number.isFinite(goalWeight)) localStorage.setItem(GOAL_WEIGHT_KEY, String(goalWeight));

  syncVisiblePhaseCard(phases[index]);
  const setPhaseDate = document.getElementById("nutrition-phase-start-date");
  if (setPhaseDate) setPhaseDate.value = startDate;
  const setGoalWeight = document.getElementById("nutrition-phase-goal-weight");
  if (setGoalWeight && Number.isFinite(goalWeight)) setGoalWeight.value = String(goalWeight);

  window.dispatchEvent(new CustomEvent("levelup:nutrition-phase-updated"));
  window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));

  if (status) status.textContent = `Saved. This same phase now starts ${formatDate(startDate)}.`;
  window.setTimeout(() => {
    syncVisiblePhaseCard(phases[index]);
    syncSetPhaseDateControl();
  }, 120);
}

function syncVisiblePhaseCard(phase) {
  const grid = document.querySelector("#nutrition-current-phase .nutrition-current-phase-grid");
  if (!grid || !phase) return;
  const started = [...grid.children].find(cell => cell.querySelector("span")?.textContent?.trim() === "Started");
  const strong = started?.querySelector("strong");
  const day = phaseDayNumber(phase.startDate);
  if (strong) strong.textContent = `${formatDate(phase.startDate)}${day ? ` · Day ${day}` : ""}`;

  const goalWeightCell = grid.querySelector("[data-phase-goal-weight]");
  const goalWeight = readGoalWeight(phase);
  const goalStrong = goalWeightCell?.querySelector("strong");
  if (goalStrong) goalStrong.textContent = Number.isFinite(goalWeight) ? `${goalWeight.toFixed(1)} lb` : "Not set";
}

function scheduleRender() {
  window.setTimeout(() => {
    renderEditor();
    syncSetPhaseDateControl();
  }, 40);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

document.addEventListener("change", event => {
  if (event.target?.id === "unified-goal-select") window.setTimeout(syncSetPhaseDateControl, 20);
}, true);

window.addEventListener("levelup:nutrition-phase-updated", scheduleRender);
window.addEventListener("levelup:nutrition-updated", scheduleRender);
const content = document.getElementById("content");
if (content) new MutationObserver(scheduleRender).observe(content, { childList: true, subtree: true });
window.addEventListener("load", scheduleRender);
scheduleRender();
