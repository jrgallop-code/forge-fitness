const PHASES_KEY = "level_up_nutrition_phases";
const WEIGHT_KEY = "forge_weight_entries";
const GOAL_WEIGHT_KEY = "level_up_goal_weight";
const DAY_MS = 86400000;

let editMode = false;
let draftStartDate = "";
let draftGoalWeight = "";
let editingPhaseId = null;
let editingGoalId = null;
let refreshTimer = null;

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

function getActiveState() {
    const phases = readPhases();
    for (let index = phases.length - 1; index >= 0; index -= 1) {
        if (phases[index] && !phases[index].endDate && phases[index].goalId) {
            return { phases, index, phase: phases[index] };
        }
    }
    return null;
}

function previousPhaseIndex(phases, index) {
    for (let i = index - 1; i >= 0; i -= 1) {
        if (phases[i]?.startDate) return i;
    }
    return -1;
}

function today() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateMs(value) {
    return new Date(`${value}T12:00:00`).getTime();
}

function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value))
        && Number.isFinite(dateMs(value))
        && value <= today();
}

function previousDay(value) {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value || "--";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function phaseDay(startDate) {
    if (!validDate(startDate)) return null;
    return Math.max(1, Math.floor((dateMs(today()) - dateMs(startDate)) / DAY_MS) + 1);
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

function trendAsOf(date) {
    const eligible = readWeights().filter(entry => entry.date <= date);
    if (!eligible.length) return null;
    const latest = eligible.at(-1);
    const cutoff = dateMs(latest.date) - (6 * DAY_MS);
    const recent = eligible.filter(entry => dateMs(entry.date) >= cutoff);
    const sample = recent.length ? recent : [latest];
    const value = sample.reduce((sum, entry) => sum + entry.weight, 0) / sample.length;
    return Math.round(value * 100) / 100;
}

function readGoalWeight(phase) {
    const phaseValue = Number(phase?.goalWeight ?? phase?.targetWeight);
    if (Number.isFinite(phaseValue) && phaseValue > 0) return phaseValue;
    const legacy = Number(localStorage.getItem(GOAL_WEIGHT_KEY));
    return Number.isFinite(legacy) && legacy > 0 ? legacy : null;
}

function findMetricCell(grid, label) {
    return [...(grid?.children || [])].find(cell => cell.querySelector("span")?.textContent?.trim() === label) || null;
}

function ensureStyles() {
    if (document.getElementById("phase-inline-editor-styles")) return;
    const style = document.createElement("style");
    style.id = "phase-inline-editor-styles";
    style.textContent = `
        #nutrition-current-phase .phase-inline-edit-button{width:100%;margin-top:8px}
        #nutrition-current-phase.phase-inline-editing{outline:1px solid rgba(255,59,66,.35);outline-offset:2px}
        #nutrition-current-phase .phase-inline-input{width:100%;min-width:0;box-sizing:border-box;margin:0;padding:8px 9px;border:1px solid rgba(255,255,255,.20);border-radius:9px;background:#f4f4f5;color:#111;font:inherit;font-weight:700}
        #nutrition-current-phase .phase-inline-actions{display:flex;gap:8px;margin-top:8px}
        #nutrition-current-phase .phase-inline-actions button{flex:1;min-height:44px}
        #nutrition-current-phase .phase-inline-note{margin:8px 2px 0;color:var(--muted,#a1a1aa);font-size:10px;line-height:1.35}
        #nutrition-current-phase .phase-inline-status{min-height:16px;margin:7px 2px 0;color:var(--muted,#a1a1aa);font-size:10px;line-height:1.35}
        #nutrition-current-phase .phase-inline-saved{margin:7px 2px 0;color:#4ade80;font-size:10px;font-weight:700}
        #nutrition-phase-start-date[data-current-phase-locked="1"]{opacity:.62}
        @media(max-width:390px){
            #nutrition-current-phase .phase-inline-actions{gap:6px}
            #nutrition-current-phase .phase-inline-input{padding:7px 8px;font-size:12px}
        }
    `;
    document.head.appendChild(style);
}

function lockSetupStartDate(phase) {
    const input = document.getElementById("nutrition-phase-start-date");
    const select = document.getElementById("unified-goal-select");
    if (!input || !select || !phase) return;

    if (select.value === phase.goalId) {
        input.value = phase.startDate || today();
        input.disabled = true;
        input.dataset.currentPhaseLocked = "1";
        input.title = "Use Edit Phase Details in the Current Phase card to correct this phase's start date.";
    } else {
        input.disabled = false;
        delete input.dataset.currentPhaseLocked;
        input.title = "Start date for the new phase.";
    }
}

function renderDisplayCells(phase) {
    const grid = document.querySelector("#nutrition-current-phase .nutrition-current-phase-grid");
    if (!grid || !phase) return;

    const started = findMetricCell(grid, "Started");
    const startedStrong = started?.querySelector("strong");
    if (startedStrong) {
        const day = phaseDay(phase.startDate);
        const value = `${formatDate(phase.startDate)}${day ? ` · Day ${day}` : ""}`;
        if (startedStrong.textContent !== value) startedStrong.textContent = value;
    }

    const goalCell = findMetricCell(grid, "Goal Weight");
    const goalStrong = goalCell?.querySelector("strong");
    const goal = readGoalWeight(phase);
    const goalValue = Number.isFinite(goal) ? `${goal.toFixed(1)} lb` : "Not set";
    if (goalStrong && goalStrong.textContent !== goalValue) goalStrong.textContent = goalValue;
}

function renderViewMode(host, phase, savedMessage = "") {
    if (!host || !phase) return;
    host.classList.remove("phase-inline-editing");
    host.querySelector(".phase-inline-actions")?.remove();
    host.querySelector(".phase-inline-note")?.remove();
    host.querySelector(".phase-inline-status")?.remove();
    host.querySelector(".phase-inline-saved")?.remove();

    renderDisplayCells(phase);

    let button = host.querySelector("#edit-current-phase-details");
    if (!button) {
        button = document.createElement("button");
        button.id = "edit-current-phase-details";
        button.type = "button";
        button.className = "secondary-btn phase-inline-edit-button";
        button.textContent = "Edit Phase Details";
        host.appendChild(button);
    }

    if (savedMessage) {
        const message = document.createElement("p");
        message.className = "phase-inline-saved";
        message.textContent = savedMessage;
        button.insertAdjacentElement("afterend", message);
        window.setTimeout(() => message.remove(), 2200);
    }
}

function renderEditMode(host, phase) {
    if (!host || !phase) return;
    host.classList.add("phase-inline-editing");
    host.querySelector("#edit-current-phase-details")?.remove();
    host.querySelector(".phase-inline-saved")?.remove();

    const grid = host.querySelector(".nutrition-current-phase-grid");
    if (!grid) return;

    const started = findMetricCell(grid, "Started");
    const startedStrong = started?.querySelector("strong");
    if (startedStrong && !startedStrong.querySelector("#phase-inline-start-date")) {
        startedStrong.innerHTML = `<input id="phase-inline-start-date" class="phase-inline-input" type="date" max="${today()}" value="${draftStartDate || phase.startDate || today()}">`;
    }

    let goalCell = findMetricCell(grid, "Goal Weight");
    if (!goalCell) {
        goalCell = document.createElement("div");
        goalCell.innerHTML = "<span>Goal Weight</span><strong></strong>";
        grid.appendChild(goalCell);
    }
    const goalStrong = goalCell.querySelector("strong");
    if (goalStrong && !goalStrong.querySelector("#phase-inline-goal-weight")) {
        goalStrong.innerHTML = `<input id="phase-inline-goal-weight" class="phase-inline-input" type="number" min="1" step="0.1" inputmode="decimal" value="${draftGoalWeight}" placeholder="Optional">`;
    }

    let note = host.querySelector(".phase-inline-note");
    if (!note) {
        note = document.createElement("p");
        note.className = "phase-inline-note";
        note.textContent = "Editing this card changes this existing phase only. It does not create or restart a phase.";
        grid.insertAdjacentElement("afterend", note);
    }

    let actions = host.querySelector(".phase-inline-actions");
    if (!actions) {
        actions = document.createElement("div");
        actions.className = "phase-inline-actions";
        actions.innerHTML = `<button id="cancel-phase-details-edit" class="secondary-btn" type="button">Cancel</button><button id="save-phase-details-edit" class="primary-btn" type="button">Save Changes</button>`;
        note.insertAdjacentElement("afterend", actions);
    }

    if (!host.querySelector(".phase-inline-status")) {
        const status = document.createElement("p");
        status.className = "phase-inline-status";
        status.id = "phase-inline-status";
        status.setAttribute("aria-live", "polite");
        actions.insertAdjacentElement("afterend", status);
    }
}

function ensureInlineEditor() {
    ensureStyles();
    document.getElementById("phase-details-editor-wrap")?.remove();

    const host = document.getElementById("nutrition-current-phase");
    const state = getActiveState();
    if (!host || !state) return;

    lockSetupStartDate(state.phase);
    if (editMode) renderEditMode(host, state.phase);
    else renderViewMode(host, state.phase);
}

function beginEdit() {
    const state = getActiveState();
    if (!state) return;

    editMode = true;
    window.__levelUpPhaseInlineEditing = true;
    editingPhaseId = state.phase.id ?? null;
    editingGoalId = state.phase.goalId;
    draftStartDate = state.phase.startDate || today();
    const currentGoal = readGoalWeight(state.phase);
    draftGoalWeight = Number.isFinite(currentGoal) ? String(currentGoal) : "";
    ensureInlineEditor();
}

function cancelEdit() {
    editMode = false;
    window.__levelUpPhaseInlineEditing = false;
    editingPhaseId = null;
    editingGoalId = null;
    draftStartDate = "";
    draftGoalWeight = "";
    ensureInlineEditor();
}

function setStatus(message) {
    const status = document.getElementById("phase-inline-status");
    if (status) status.textContent = message;
}

function sameEditingPhase(phase) {
    if (!phase) return false;
    if (editingPhaseId != null && phase.id != null) return String(phase.id) === String(editingPhaseId);
    return phase.goalId === editingGoalId;
}

function saveChanges() {
    const startDate = String(document.getElementById("phase-inline-start-date")?.value || draftStartDate || "");
    const rawGoal = String(document.getElementById("phase-inline-goal-weight")?.value ?? draftGoalWeight ?? "").trim();
    const parsedGoal = rawGoal === "" ? null : Number(rawGoal);
    const newGoal = Number.isFinite(parsedGoal) && parsedGoal > 0 ? Math.round(parsedGoal * 10) / 10 : null;

    draftStartDate = startDate;
    draftGoalWeight = rawGoal;

    if (!validDate(startDate)) {
        setStatus("Choose a valid start date that is not in the future.");
        return;
    }
    if (rawGoal !== "" && !Number.isFinite(newGoal)) {
        setStatus("Enter a valid goal weight or leave it blank.");
        return;
    }

    const state = getActiveState();
    if (!state || !sameEditingPhase(state.phase)) {
        setStatus("The active phase changed while editing. Cancel and reopen Edit Phase Details.");
        return;
    }

    const { phases, index, phase: active } = state;
    const previousIndex = previousPhaseIndex(phases, index);
    const previous = previousIndex >= 0 ? phases[previousIndex] : null;
    if (previous?.startDate && startDate <= previous.startDate) {
        setStatus(`This phase must start after the previous phase began (${formatDate(previous.startDate)}).`);
        return;
    }

    const now = new Date().toISOString();
    if (previousIndex >= 0) {
        const endDate = previousDay(startDate);
        phases[previousIndex] = {
            ...previous,
            endDate,
            endTrendWeight: trendAsOf(endDate),
            status: "completed",
            updatedAt: now
        };
    }

    const updatedPhase = {
        ...active,
        startDate,
        startingTrendWeight: trendAsOf(startDate),
        ...(Number.isFinite(newGoal) ? { goalWeight: newGoal } : {}),
        updatedAt: now
    };
    phases[index] = updatedPhase;
    writePhases(phases);
    if (Number.isFinite(newGoal)) localStorage.setItem(GOAL_WEIGHT_KEY, String(newGoal));

    const verified = getActiveState();
    if (!verified || verified.phase.startDate !== startDate || !sameEditingPhase(verified.phase)) {
        setStatus("The phase date did not save. Please try again.");
        return;
    }

    const host = document.getElementById("nutrition-current-phase");
    editMode = false;
    window.__levelUpPhaseInlineEditing = false;
    editingPhaseId = null;
    editingGoalId = null;
    draftStartDate = "";
    draftGoalWeight = "";

    const setupDate = document.getElementById("nutrition-phase-start-date");
    if (setupDate) setupDate.value = startDate;
    const setupGoal = document.getElementById("nutrition-phase-goal-weight");
    if (setupGoal && Number.isFinite(newGoal)) setupGoal.value = String(newGoal);

    if (host) renderViewMode(host, verified.phase, `Saved · phase now starts ${formatDate(startDate)}`);

    window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("levelup:nutrition-phase-updated", { detail: { source: "phase-inline-editor" } }));
        window.dispatchEvent(new CustomEvent("levelup:nutrition-updated", { detail: { source: "phase-inline-editor" } }));
        scheduleRefresh(140);
    }, 0);
}

function scheduleRefresh(delay = 40) {
    clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(ensureInlineEditor, delay);
}

document.addEventListener("input", event => {
    if (event.target?.id === "phase-inline-start-date") draftStartDate = event.target.value;
    if (event.target?.id === "phase-inline-goal-weight") draftGoalWeight = event.target.value;
}, true);

document.addEventListener("change", event => {
    if (event.target?.id === "phase-inline-start-date") draftStartDate = event.target.value;
    if (event.target?.id === "phase-inline-goal-weight") draftGoalWeight = event.target.value;
    if (event.target?.id === "unified-goal-select" && !editMode) scheduleRefresh(30);
}, true);

document.addEventListener("click", event => {
    const editButton = event.target?.closest?.("#edit-current-phase-details");
    const cancelButton = event.target?.closest?.("#cancel-phase-details-edit");
    const saveButton = event.target?.closest?.("#save-phase-details-edit");
    if (!editButton && !cancelButton && !saveButton) return;

    event.preventDefault();
    event.stopPropagation();

    if (editButton) beginEdit();
    else if (cancelButton) cancelEdit();
    else if (saveButton) saveChanges();
}, true);

const content = document.getElementById("content");
if (content) {
    new MutationObserver(() => {
        if (!editMode) scheduleRefresh(40);
        else window.setTimeout(ensureInlineEditor, 20);
    }).observe(content, { childList: true, subtree: true });
}

window.addEventListener("levelup:nutrition-phase-updated", () => {
    if (!editMode) scheduleRefresh(50);
});
window.addEventListener("levelup:nutrition-updated", () => {
    if (!editMode) scheduleRefresh(50);
});
window.addEventListener("load", () => scheduleRefresh(20));
window.__levelUpPhaseInlineEditing = false;
scheduleRefresh(0);
