import {
    GOAL_PRESETS,
    calculateTdee,
    calculateGoalCalories,
    poundsToKg,
    feetAndInchesToCm
}
from "./tdee-calculator.js?v=nutrition-goal-projection-1";

import {
    getNutritionProfile,
    getNutritionGoal
}
from "./nutrition-storage.js?v=nutrition-goal-projection-1";


const GOAL_WEIGHT_STORAGE_KEY =
    "level_up_goal_weight";

const WEIGHT_STORAGE_KEY =
    "forge_weight_entries";


export function renderGoalProjection() {
    return `
        <section class="section-card">
            <span class="eyebrow">GOAL PROJECTION</span>
            <h2>Goal Weight & Timeline</h2>

            <p class="section-description">
                Set an adult goal weight and Level Up will create a rough timeline
                from your current nutrition plan. If you use the Weight Tracker,
                your recent 7-day average is used as the starting weight.
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
                <div class="metric-card">
                    <div>
                        <h3>Starting Weight</h3>
                        <p id="projection-current-weight">--</p>
                    </div>
                </div>

                <div class="metric-card">
                    <div>
                        <h3>Goal Weight</h3>
                        <p id="projection-goal-weight">--</p>
                    </div>
                </div>

                <div class="metric-card">
                    <div>
                        <h3>Estimated Weekly Change</h3>
                        <p id="projection-weekly-rate">--</p>
                    </div>
                </div>

                <div class="metric-card">
                    <div>
                        <h3>Estimated Timeline</h3>
                        <p id="projection-weeks">--</p>
                    </div>
                </div>

                <div class="metric-card">
                    <div>
                        <h3>Projected Date</h3>
                        <p id="projection-date">--</p>
                    </div>
                </div>

                <div class="metric-card">
                    <div>
                        <h3>Weight Source</h3>
                        <p id="projection-weight-source">--</p>
                    </div>
                </div>
            </div>

            <p
                id="goal-projection-message"
                class="nutrition-message"
                aria-live="polite"
            ></p>

            <small>
                This is a rough adult-use projection, not a promise or deadline.
                Real body weight changes are not perfectly linear, and actual energy
                needs can differ from equation-based estimates.
            </small>
        </section>
    `;
}


export function initializeGoalProjection() {
    const storedGoalWeight =
        getStoredGoalWeight();

    if (storedGoalWeight !== null) {
        const input =
            document.getElementById("nutrition-goal-weight");

        if (input) {
            input.value = storedGoalWeight;
        }

        updateProjection(storedGoalWeight);
    }
    else {
        updateStartingWeightDisplay();
    }

    document
        .getElementById("save-goal-weight-btn")
        ?.addEventListener(
            "click",
            saveGoalWeightFromForm
        );
}


function saveGoalWeightFromForm() {
    const input =
        document.getElementById("nutrition-goal-weight");

    const goalWeight =
        Number(input?.value);

    const message =
        document.getElementById("goal-projection-message");

    if (!Number.isFinite(goalWeight) || goalWeight <= 0) {
        setMessage(
            message,
            "Enter a valid goal weight first."
        );
        return;
    }

    const profile =
        getNutritionProfile();

    if (!profile) {
        setMessage(
            message,
            "Save your Body Profile first."
        );
        return;
    }

    if (!Number.isFinite(Number(profile.age)) || Number(profile.age) < 18) {
        setMessage(
            message,
            "Goal-weight projections in this tool are for adults only."
        );
        return;
    }

    localStorage.setItem(
        GOAL_WEIGHT_STORAGE_KEY,
        String(goalWeight)
    );

    updateProjection(goalWeight);
}


function updateProjection(goalWeight) {
    const profile =
        getNutritionProfile();

    const savedGoal =
        getNutritionGoal();

    const message =
        document.getElementById("goal-projection-message");

    if (!profile) {
        clearProjection();
        setMessage(
            message,
            "Save your Body Profile first."
        );
        return;
    }

    if (!Number.isFinite(Number(profile.age)) || Number(profile.age) < 18) {
        clearProjection();
        setMessage(
            message,
            "Goal-weight projections in this tool are for adults only."
        );
        return;
    }

    if (!savedGoal?.goalId || !GOAL_PRESETS[savedGoal.goalId]) {
        clearProjection();
        updateStartingWeightDisplay();
        setGoalWeightDisplay(goalWeight);
        setMessage(
            message,
            "Save a Nutrition Goal first so Level Up can estimate a timeline."
        );
        return;
    }

    const currentWeightData =
        getCurrentWeightForProjection(profile);

    const currentWeight =
        currentWeightData.weight;

    updateStartingWeightDisplay(currentWeightData);
    setGoalWeightDisplay(goalWeight);

    if (savedGoal.goalId === "maintain") {
        setProjectionValue("projection-weekly-rate", "Maintain");
        setProjectionValue("projection-weeks", "No timeline");
        setProjectionValue("projection-date", "--");
        setMessage(
            message,
            "Maintenance does not create a weight-change timeline. Choose a fat-loss or lean-bulk goal if you want a projected date."
        );
        return;
    }

    const isCut =
        savedGoal.goalId.startsWith("cut_");

    const isBulk =
        savedGoal.goalId.startsWith("bulk_");

    if (isCut && goalWeight >= currentWeight) {
        clearTimelineOnly();
        setMessage(
            message,
            "For a fat-loss phase, enter a goal weight below your current trend weight."
        );
        return;
    }

    if (isBulk && goalWeight <= currentWeight) {
        clearTimelineOnly();
        setMessage(
            message,
            "For a lean-bulk phase, enter a goal weight above your current trend weight."
        );
        return;
    }

    const energy =
        calculateTdee({
            ...profile,
            heightCm:
                profile.heightCm ||
                feetAndInchesToCm(
                    profile.heightFeet,
                    profile.heightInches
                ),
            weightKg:
                profile.weightKg ||
                poundsToKg(profile.weightLb)
        });

    const target =
        calculateGoalCalories(
            energy.tdee,
            savedGoal.goalId
        );

    if (!target) {
        clearTimelineOnly();
        setMessage(
            message,
            "Level Up could not calculate a projection from the saved goal."
        );
        return;
    }

    const dailyDifference =
        target.calories - energy.tdee;

    const estimatedWeeklyChange =
        (dailyDifference * 7) / 3500;

    if (
        !Number.isFinite(estimatedWeeklyChange) ||
        Math.abs(estimatedWeeklyChange) < 0.01
    ) {
        clearTimelineOnly();
        setMessage(
            message,
            "The current calorie plan does not create a meaningful projected rate of weight change."
        );
        return;
    }

    const poundsRemaining =
        Math.abs(goalWeight - currentWeight);

    const weeks =
        poundsRemaining /
        Math.abs(estimatedWeeklyChange);

    const projectedDate =
        new Date();

    projectedDate.setDate(
        projectedDate.getDate() +
        Math.ceil(weeks * 7)
    );

    setProjectionValue(
        "projection-weekly-rate",
        `${estimatedWeeklyChange > 0 ? "+" : ""}${estimatedWeeklyChange.toFixed(2)} lb/wk`
    );

    setProjectionValue(
        "projection-weeks",
        `${weeks.toFixed(1)} weeks`
    );

    setProjectionValue(
        "projection-date",
        projectedDate.toLocaleDateString(
            undefined,
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        )
    );

    setMessage(
        message,
        currentWeightData.source === "Weight Tracker"
            ? "Projection updated using your recent Weight Tracker average."
            : "Projection updated using the current weight saved in your Body Profile."
    );
}


function getCurrentWeightForProjection(profile) {
    const entries =
        getWeightEntries();

    if (entries.length) {
        const recent =
            entries.slice(-7);

        const average =
            recent.reduce(
                (sum, entry) => sum + entry.weight,
                0
            ) /
            recent.length;

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
    const stored =
        localStorage.getItem(
            WEIGHT_STORAGE_KEY
        );

    if (!stored) {
        return [];
    }

    try {
        const parsed =
            JSON.parse(stored);

        if (!Array.isArray(parsed)) {
            return [];
        }

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
            .sort((a, b) =>
                a.date.localeCompare(b.date)
            );
    }
    catch {
        return [];
    }
}


function getStoredGoalWeight() {
    const value =
        Number(
            localStorage.getItem(
                GOAL_WEIGHT_STORAGE_KEY
            )
        );

    return Number.isFinite(value) && value > 0
        ? value
        : null;
}


function updateStartingWeightDisplay(data = null) {
    const profile =
        getNutritionProfile();

    if (!profile) {
        setProjectionValue("projection-current-weight", "--");
        setProjectionValue("projection-weight-source", "--");
        return;
    }

    const weightData =
        data ||
        getCurrentWeightForProjection(profile);

    setProjectionValue(
        "projection-current-weight",
        `${weightData.weight.toFixed(1)} lb`
    );

    setProjectionValue(
        "projection-weight-source",
        weightData.source
    );
}


function setGoalWeightDisplay(goalWeight) {
    setProjectionValue(
        "projection-goal-weight",
        `${Number(goalWeight).toFixed(1)} lb`
    );
}


function clearProjection() {
    setProjectionValue("projection-current-weight", "--");
    setProjectionValue("projection-goal-weight", "--");
    setProjectionValue("projection-weekly-rate", "--");
    setProjectionValue("projection-weeks", "--");
    setProjectionValue("projection-date", "--");
    setProjectionValue("projection-weight-source", "--");
}


function clearTimelineOnly() {
    setProjectionValue("projection-weekly-rate", "--");
    setProjectionValue("projection-weeks", "--");
    setProjectionValue("projection-date", "--");
}


function setProjectionValue(id, value) {
    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


function setMessage(element, message) {
    if (element) {
        element.textContent = message;
    }
}
