import { calculateWeightTrend } from "../core/weight-trend.js?v=weight-trend-regression-1";

const GOAL_WEIGHT_STORAGE_KEY = "level_up_goal_weight";
const WEIGHT_STORAGE_KEY = "forge_weight_entries";

export function initializeWeightProgressCompact() {
    compactWeightProgress();
    updateGoalWeightSummary();
    updateWeightTrendSummary();
}

function compactWeightProgress() {
    const section = document.getElementById("weight-progress");
    if (!section || section.dataset.compactLayout === "true") return;

    const entryCards = section.querySelectorAll(".weight-entry-card");
    const weightEntry = entryCards[0];
    const goalEntry = entryCards[1];
    const summary = section.querySelector(".weight-summary");
    const header = section.querySelector(".weight-section-header");
    if (!weightEntry || !goalEntry || !summary || !header) return;

    const dateLabel = weightEntry.querySelector('label[for="weight-date"]');
    const dateInput = weightEntry.querySelector("#weight-date");
    const weightLabel = weightEntry.querySelector('label[for="daily-weight"]');
    const weightInput = weightEntry.querySelector("#daily-weight");
    const saveWeightButton = weightEntry.querySelector("#save-weight-btn");
    const goalLabel = goalEntry.querySelector('label[for="reference-weight"]');
    const goalInput = goalEntry.querySelector("#reference-weight");
    const saveGoalButton = goalEntry.querySelector("#save-reference-weight-btn");
    if (!dateInput || !weightInput || !saveWeightButton || !goalInput || !saveGoalButton) return;

    const addButton = document.createElement("button");
    addButton.className = "primary-btn weight-add-toggle";
    addButton.type = "button";
    addButton.textContent = "+ Add Weight";
    addButton.setAttribute("aria-expanded", "false");
    addButton.setAttribute("aria-controls", "weight-entry-panel");
    header.appendChild(addButton);

    weightEntry.id = "weight-entry-panel";
    weightEntry.classList.add("weight-entry-card-compact");
    weightEntry.hidden = true;
    weightEntry.innerHTML = "";

    const fields = document.createElement("div");
    fields.className = "weight-compact-fields";
    fields.append(
        makeField("weight-date", dateLabel?.textContent?.trim() || "Date", dateInput),
        makeField("daily-weight", weightLabel?.textContent?.trim() || "Weight (lb)", weightInput)
    );

    const closeButton = document.createElement("button");
    closeButton.className = "secondary-btn";
    closeButton.type = "button";
    closeButton.textContent = "Close";

    const actions = document.createElement("div");
    actions.className = "weight-compact-actions";
    actions.append(saveWeightButton, closeButton);
    weightEntry.append(fields, actions);

    const goalDetails = document.createElement("details");
    goalDetails.className = "weight-goal-settings";
    goalDetails.innerHTML = '<summary>Set Goal Weight</summary><div class="weight-goal-settings-body"></div>';
    const goalBody = goalDetails.querySelector(".weight-goal-settings-body");
    goalBody.append(
        makeField("reference-weight", goalLabel?.textContent?.trim() || "Goal Weight (lb)", goalInput),
        saveGoalButton
    );
    weightEntry.insertAdjacentElement("afterend", goalDetails);
    goalEntry.remove();

    if (!document.getElementById("goal-weight-summary")) {
        const goalCard = document.createElement("div");
        goalCard.className = "metric-card";
        goalCard.innerHTML = '<div><h3>Goal Weight</h3><p id="goal-weight-summary">--</p></div>';
        const latest = summary.querySelector(".metric-card");
        if (latest?.nextSibling) summary.insertBefore(goalCard, latest.nextSibling);
        else summary.appendChild(goalCard);
    }

    const setOpen = open => {
        weightEntry.hidden = !open;
        addButton.textContent = open ? "Close Entry" : "+ Add Weight";
        addButton.setAttribute("aria-expanded", String(open));
        if (open) window.setTimeout(() => weightInput.focus(), 0);
    };

    addButton.addEventListener("click", () => setOpen(weightEntry.hidden));
    closeButton.addEventListener("click", () => setOpen(false));
    saveWeightButton.addEventListener("click", () => {
        const valid = Boolean(dateInput.value) && Number(weightInput.value) > 0;
        if (valid) {
            window.setTimeout(() => {
                setOpen(false);
                updateWeightTrendSummary();
            }, 0);
        }
    }, true);
    saveGoalButton.addEventListener("click", () => window.setTimeout(() => {
        updateGoalWeightSummary();
        goalDetails.open = false;
    }, 0));
    section.addEventListener("click", event => {
        if (event.target.closest(".edit-weight-entry")) setOpen(true);
        if (event.target.closest(".remove-weight-entry")) window.setTimeout(updateWeightTrendSummary, 0);
    });

    updateGoalWeightSummary();
    updateWeightTrendSummary();
    section.dataset.compactLayout = "true";
}

function makeField(forId, labelText, input) {
    const field = document.createElement("label");
    field.className = "weight-compact-field";
    field.htmlFor = forId;
    field.innerHTML = `<span>${labelText}</span>`;
    field.appendChild(input);
    return field;
}

function updateGoalWeightSummary() {
    const target = document.getElementById("goal-weight-summary");
    if (!target) return;
    const value = Number(localStorage.getItem(GOAL_WEIGHT_STORAGE_KEY));
    target.textContent = Number.isFinite(value) && value > 0 ? `${value.toFixed(1)} lb` : "--";
}

function updateWeightTrendSummary() {
    const target = document.getElementById("actual-weekly-weight-change");
    if (!target) return;

    const trend = calculateWeightTrend(readWeightEntries());
    const heading = target.closest(".metric-card")?.querySelector("h3");
    if (heading) heading.textContent = trend.label;

    if (!Number.isFinite(trend.weeklyChange)) {
        target.textContent = "Need more data";
        return;
    }

    const direction = trend.weeklyChange > 0 ? "↑" : trend.weeklyChange < 0 ? "↓" : "→";
    target.textContent = `${direction} ${Math.abs(trend.weeklyChange).toFixed(2)} lb/wk`;
}

function readWeightEntries() {
    try {
        const parsed = JSON.parse(localStorage.getItem(WEIGHT_STORAGE_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}

window.addEventListener("levelup:nutrition-updated", () => {
    updateGoalWeightSummary();
    updateWeightTrendSummary();
});
initializeWeightProgressCompact();
