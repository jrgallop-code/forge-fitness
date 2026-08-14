const PHASES_KEY = "level_up_nutrition_phases";
const GOAL_WEIGHT_KEY = "level_up_goal_weight";

function readPhases() {
    try {
        const parsed = JSON.parse(localStorage.getItem(PHASES_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function activePhaseIndex(phases) {
    for (let index = phases.length - 1; index >= 0; index -= 1) {
        if (phases[index] && !phases[index].endDate && phases[index].goalId) return index;
    }
    return -1;
}

function roundGoalWeight(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.round(number * 10) / 10 : null;
}

function formatDate(value) {
    if (!value) return "its existing start date";
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return "its existing start date";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function setMessage(text) {
    const node = document.getElementById("unified-calorie-message");
    if (node) node.textContent = text;
}

function updateCurrentPhaseGoalWeight() {
    const input = document.getElementById("nutrition-phase-goal-weight");
    const selectedGoalId = document.getElementById("unified-goal-select")?.value;
    if (!input || !selectedGoalId) return;

    const goalWeight = roundGoalWeight(input.value);
    if (!Number.isFinite(goalWeight)) return;

    const phases = readPhases();
    const index = activePhaseIndex(phases);
    if (index < 0) return;

    const active = phases[index];
    if (selectedGoalId !== active.goalId) return;

    const previous = roundGoalWeight(active.goalWeight ?? active.targetWeight ?? localStorage.getItem(GOAL_WEIGHT_KEY));
    if (Number.isFinite(previous) && Math.abs(previous - goalWeight) < 0.05) return;

    phases[index] = {
        ...active,
        goalWeight,
        updatedAt: new Date().toISOString()
    };

    localStorage.setItem(PHASES_KEY, JSON.stringify(phases));
    localStorage.setItem(GOAL_WEIGHT_KEY, String(goalWeight));

    window.dispatchEvent(new CustomEvent("levelup:nutrition-phase-updated"));
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));

    setMessage(`Goal Weight updated to ${goalWeight.toFixed(1)} lb. Your current phase is unchanged and still starts ${formatDate(active.startDate)}.`);
}

document.addEventListener("change", event => {
    if (event.target?.id === "nutrition-phase-goal-weight") {
        updateCurrentPhaseGoalWeight();
    }
}, true);

document.addEventListener("keydown", event => {
    if (event.target?.id === "nutrition-phase-goal-weight" && event.key === "Enter") {
        event.preventDefault();
        updateCurrentPhaseGoalWeight();
        event.target.blur();
    }
}, true);
