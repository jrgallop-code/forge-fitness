import {
    GOAL_PRESETS,
    calculateTdee,
    calculateMacroTargets,
    poundsToKg
}
from "./tdee-calculator.js?v=manual-goals-1";

import {
    getNutritionProfile,
    getNutritionGoal,
    getNutritionMacroPreference,
    getNutritionPlan,
    syncCalculatedCalories,
    setCurrentCalories,
    resetCurrentCaloriesToCalculated
}
from "./nutrition-storage.js?v=manual-goals-1";

const WEIGHT_STORAGE_KEY = "forge_weight_entries";
const MANUAL_MAINTENANCE_KEY = "level_up_manual_maintenance_calories";
const CUSTOM_WEEKLY_RATE_KEY = "level_up_custom_weekly_rate";

export function initializeNutritionPlanUI() {
    syncPlanFromRecommendation(getNutritionProfile(), getNutritionGoal());
    ensureGoalTargetUI();
    ensureAdaptiveCoachUI();
    refreshNutritionPlanUI();

    window.addEventListener("levelup:nutrition-updated", () => {
        syncPlanFromRecommendation(getNutritionProfile(), getNutritionGoal());
        refreshNutritionPlanUI();
    });
}

function syncPlanFromRecommendation(profile, goal) {
    if (!isAdultProfile(profile) || !goal?.goalId || !GOAL_PRESETS[goal.goalId]) {
        return;
    }

    const estimatedTdee = calculateTdee(profile).tdee;
    const maintenance = getWorkingMaintenance(estimatedTdee);
    const weeklyRate = getEffectiveWeeklyRate(goal.goalId);

    if (!Number.isFinite(maintenance) || !Number.isFinite(weeklyRate)) {
        return;
    }

    const calculatedCalories = Math.round(
        maintenance + ((weeklyRate * 3500) / 7)
    );

    syncCalculatedCalories(calculatedCalories);
}

function ensureGoalTargetUI() {
    const goalsView = document.querySelector('[data-planner-view="goals"]');
    if (!goalsView || document.getElementById("active-calorie-target-card")) return;

    goalsView.insertAdjacentHTML("beforeend", `
        <div id="active-calorie-target-card" class="goal-box nutrition-goal-card nutrition-current-target-card">
            <span class="eyebrow">ACTIVE PLAN</span>
            <h3>Personalize Your Starting Target</h3>

            <div class="weight-summary nutrition-energy-summary">
                <div class="metric-card"><div><h3>Calculated TDEE</h3><p id="override-estimated-tdee">--</p></div></div>
                <div class="metric-card"><div><h3>Working Maintenance</h3><p id="override-working-maintenance">--</p></div></div>
                <div class="metric-card"><div><h3>Goal Weekly Change</h3><p id="override-effective-rate">--</p></div></div>
                <div class="metric-card"><div><h3>Calculated Target</h3><p id="calculated-calorie-target">--</p></div></div>
                <div class="metric-card"><div><h3>Current Daily Target</h3><p id="current-calorie-target">--</p></div></div>
            </div>

            <div class="nutrition-manual-settings">
                <h3>Maintenance Calories</h3>
                <p class="nutrition-message">If you already know your real-world maintenance intake, use it instead of the equation estimate. Reset anytime to return to calculated TDEE.</p>
                <label for="manual-maintenance-calories">Known Maintenance Calories</label>
                <input id="manual-maintenance-calories" type="number" min="1" step="10" placeholder="Example: 2450">
                <div class="nutrition-target-actions">
                    <button id="save-manual-maintenance" class="primary-btn" type="button">Use My Maintenance</button>
                    <button id="reset-manual-maintenance" class="secondary-btn" type="button">Use Estimated TDEE</button>
                </div>
                <p id="maintenance-override-message" class="nutrition-message" aria-live="polite"></p>
            </div>

            <div class="nutrition-manual-settings">
                <h3>Weekly Weight-Change Target</h3>
                <p class="nutrition-message">Use the preset from your selected goal, or enter a custom signed rate. Use a negative number for weight loss and a positive number for weight gain.</p>
                <label for="custom-weekly-rate">Custom Weekly Change (lb/week)</label>
                <input id="custom-weekly-rate" type="number" step="0.05" placeholder="Example: -0.7">
                <div class="nutrition-target-actions">
                    <button id="save-custom-weekly-rate" class="primary-btn" type="button">Use Custom Rate</button>
                    <button id="reset-custom-weekly-rate" class="secondary-btn" type="button">Use Goal Preset</button>
                </div>
                <p id="weekly-rate-override-message" class="nutrition-message" aria-live="polite"></p>
            </div>

            <hr class="nutrition-divider">
            <h3>Adjust Current Daily Calories</h3>
            <p class="nutrition-message">The calculated target is your starting recommendation. The current daily target is what the Dashboard, macros and Adaptive Coach use. You can adjust it based on real-world progress.</p>
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
            <div class="nutrition-adjustment-history"><h3>Adjustment History</h3><div id="calorie-adjustment-history"></div></div>
        </div>
    `);

    document.getElementById("save-manual-maintenance")?.addEventListener("click", saveManualMaintenance);
    document.getElementById("reset-manual-maintenance")?.addEventListener("click", resetManualMaintenance);
    document.getElementById("save-custom-weekly-rate")?.addEventListener("click", saveCustomWeeklyRate);
    document.getElementById("reset-custom-weekly-rate")?.addEventListener("click", resetCustomWeeklyRate);
    document.getElementById("apply-manual-calories")?.addEventListener("click", applyManualCalories);
    document.getElementById("reset-calculated-calories")?.addEventListener("click", () => {
        if (!isAdultProfile(getNutritionProfile())) return setText("manual-calorie-message", "Adult profile required.");
        resetCurrentCaloriesToCalculated();
        setText("manual-calorie-message", "Current calories reset to the calculated target.");
        refreshNutritionPlanUI();
    });
}

function saveManualMaintenance() {
    if (!isAdultProfile(getNutritionProfile())) return setText("maintenance-override-message", "Adult profile required.");
    const value = Number(document.getElementById("manual-maintenance-calories")?.value);
    if (!Number.isFinite(value) || value <= 0) return setText("maintenance-override-message", "Enter a valid maintenance calorie value.");
    localStorage.setItem(MANUAL_MAINTENANCE_KEY, String(Math.round(value)));
    setText("maintenance-override-message", "Your known maintenance calories are now being used.");
    notifyNutritionUpdated();
}

function resetManualMaintenance() {
    localStorage.removeItem(MANUAL_MAINTENANCE_KEY);
    const input = document.getElementById("manual-maintenance-calories");
    if (input) input.value = "";
    setText("maintenance-override-message", "Working maintenance reset to estimated TDEE.");
    notifyNutritionUpdated();
}

function saveCustomWeeklyRate() {
    if (!isAdultProfile(getNutritionProfile())) return setText("weekly-rate-override-message", "Adult profile required.");
    const value = Number(document.getElementById("custom-weekly-rate")?.value);
    if (!Number.isFinite(value)) return setText("weekly-rate-override-message", "Enter a valid weekly change, such as -0.7 or +0.25.");
    localStorage.setItem(CUSTOM_WEEKLY_RATE_KEY, String(value));
    setText("weekly-rate-override-message", "Custom weekly target saved.");
    notifyNutritionUpdated();
}

function resetCustomWeeklyRate() {
    localStorage.removeItem(CUSTOM_WEEKLY_RATE_KEY);
    const input = document.getElementById("custom-weekly-rate");
    if (input) input.value = "";
    setText("weekly-rate-override-message", "Weekly target reset to your selected goal preset.");
    notifyNutritionUpdated();
}

function applyManualCalories() {
    if (!isAdultProfile(getNutritionProfile())) return setText("manual-calorie-message", "Adult profile required.");
    const calories = Number(document.getElementById("manual-calorie-target")?.value);
    const reason = document.getElementById("manual-calorie-reason")?.value || "Manual adjustment";
    if (!Number.isFinite(calories) || calories <= 0) return setText("manual-calorie-message", "Enter a valid daily calorie target.");
    setCurrentCalories(calories, reason);
    setText("manual-calorie-message", "Current calorie target updated.");
    refreshNutritionPlanUI();
}

function ensureAdaptiveCoachUI() {
    const grid = document.querySelector(".nutrition-planner-grid");
    if (grid && !grid.querySelector('[data-nutrition-view="coach"]')) {
        grid.insertAdjacentHTML("beforeend", `<button class="nutrition-planner-card" type="button" data-nutrition-view="coach"><span class="nutrition-planner-icon">📊</span><strong>Adaptive Coach</strong><small>Compare your goal with your real trend</small></button>`);
    }

    const shell = document.querySelector(".nutrition-planner-shell");
    if (shell && !document.querySelector('[data-planner-view="coach"]')) {
        shell.insertAdjacentHTML("afterend", `
            <section class="section-card nutrition-planner-view" data-planner-view="coach" hidden>
                <button class="nutrition-planner-back" type="button" data-adaptive-back>← Nutrition Planner</button>
                <span class="eyebrow">ADAPTIVE COACH</span><h2>Weekly Progress Review</h2>
                <p class="section-description">Level Up compares your active weekly target with your recent weight trend. It never changes calories automatically.</p>
                <div class="weight-summary nutrition-energy-summary">
                    <div class="metric-card"><div><h3>Current Calories</h3><p id="coach-current-calories">--</p></div></div>
                    <div class="metric-card"><div><h3>Goal Weekly Change</h3><p id="coach-goal-rate">--</p></div></div>
                    <div class="metric-card"><div><h3>Actual Weekly Change</h3><p id="coach-actual-rate">--</p></div></div>
                    <div class="metric-card"><div><h3>Confidence</h3><p id="coach-confidence">--</p></div></div>
                </div>
                <div class="goal-box nutrition-goal-card"><h3>Recommendation</h3><p id="coach-recommendation" class="nutrition-message">Log more weight data to begin.</p><strong id="coach-suggested-calories"></strong><div class="nutrition-target-actions"><button id="apply-coach-recommendation" class="primary-btn" type="button" hidden>Apply Recommendation</button><button id="keep-current-calories" class="secondary-btn" type="button">Keep Current Target</button></div></div>
            </section>
        `);
    }

    document.querySelector('[data-nutrition-view="coach"]')?.addEventListener("click", showCoachView);
    document.querySelector("[data-adaptive-back]")?.addEventListener("click", showPlannerDashboard);
    document.getElementById("keep-current-calories")?.addEventListener("click", () => setText("coach-recommendation", "Current calorie target kept unchanged."));
}

function showCoachView() {
    const dashboard = document.getElementById("nutrition-planner-dashboard");
    if (dashboard) dashboard.hidden = true;
    document.querySelectorAll("[data-planner-view]").forEach(section => { section.hidden = section.dataset.plannerView !== "coach"; });
    refreshAdaptiveCoach();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showPlannerDashboard() {
    document.querySelectorAll("[data-planner-view]").forEach(section => { section.hidden = true; });
    const dashboard = document.getElementById("nutrition-planner-dashboard");
    if (dashboard) dashboard.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function refreshNutritionPlanUI() {
    const profile = getNutritionProfile();
    const goal = getNutritionGoal();
    syncPlanFromRecommendation(profile, goal);
    const plan = getNutritionPlan();
    const estimatedTdee = isAdultProfile(profile) ? calculateTdee(profile).tdee : null;
    const workingMaintenance = Number.isFinite(estimatedTdee) ? getWorkingMaintenance(estimatedTdee) : null;
    const effectiveRate = goal?.goalId ? getEffectiveWeeklyRate(goal.goalId) : null;

    setText("override-estimated-tdee", Number.isFinite(estimatedTdee) ? `${estimatedTdee} kcal/day` : "--");
    setText("override-working-maintenance", Number.isFinite(workingMaintenance) ? `${workingMaintenance} kcal/day${getManualMaintenance() !== null ? " · manual" : ""}` : "--");
    setText("override-effective-rate", Number.isFinite(effectiveRate) ? `${formatRate(effectiveRate)}${getCustomWeeklyRate() !== null ? " · custom" : ""}` : "--");
    setText("calculated-calorie-target", Number.isFinite(plan.calculatedCalories) ? `${plan.calculatedCalories} kcal/day` : "--");
    setText("current-calorie-target", Number.isFinite(plan.currentCalories) ? `${plan.currentCalories} kcal/day` : "--");

    const maintenanceInput = document.getElementById("manual-maintenance-calories");
    if (maintenanceInput && getManualMaintenance() !== null) maintenanceInput.value = getManualMaintenance();
    const rateInput = document.getElementById("custom-weekly-rate");
    if (rateInput && getCustomWeeklyRate() !== null) rateInput.value = getCustomWeeklyRate();

    renderAdjustmentHistory(plan.adjustmentHistory || []);
    refreshMacrosFromCurrentTarget(profile, goal, plan);
    refreshAdaptiveCoach();
}

function refreshMacrosFromCurrentTarget(profile, goal, plan) {
    if (!isAdultProfile(profile) || !goal?.goalId || !Number.isFinite(plan.currentCalories)) return;
    const macroPreference = getNutritionMacroPreference()?.macroPreset || "balanced";
    const macros = calculateMacroTargets({ calories: plan.currentCalories, weightKg: poundsToKg(Number(profile.weightLb)), macroPreset: macroPreference });
    if (!macros) return;
    setText("nutrition-protein-target", `${macros.protein} g/day`);
    setText("nutrition-carb-target", `${macros.carbs} g/day`);
    setText("nutrition-fat-target", `${macros.fat} g/day`);
    setText("nutrition-macro-calories", `${macros.calories} kcal/day`);
    setText("planner-summary-calories", `${plan.currentCalories} kcal`);
    setText("planner-summary-protein", `${macros.protein} g`);
}

function renderAdjustmentHistory(history) {
    const container = document.getElementById("calorie-adjustment-history");
    if (!container) return;
    if (!history.length) { container.innerHTML = '<p class="empty-state">No manual calorie adjustments yet.</p>'; return; }
    container.innerHTML = [...history].reverse().slice(0, 8).map(item => `<div class="nutrition-adjustment-row"><strong>${formatDate(item.date)}</strong><span>${item.previousCalories ?? "--"} → ${item.newCalories} kcal</span><small>${escapeHtml(item.reason || "Adjustment")}</small></div>`).join("");
}

function refreshAdaptiveCoach() {
    const profile = getNutritionProfile();
    const goal = getNutritionGoal();
    const plan = getNutritionPlan();
    const preset = goal?.goalId ? GOAL_PRESETS[goal.goalId] : null;
    setText("coach-current-calories", Number.isFinite(plan.currentCalories) ? `${plan.currentCalories} kcal/day` : "--");
    if (!isAdultProfile(profile) || !preset) {
        setText("coach-goal-rate", "--"); setText("coach-actual-rate", "--"); setText("coach-confidence", "--"); setText("coach-recommendation", "Save an adult Body Profile and Nutrition Goal first."); hideCoachApply(); return;
    }

    const entries = getWeightEntries();
    const actualRate = calculateActualWeeklyChange(entries);
    const goalRate = getEffectiveWeeklyRate(goal.goalId);
    const confidence = getConfidence(entries.length);
    setText("coach-goal-rate", formatRate(goalRate));
    setText("coach-actual-rate", actualRate === null ? "--" : formatRate(actualRate));
    setText("coach-confidence", `${confidence.label} · ${entries.length} weigh-ins`);

    if (entries.length < 14 || actualRate === null) {
        setText("coach-recommendation", "Keep collecting consistent weight data. Level Up waits for at least 14 weigh-ins before suggesting a calorie change."); setText("coach-suggested-calories", ""); hideCoachApply(); return;
    }

    const difference = actualRate - goalRate;
    if (Math.abs(difference) <= 0.2) {
        setText("coach-recommendation", `On target. Your recent trend is ${formatRate(actualRate)} versus a goal of ${formatRate(goalRate)}. The difference is within the ±0.20 lb/week tolerance, so no calorie adjustment is suggested.`); setText("coach-suggested-calories", ""); hideCoachApply(); return;
    }

    if (!Number.isFinite(plan.currentCalories)) { hideCoachApply(); return; }
    const direction = difference > 0 ? -1 : 1;
    const adjustment = Math.abs(difference) >= 0.4 ? 150 : 100;
    const suggested = Math.round(plan.currentCalories + direction * adjustment);
    const actionText = direction < 0 ? `reduce the current target by about ${adjustment} kcal/day` : `increase the current target by about ${adjustment} kcal/day`;
    setText("coach-recommendation", `Your recent trend is ${Math.abs(difference).toFixed(2)} lb/week away from your active target. Consider whether you want to ${actionText}. This is an adult-use coaching suggestion, not an automatic change.`);
    setText("coach-suggested-calories", `Suggested target: ${suggested} kcal/day`);

    const applyButton = document.getElementById("apply-coach-recommendation");
    if (applyButton) {
        applyButton.hidden = false;
        applyButton.onclick = () => { setCurrentCalories(suggested, "Adaptive Coach recommendation"); refreshNutritionPlanUI(); setText("coach-recommendation", "Recommendation applied. Your current calorie target has been updated."); hideCoachApply(); };
    }
}

function getManualMaintenance() {
    const value = Number(localStorage.getItem(MANUAL_MAINTENANCE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
}

function getCustomWeeklyRate() {
    const stored = localStorage.getItem(CUSTOM_WEEKLY_RATE_KEY);
    if (stored === null || stored === "") return null;
    const value = Number(stored);
    return Number.isFinite(value) ? value : null;
}

function getWorkingMaintenance(estimatedTdee) {
    return getManualMaintenance() ?? estimatedTdee;
}

function getEffectiveWeeklyRate(goalId) {
    const custom = getCustomWeeklyRate();
    if (custom !== null) return custom;
    const preset = GOAL_PRESETS[goalId];
    if (!preset) return NaN;
    const direct = Number(preset.weeklyWeightChangeLb ?? preset.weeklyChangeLb);
    if (Number.isFinite(direct)) return direct;
    const adjustment = Number(preset.dailyCalorieAdjustment);
    return Number.isFinite(adjustment) ? (adjustment * 7) / 3500 : NaN;
}

function getWeightEntries() {
    try {
        const parsed = JSON.parse(localStorage.getItem(WEIGHT_STORAGE_KEY) || "[]");
        if (!Array.isArray(parsed)) return [];
        return parsed.map(entry => ({ date: String(entry?.date || ""), weight: Number(entry?.weight) })).filter(entry => /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && Number.isFinite(entry.weight) && entry.weight > 0).sort((a, b) => a.date.localeCompare(b.date));
    } catch { return []; }
}

function calculateActualWeeklyChange(entries) {
    if (entries.length < 2) return null;
    const moving = entries.map(entry => {
        const date = new Date(`${entry.date}T00:00:00`);
        const start = new Date(date); start.setDate(start.getDate() - 6);
        const windowEntries = entries.filter(item => { const itemDate = new Date(`${item.date}T00:00:00`); return itemDate >= start && itemDate <= date; });
        return { date: entry.date, weight: windowEntries.reduce((sum, item) => sum + item.weight, 0) / windowEntries.length };
    });
    const latest = moving[moving.length - 1];
    const latestDate = new Date(`${latest.date}T00:00:00`);
    for (let index = moving.length - 2; index >= 0; index--) {
        const candidate = moving[index];
        const days = (latestDate - new Date(`${candidate.date}T00:00:00`)) / 86400000;
        if (days >= 7) return ((latest.weight - candidate.weight) / days) * 7;
    }
    return null;
}

function getConfidence(count) { if (count < 7) return { label: "Very Low" }; if (count < 14) return { label: "Low" }; if (count < 21) return { label: "Medium" }; if (count < 28) return { label: "High" }; return { label: "Very High" }; }
function isAdultProfile(profile) { return Boolean(profile && Number.isFinite(Number(profile.age)) && Number(profile.age) >= 18); }
function formatRate(value) { const number = Number(value); return Number.isFinite(number) ? `${number > 0 ? "+" : ""}${number.toFixed(2)} lb/wk` : "--"; }
function hideCoachApply() { const button = document.getElementById("apply-coach-recommendation"); if (button) { button.hidden = true; button.onclick = null; } }
function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = value; }
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
function escapeHtml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function notifyNutritionUpdated() { window.dispatchEvent(new CustomEvent("levelup:nutrition-updated")); }
