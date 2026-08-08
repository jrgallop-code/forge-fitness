import {
    GOAL_PRESETS,
    calculateTdee,
    calculateGoalCalories,
    calculateMacroTargets,
    poundsToKg
}
from "./tdee-calculator.js?v=adaptive-plan-1";

import {
    getNutritionProfile,
    getNutritionGoal,
    getNutritionMacroPreference,
    getNutritionPlan,
    syncCalculatedCalories,
    setCurrentCalories,
    resetCurrentCaloriesToCalculated
}
from "./nutrition-storage.js?v=adaptive-plan-1";

const WEIGHT_STORAGE_KEY = "forge_weight_entries";


export function initializeNutritionPlanUI() {
    const profile = getNutritionProfile();
    const goal = getNutritionGoal();

    syncPlanFromRecommendation(profile, goal);
    ensureGoalTargetUI();
    ensureAdaptiveCoachUI();
    refreshNutritionPlanUI();

    window.addEventListener(
        "levelup:nutrition-updated",
        () => {
            syncPlanFromRecommendation(
                getNutritionProfile(),
                getNutritionGoal()
            );
            refreshNutritionPlanUI();
        }
    );
}


function syncPlanFromRecommendation(profile, goal) {
    if (!isAdultProfile(profile) || !goal?.goalId) {
        return;
    }

    const estimate = calculateTdee(profile);
    const recommendation =
        calculateGoalCalories(
            estimate.tdee,
            goal.goalId
        );

    if (recommendation) {
        syncCalculatedCalories(
            recommendation.calories
        );
    }
}


function ensureGoalTargetUI() {
    const goalsView =
        document.querySelector(
            '[data-planner-view="goals"]'
        );

    if (!goalsView || document.getElementById("active-calorie-target-card")) {
        return;
    }

    goalsView.insertAdjacentHTML(
        "beforeend",
        `
            <div id="active-calorie-target-card" class="goal-box nutrition-goal-card nutrition-current-target-card">
                <span class="eyebrow">ACTIVE PLAN</span>
                <h3>Current Nutrition Target</h3>

                <div class="weight-summary nutrition-energy-summary">
                    <div class="metric-card">
                        <div>
                            <h3>Calculated Target</h3>
                            <p id="calculated-calorie-target">--</p>
                        </div>
                    </div>

                    <div class="metric-card">
                        <div>
                            <h3>Current Daily Target</h3>
                            <p id="current-calorie-target">--</p>
                        </div>
                    </div>
                </div>

                <p class="nutrition-message">
                    Your calculated target is the starting estimate. If real-world progress suggests a different intake works better, you can save a manual target. The Dashboard, macros and projections will use the current target.
                </p>

                <label for="manual-calorie-target">Adjust Daily Calories</label>
                <input id="manual-calorie-target" type="number" min="1" step="10" placeholder="Enter new daily target">

                <label for="manual-calorie-reason">Reason</label>
                <select id="manual-calorie-reason">
                    <option value="Progress slower than expected">Progress slower than expected</option>
                    <option value="Progress faster than expected">Progress faster than expected</option>
                    <option value="Training or recovery">Training or recovery</option>
                    <option value="Hunger or appetite">Hunger or appetite</option>
                    <option value="Maintenance break">Maintenance break</option>
                    <option value="Other">Other</option>
                </select>

                <div class="nutrition-target-actions">
                    <button id="apply-manual-calories" class="primary-btn" type="button">Apply New Target</button>
                    <button id="reset-calculated-calories" class="secondary-btn" type="button">Use Calculated Target</button>
                </div>

                <p id="manual-calorie-message" class="nutrition-message" aria-live="polite"></p>

                <div class="nutrition-adjustment-history">
                    <h3>Adjustment History</h3>
                    <div id="calorie-adjustment-history"></div>
                </div>
            </div>
        `
    );

    document
        .getElementById("apply-manual-calories")
        ?.addEventListener("click", applyManualCalories);

    document
        .getElementById("reset-calculated-calories")
        ?.addEventListener("click", () => {
            const profile = getNutritionProfile();
            const message = document.getElementById("manual-calorie-message");

            if (!isAdultProfile(profile)) {
                setMessage(message, "Calorie-target adjustments in this tool are for adults only.");
                return;
            }

            resetCurrentCaloriesToCalculated();
            setMessage(message, "Current calories reset to the calculated target.");
            refreshNutritionPlanUI();
        });
}


function applyManualCalories() {
    const profile = getNutritionProfile();
    const message = document.getElementById("manual-calorie-message");

    if (!isAdultProfile(profile)) {
        setMessage(message, "Calorie-target adjustments in this tool are for adults only.");
        return;
    }

    const calories =
        Number(
            document.getElementById("manual-calorie-target")?.value
        );

    const reason =
        document.getElementById("manual-calorie-reason")?.value ||
        "Manual adjustment";

    if (!Number.isFinite(calories) || calories <= 0) {
        setMessage(message, "Enter a valid daily calorie target.");
        return;
    }

    setCurrentCalories(calories, reason);
    setMessage(message, "Current calorie target updated.");
    refreshNutritionPlanUI();
}


function ensureAdaptiveCoachUI() {
    const grid =
        document.querySelector(
            ".nutrition-planner-grid"
        );

    if (grid && !grid.querySelector('[data-nutrition-view="coach"]')) {
        grid.insertAdjacentHTML(
            "beforeend",
            `
                <button class="nutrition-planner-card" type="button" data-nutrition-view="coach">
                    <span class="nutrition-planner-icon">📊</span>
                    <strong>Adaptive Coach</strong>
                    <small>Compare your goal with your real trend</small>
                </button>
            `
        );
    }

    const shell =
        document.querySelector(
            ".nutrition-planner-shell"
        );

    if (shell && !document.querySelector('[data-planner-view="coach"]')) {
        shell.insertAdjacentHTML(
            "afterend",
            `
                <section class="section-card nutrition-planner-view" data-planner-view="coach" hidden>
                    <button class="nutrition-planner-back" type="button" data-adaptive-back>
                        ← Nutrition Planner
                    </button>

                    <span class="eyebrow">ADAPTIVE COACH</span>
                    <h2>Weekly Progress Review</h2>
                    <p class="section-description">
                        Level Up compares your selected goal with your recent weight trend. It never changes calories automatically.
                    </p>

                    <div class="weight-summary nutrition-energy-summary">
                        <div class="metric-card"><div><h3>Current Calories</h3><p id="coach-current-calories">--</p></div></div>
                        <div class="metric-card"><div><h3>Goal Weekly Change</h3><p id="coach-goal-rate">--</p></div></div>
                        <div class="metric-card"><div><h3>Actual Weekly Change</h3><p id="coach-actual-rate">--</p></div></div>
                        <div class="metric-card"><div><h3>Confidence</h3><p id="coach-confidence">--</p></div></div>
                    </div>

                    <div class="goal-box nutrition-goal-card">
                        <h3>Recommendation</h3>
                        <p id="coach-recommendation" class="nutrition-message">Log more weight data to begin.</p>
                        <strong id="coach-suggested-calories"></strong>

                        <div class="nutrition-target-actions">
                            <button id="apply-coach-recommendation" class="primary-btn" type="button" hidden>Apply Recommendation</button>
                            <button id="keep-current-calories" class="secondary-btn" type="button">Keep Current Target</button>
                        </div>
                    </div>
                </section>
            `
        );
    }

    document
        .querySelector('[data-nutrition-view="coach"]')
        ?.addEventListener("click", showCoachView);

    document
        .querySelector("[data-adaptive-back]")
        ?.addEventListener("click", showPlannerDashboard);

    document
        .getElementById("keep-current-calories")
        ?.addEventListener("click", () => {
            const text = document.getElementById("coach-recommendation");
            if (text) {
                text.textContent = "Current calorie target kept unchanged.";
            }
        });
}


function showCoachView() {
    const dashboard =
        document.getElementById("nutrition-planner-dashboard");

    if (dashboard) {
        dashboard.hidden = true;
    }

    document
        .querySelectorAll("[data-planner-view]")
        .forEach(section => {
            section.hidden =
                section.dataset.plannerView !== "coach";
        });

    refreshAdaptiveCoach();
    window.scrollTo({ top: 0, behavior: "smooth" });
}


function showPlannerDashboard() {
    document
        .querySelectorAll("[data-planner-view]")
        .forEach(section => {
            section.hidden = true;
        });

    const dashboard =
        document.getElementById("nutrition-planner-dashboard");

    if (dashboard) {
        dashboard.hidden = false;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}


function refreshNutritionPlanUI() {
    const profile = getNutritionProfile();
    const goal = getNutritionGoal();

    syncPlanFromRecommendation(profile, goal);

    const plan = getNutritionPlan();

    setText(
        "calculated-calorie-target",
        Number.isFinite(plan.calculatedCalories)
            ? `${plan.calculatedCalories} kcal/day`
            : "--"
    );

    setText(
        "current-calorie-target",
        Number.isFinite(plan.currentCalories)
            ? `${plan.currentCalories} kcal/day`
            : "--"
    );

    renderAdjustmentHistory(plan.adjustmentHistory);
    refreshMacrosFromCurrentTarget(profile, goal, plan);
    refreshAdaptiveCoach();
}


function refreshMacrosFromCurrentTarget(profile, goal, plan) {
    if (
        !isAdultProfile(profile) ||
        !goal?.goalId ||
        !Number.isFinite(plan.currentCalories)
    ) {
        return;
    }

    const macroPreference =
        getNutritionMacroPreference()?.macroPreset ||
        "balanced";

    const macros = calculateMacroTargets({
        calories: plan.currentCalories,
        weightKg: poundsToKg(Number(profile.weightLb)),
        macroPreset: macroPreference
    });

    if (!macros) {
        return;
    }

    setText("nutrition-protein-target", `${macros.protein} g/day`);
    setText("nutrition-carb-target", `${macros.carbs} g/day`);
    setText("nutrition-fat-target", `${macros.fat} g/day`);
    setText("nutrition-macro-calories", `${macros.calories} kcal/day`);
    setText("planner-summary-calories", `${plan.currentCalories} kcal`);
    setText("planner-summary-protein", `${macros.protein} g`);
}


function renderAdjustmentHistory(history) {
    const container =
        document.getElementById("calorie-adjustment-history");

    if (!container) {
        return;
    }

    if (!history.length) {
        container.innerHTML =
            '<p class="empty-state">No manual calorie adjustments yet.</p>';
        return;
    }

    container.innerHTML =
        [...history]
            .reverse()
            .slice(0, 8)
            .map(item => `
                <div class="nutrition-adjustment-row">
                    <strong>${formatDate(item.date)}</strong>
                    <span>${item.previousCalories ?? "--"} → ${item.newCalories} kcal</span>
                    <small>${escapeHtml(item.reason || "Adjustment")}</small>
                </div>
            `)
            .join("");
}


function refreshAdaptiveCoach() {
    const profile = getNutritionProfile();
    const goal = getNutritionGoal();
    const plan = getNutritionPlan();
    const preset = goal?.goalId
        ? GOAL_PRESETS[goal.goalId]
        : null;

    setText(
        "coach-current-calories",
        Number.isFinite(plan.currentCalories)
            ? `${plan.currentCalories} kcal/day`
            : "--"
    );

    if (!isAdultProfile(profile) || !preset) {
        setText("coach-goal-rate", "--");
        setText("coach-actual-rate", "--");
        setText("coach-confidence", "--");
        setText("coach-recommendation", "Save an adult Body Profile and Nutrition Goal first.");
        hideCoachApply();
        return;
    }

    const entries = getWeightEntries();
    const actualRate = calculateActualWeeklyChange(entries);
    const goalRate = Number(preset.weeklyWeightChangeLb);
    const confidence = getConfidence(entries.length);

    setText("coach-goal-rate", formatRate(goalRate));
    setText("coach-actual-rate", actualRate === null ? "--" : formatRate(actualRate));
    setText("coach-confidence", `${confidence.label} · ${entries.length} weigh-ins`);

    if (entries.length < 14 || actualRate === null) {
        setText(
            "coach-recommendation",
            "Keep collecting consistent weight data. Level Up waits for at least 14 weigh-ins before suggesting a calorie change."
        );
        setText("coach-suggested-calories", "");
        hideCoachApply();
        return;
    }

    const difference =
        actualRate - goalRate;

    if (Math.abs(difference) <= 0.2) {
        setText(
            "coach-recommendation",
            "Your recent weight trend is close to your selected goal. No calorie adjustment is suggested right now."
        );
        setText("coach-suggested-calories", "");
        hideCoachApply();
        return;
    }

    if (!Number.isFinite(plan.currentCalories)) {
        hideCoachApply();
        return;
    }

    const direction =
        difference > 0
            ? -1
            : 1;

    const adjustment =
        Math.abs(difference) >= 0.4
            ? 150
            : 100;

    const suggested =
        Math.round(
            plan.currentCalories +
            direction * adjustment
        );

    const actionText =
        direction < 0
            ? `reduce the current target by about ${adjustment} kcal/day`
            : `increase the current target by about ${adjustment} kcal/day`;

    setText(
        "coach-recommendation",
        `Your recent trend is ${Math.abs(difference).toFixed(2)} lb/week away from your selected target. Consider whether you want to ${actionText}. This is an adult-use coaching suggestion, not an automatic change.`
    );

    setText(
        "coach-suggested-calories",
        `Suggested target: ${suggested} kcal/day`
    );

    const applyButton =
        document.getElementById("apply-coach-recommendation");

    if (applyButton) {
        applyButton.hidden = false;
        applyButton.onclick = () => {
            setCurrentCalories(
                suggested,
                "Adaptive Coach recommendation"
            );
            refreshNutritionPlanUI();
            setText(
                "coach-recommendation",
                "Recommendation applied. Your current calorie target has been updated."
            );
            hideCoachApply();
        };
    }
}


function getWeightEntries() {
    try {
        const parsed =
            JSON.parse(
                localStorage.getItem(WEIGHT_STORAGE_KEY) ||
                "[]"
            );

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


function calculateActualWeeklyChange(entries) {
    if (entries.length < 2) {
        return null;
    }

    const moving = entries.map(entry => {
        const date = new Date(`${entry.date}T00:00:00`);
        const start = new Date(date);
        start.setDate(start.getDate() - 6);

        const windowEntries = entries.filter(item => {
            const itemDate = new Date(`${item.date}T00:00:00`);
            return itemDate >= start && itemDate <= date;
        });

        return {
            date: entry.date,
            weight:
                windowEntries.reduce((sum, item) => sum + item.weight, 0) /
                windowEntries.length
        };
    });

    const latest = moving[moving.length - 1];
    const latestDate = new Date(`${latest.date}T00:00:00`);

    for (let index = moving.length - 2; index >= 0; index--) {
        const candidate = moving[index];
        const candidateDate = new Date(`${candidate.date}T00:00:00`);
        const days = (latestDate - candidateDate) / 86400000;

        if (days >= 7) {
            return ((latest.weight - candidate.weight) / days) * 7;
        }
    }

    return null;
}


function getConfidence(count) {
    if (count < 7) return { label: "Very Low" };
    if (count < 14) return { label: "Low" };
    if (count < 21) return { label: "Medium" };
    if (count < 28) return { label: "High" };
    return { label: "Very High" };
}


function isAdultProfile(profile) {
    return Boolean(
        profile &&
        Number.isFinite(Number(profile.age)) &&
        Number(profile.age) >= 18
    );
}


function formatRate(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "--";
    }

    return `${number > 0 ? "+" : ""}${number.toFixed(2)} lb/wk`;
}


function hideCoachApply() {
    const button =
        document.getElementById("apply-coach-recommendation");

    if (button) {
        button.hidden = true;
        button.onclick = null;
    }
}


function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}


function setMessage(element, value) {
    if (element) {
        element.textContent = value;
    }
}


function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
}


function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
