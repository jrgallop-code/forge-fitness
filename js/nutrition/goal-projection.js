import {
    GOAL_PRESETS
}
from "./tdee-calculator.js?v=active-target-3";

import {
    getNutritionProfile,
    getNutritionGoal,
    getNutritionPlan
}
from "./nutrition-storage.js?v=active-target-3";

import {
    getSelectedTarget
}
from "./active-calorie-target.js?v=active-target-3";

const GOAL_WEIGHT_STORAGE_KEY =
    "level_up_goal_weight";

const WEIGHT_STORAGE_KEY =
    "forge_weight_entries";

export function renderGoalProjection() {
    return `
        <section
            class="section-card nutrition-planner-view nutrition-projection-view"
            data-planner-view="projection"
            hidden
        >
            <button class="nutrition-planner-back" type="button" data-nutrition-back>
                ← Calorie Planner
            </button>

            <span class="eyebrow">GOAL PROJECTION</span>
            <h2>Goal Weight & Timeline</h2>

            <p class="section-description">
                Your projection uses the exact active calorie target saved in Goals & Calories.
            </p>

            <div class="weight-entry-card">
                <label for="nutrition-goal-weight">
                    Goal Weight (lb)
                </label>

                <input
                    id="nutrition-goal-weight"
                    type="number"
                    min="1"
                    step="0.1"
                    placeholder="Enter goal weight"
                >

                <button
                    id="save-goal-weight-btn"
                    class="primary-btn"
                    type="button"
                >
                    Save Goal Weight & Project
                </button>
            </div>

            <div class="weight-summary nutrition-energy-summary">
                <div class="metric-card"><div><h3>Starting Weight</h3><p id="projection-current-weight">--</p></div></div>
                <div class="metric-card"><div><h3>Goal Weight</h3><p id="projection-goal-weight">--</p></div></div>
                <div class="metric-card"><div><h3>Target Source</h3><p id="projection-target-source">--</p></div></div>
                <div class="metric-card"><div><h3>Target Calories</h3><p id="projection-active-calories">--</p></div></div>
                <div class="metric-card"><div><h3>Maintenance Calories</h3><p id="projection-maintenance-calories">--</p></div></div>
                <div class="metric-card"><div><h3>Projected Weekly Change</h3><p id="projection-weekly-rate">--</p></div></div>
                <div class="metric-card"><div><h3>Estimated Timeline</h3><p id="projection-weeks">--</p></div></div>
                <div class="metric-card"><div><h3>Projected Date</h3><p id="projection-date">--</p></div></div>
                <div class="metric-card"><div><h3>Weight Source</h3><p id="projection-weight-source">--</p></div></div>
            </div>

            <div class="nutrition-projection-placeholder" aria-hidden="true">
                <span>Projected trend chart</span>
                <small>Chart visualization can be added here in a later stage.</small>
            </div>

            <p id="goal-projection-message" class="nutrition-message" aria-live="polite"></p>

            <small>
                This is a rough adult-use projection, not a promise or deadline.
                Real body weight changes are not perfectly linear.
            </small>
        </section>
    `;
}

export function initializeGoalProjection() {
    const storedGoalWeight = getStoredGoalWeight();

    if (storedGoalWeight !== null) {
        const input = document.getElementById("nutrition-goal-weight");
        if (input) input.value = storedGoalWeight;
        updateProjection(storedGoalWeight);
    }
    else {
        updateStartingWeightDisplay();
        refreshTargetOnly();
    }

    document
        .getElementById("save-goal-weight-btn")
        ?.addEventListener("click", saveGoalWeightFromForm);

    window.addEventListener("levelup:nutrition-updated", () => {
        const goalWeight = getStoredGoalWeight();
        if (goalWeight !== null) {
            updateProjection(goalWeight);
        }
        else {
            refreshTargetOnly();
        }
    });
}

function saveGoalWeightFromForm() {
    const input = document.getElementById("nutrition-goal-weight");
    const goalWeight = Number(input?.value);
    const message = document.getElementById("goal-projection-message");

    if (!Number.isFinite(goalWeight) || goalWeight <= 0) {
        setMessage(message, "Enter a valid goal weight first.");
        return;
    }

    const profile = getNutritionProfile();

    if (!profile) {
        setMessage(message, "Save your Body Profile first.");
        return;
    }

    if (!Number.isFinite(Number(profile.age)) || Number(profile.age) < 18) {
        setMessage(message, "Goal-weight projections in this tool are for adults only.");
        return;
    }

    localStorage.setItem(GOAL_WEIGHT_STORAGE_KEY, String(goalWeight));
    updateProjection(goalWeight);

    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));
}

function getActiveProjectionTarget() {
    const selectedTarget = getSelectedTarget();
    const activePlan = getNutritionPlan();

    if (!selectedTarget) {
        return null;
    }

    // The saved Current Daily Target is the app-wide source of truth.
    // Do not recalculate or overwrite it here; Goal Projection must mirror
    // the exact number shown in Goals & Calories and on the Dashboard.
    const calories = Number.isFinite(Number(activePlan.currentCalories))
        ? Number(activePlan.currentCalories)
        : Number(selectedTarget.calories);

    const maintenance = Number(selectedTarget.maintenance);

    if (
        !Number.isFinite(calories) || calories <= 0 ||
        !Number.isFinite(maintenance) || maintenance <= 0
    ) {
        return null;
    }

    const weeklyRate =
        ((calories - maintenance) * 7) /
        3500;

    return {
        ...selectedTarget,
        calories,
        maintenance,
        weeklyRate
    };
}

function refreshTargetOnly() {
    const target = getActiveProjectionTarget();

    if (!target) {
        setProjectionValue("projection-target-source", "--");
        setProjectionValue("projection-active-calories", "--");
        setProjectionValue("projection-maintenance-calories", "--");
        setProjectionValue("projection-weekly-rate", "--");
        return;
    }

    setProjectionValue(
        "projection-target-source",
        target.source === "manual" ? "Manual Target" : "Auto Target"
    );

    setProjectionValue(
        "projection-active-calories",
        `${Math.round(target.calories)} kcal/day`
    );

    setProjectionValue(
        "projection-maintenance-calories",
        `${Math.round(target.maintenance)} kcal/day`
    );

    setProjectionValue(
        "projection-weekly-rate",
        formatWeeklyRate(target.weeklyRate)
    );
}

function updateProjection(goalWeight) {
    const profile = getNutritionProfile();
    const savedGoal = getNutritionGoal();
    const message = document.getElementById("goal-projection-message");

    if (!profile) {
        clearProjection();
        setMessage(message, "Save your Body Profile first.");
        return;
    }

    if (!Number.isFinite(Number(profile.age)) || Number(profile.age) < 18) {
        clearProjection();
        setMessage(message, "Goal-weight projections in this tool are for adults only.");
        return;
    }

    if (!savedGoal?.goalId || !GOAL_PRESETS[savedGoal.goalId]) {
        clearProjection();
        updateStartingWeightDisplay();
        setGoalWeightDisplay(goalWeight);
        setMessage(message, "Save a calorie goal first so Level Up can estimate a timeline.");
        return;
    }

    const target = getActiveProjectionTarget();

    if (!target) {
        clearProjection();
        setMessage(message, "Choose an Auto or Manual active target in Goals & Calories first.");
        return;
    }

    const currentWeightData = getCurrentWeightForProjection(profile);
    const currentWeight = currentWeightData.weight;

    updateStartingWeightDisplay(currentWeightData);
    setGoalWeightDisplay(goalWeight);

    const activeCalories = Number(target.calories);
    const weeklyChange = Number(target.weeklyRate);

    setProjectionValue(
        "projection-target-source",
        target.source === "manual" ? "Manual Target" : "Auto Target"
    );
    setProjectionValue(
        "projection-active-calories",
        `${Math.round(activeCalories)} kcal/day`
    );
    setProjectionValue(
        "projection-maintenance-calories",
        `${Math.round(target.maintenance)} kcal/day`
    );
    setProjectionValue(
        "projection-weekly-rate",
        formatWeeklyRate(weeklyChange)
    );

    if (!Number.isFinite(weeklyChange)) {
        clearTimelineOnly();
        setMessage(message, "The selected calorie target does not have a valid weekly-change target yet.");
        return;
    }

    if (Math.abs(weeklyChange) < 0.05) {
        setProjectionValue("projection-weekly-rate", "Maintain");
        setProjectionValue("projection-weeks", "No timeline");
        setProjectionValue("projection-date", "--");
        setMessage(message, `Using your exact saved target of ${Math.round(activeCalories)} kcal/day.`);
        return;
    }

    const isCut = weeklyChange < 0;
    const isBulk = weeklyChange > 0;

    if (isCut && goalWeight >= currentWeight) {
        clearTimelineOnly();
        setMessage(message, `Using ${Math.round(activeCalories)} kcal/day. Enter a goal weight below your current trend weight for a loss projection.`);
        return;
    }

    if (isBulk && goalWeight <= currentWeight) {
        clearTimelineOnly();
        setMessage(message, `Using ${Math.round(activeCalories)} kcal/day. Enter a goal weight above your current trend weight for a gain projection.`);
        return;
    }

    const poundsRemaining = Math.abs(goalWeight - currentWeight);
    const weeks = poundsRemaining / Math.abs(weeklyChange);
    const projectedDate = new Date();

    projectedDate.setDate(projectedDate.getDate() + Math.ceil(weeks * 7));

    setProjectionValue("projection-weeks", `${weeks.toFixed(1)} weeks`);
    setProjectionValue(
        "projection-date",
        projectedDate.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        })
    );

    const targetLabel = target.source === "manual" ? "Manual Target" : "Auto Target";
    setMessage(
        message,
        `Projection is using ${targetLabel}: ${Math.round(activeCalories)} kcal/day and ${formatWeeklyRate(weeklyChange)}.`
    );
}

function getCurrentWeightForProjection(profile) {
    const entries = getWeightEntries();

    if (entries.length) {
        const recent = entries.slice(-7);
        const average = recent.reduce((sum, entry) => sum + entry.weight, 0) / recent.length;

        return {
            weight: average,
            source: recent.length >= 7
                ? "Weight Tracker — 7-day average"
                : `Weight Tracker — ${recent.length}-entry average`
        };
    }

    return {
        weight: Number(profile.weightLb),
        source: "Body Profile"
    };
}

function getWeightEntries() {
    const stored = localStorage.getItem(WEIGHT_STORAGE_KEY);
    if (!stored) return [];

    try {
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map(entry => ({
                date: String(entry?.date || ""),
                weight: Number(entry?.weight)
            }))
            .filter(entry =>
                /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
                Number.isFinite(entry.weight) &&
                entry.weight > 0
            )
            .sort((a, b) => a.date.localeCompare(b.date));
    }
    catch {
        return [];
    }
}

function getStoredGoalWeight() {
    const value = Number(localStorage.getItem(GOAL_WEIGHT_STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
}

function updateStartingWeightDisplay(data = null) {
    const profile = getNutritionProfile();

    if (!profile) {
        setProjectionValue("projection-current-weight", "--");
        setProjectionValue("projection-weight-source", "--");
        return;
    }

    const weightData = data || getCurrentWeightForProjection(profile);
    setProjectionValue("projection-current-weight", `${weightData.weight.toFixed(1)} lb`);
    setProjectionValue("projection-weight-source", weightData.source);
}

function setGoalWeightDisplay(goalWeight) {
    setProjectionValue("projection-goal-weight", `${Number(goalWeight).toFixed(1)} lb`);
}

function formatWeeklyRate(value) {
    const rate = Number(value);
    if (!Number.isFinite(rate)) return "--";
    if (Math.abs(rate) < 0.005) return "Maintain";
    return `${rate > 0 ? "+" : ""}${rate.toFixed(2)} lb/wk`;
}

function clearProjection() {
    setProjectionValue("projection-current-weight", "--");
    setProjectionValue("projection-goal-weight", "--");
    setProjectionValue("projection-target-source", "--");
    setProjectionValue("projection-active-calories", "--");
    setProjectionValue("projection-maintenance-calories", "--");
    setProjectionValue("projection-weekly-rate", "--");
    setProjectionValue("projection-weeks", "--");
    setProjectionValue("projection-date", "--");
    setProjectionValue("projection-weight-source", "--");
}

function clearTimelineOnly() {
    setProjectionValue("projection-weeks", "--");
    setProjectionValue("projection-date", "--");
}

function setProjectionValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function setMessage(element, message) {
    if (element) element.textContent = message;
}
