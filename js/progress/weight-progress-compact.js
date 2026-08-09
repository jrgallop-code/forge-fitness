const GOAL_WEIGHT_STORAGE_KEY = "level_up_goal_weight";

function compactWeightProgress() {
    const section = document.getElementById("weight-progress");
    if (!section || section.dataset.compactLayout === "true") return;

    const entryCards = section.querySelectorAll(".weight-entry-card");
    const weightEntry = entryCards[0];
    const goalEntry = entryCards[1];
    const summary = section.querySelector(".weight-summary");

    if (!weightEntry || !goalEntry || !summary) return;

    const dateLabel = weightEntry.querySelector('label[for="weight-date"]');
    const dateInput = weightEntry.querySelector("#weight-date");
    const weightLabel = weightEntry.querySelector('label[for="daily-weight"]');
    const weightInput = weightEntry.querySelector("#daily-weight");
    const saveWeightButton = weightEntry.querySelector("#save-weight-btn");

    const goalLabel = goalEntry.querySelector('label[for="reference-weight"]');
    const goalInput = goalEntry.querySelector("#reference-weight");
    const saveGoalButton = goalEntry.querySelector("#save-reference-weight-btn");

    if (!dateInput || !weightInput || !saveWeightButton || !goalInput || !saveGoalButton) return;

    weightEntry.classList.add("weight-entry-card-compact");
    weightEntry.innerHTML = "";

    const fields = document.createElement("div");
    fields.className = "weight-compact-fields";

    const dateField = document.createElement("label");
    dateField.className = "weight-compact-field";
    dateField.htmlFor = "weight-date";
    dateField.innerHTML = `<span>${dateLabel?.textContent?.trim() || "Date"}</span>`;
    dateField.appendChild(dateInput);

    const weightField = document.createElement("label");
    weightField.className = "weight-compact-field";
    weightField.htmlFor = "daily-weight";
    weightField.innerHTML = `<span>${weightLabel?.textContent?.trim() || "Weight (lb)"}</span>`;
    weightField.appendChild(weightInput);

    fields.append(dateField, weightField);

    const goalField = document.createElement("label");
    goalField.className = "weight-compact-field weight-goal-field";
    goalField.htmlFor = "reference-weight";
    goalField.innerHTML = `<span>${goalLabel?.textContent?.trim() || "Goal Weight (lb)"}</span>`;
    goalField.appendChild(goalInput);

    const actions = document.createElement("div");
    actions.className = "weight-compact-actions";
    actions.append(saveWeightButton, saveGoalButton);

    weightEntry.append(fields, goalField, actions);
    goalEntry.remove();

    if (!document.getElementById("goal-weight-summary")) {
        const goalCard = document.createElement("div");
        goalCard.className = "metric-card";
        goalCard.innerHTML = `<div><h3>Goal Weight</h3><p id="goal-weight-summary">--</p></div>`;
        const latest = summary.querySelector(".metric-card");
        if (latest?.nextSibling) summary.insertBefore(goalCard, latest.nextSibling);
        else summary.appendChild(goalCard);
    }

    updateGoalWeightSummary();
    section.dataset.compactLayout = "true";
}

function updateGoalWeightSummary() {
    const target = document.getElementById("goal-weight-summary");
    if (!target) return;
    const value = Number(localStorage.getItem(GOAL_WEIGHT_STORAGE_KEY));
    target.textContent = Number.isFinite(value) && value > 0 ? `${value.toFixed(1)} lb` : "--";
}

function initialize() {
    compactWeightProgress();
    updateGoalWeightSummary();
}

const timer = window.setInterval(() => {
    if (document.getElementById("weight-progress")) initialize();
}, 1000);

window.addEventListener("levelup:nutrition-updated", updateGoalWeightSummary);
window.addEventListener("pagehide", () => clearInterval(timer), { once: true });
initialize();
