import { calculateTdee } from "./tdee-calculator.js?v=current-goal-1";
import { getNutritionProfile, getNutritionPlan, syncCalculatedCalories } from "./nutrition-storage.js?v=current-goal-1";
import { CURRENT_GOAL_TYPES, getCurrentGoal, getCurrentGoalMetrics, getRecommendedCalories } from "../core/current-goal.js?v=current-goal-1";

const MANUAL_MAINTENANCE_KEY = "level_up_manual_maintenance_calories";

export function initializeUnifiedGoalsCalories() {
    const view = document.querySelector('[data-planner-view="goals"]');
    if (!view) return;

    retireDuplicateGoalInterfaces(view);
    const oldCard = view.querySelector(".goal-box.nutrition-goal-card");
    if (!oldCard) return;

    oldCard.id = "unified-goals-calories-card";
    oldCard.innerHTML = renderUnifiedCard();
    hydrateMaintenance();
    refreshAll();

    document.getElementById("unified-maintenance")?.addEventListener("input", refreshPreview);
    document.getElementById("unified-use-estimate")?.addEventListener("click", useEstimatedMaintenance);
    document.getElementById("unified-save-plan")?.addEventListener("click", saveUnifiedPlan);
    document.getElementById("unified-open-weight-goal")?.addEventListener("click", openWeightGoal);
    document.getElementById("save-nutrition-profile-btn")?.addEventListener("click", () => window.setTimeout(refreshAll, 30));

    window.addEventListener("levelup:nutrition-updated", refreshAll);
    window.addEventListener("levelup:current-goal-updated", refreshAll);
}

function retireDuplicateGoalInterfaces(view) {
    document.querySelector('[data-nutrition-view="projection"]')?.remove();
    document.querySelector('[data-planner-view="projection"]')?.remove();
    document.querySelector('[data-nutrition-view="phases"]')?.remove();
    document.querySelector('[data-planner-view="phases"]')?.remove();
    document.querySelector('[data-nutrition-view="coach"]')?.remove();
    document.querySelector('[data-planner-view="coach"]')?.remove();

    const eyebrow = view.querySelector(":scope > .eyebrow");
    const heading = view.querySelector(":scope > h2");
    const description = view.querySelector(":scope > .section-description");
    if (eyebrow) eyebrow.textContent = "CALORIE TARGET";
    if (heading) heading.textContent = "Calories for Your Current Goal";
    if (description) description.textContent = "Level Up reads the bodyweight goal from Progress → Weight and uses it to estimate an appropriate starting calorie target.";
}

function renderUnifiedCard() {
    return `
        <span class="eyebrow">CALORIE TARGET</span>
        <h3>Current Goal → Calories</h3>
        <div id="unified-current-goal-summary" class="unified-current-goal-summary"></div>

        <div class="unified-maintenance-block">
            <div class="unified-maintenance-heading">
                <div><span>Estimated Maintenance</span><strong id="unified-estimated-maintenance">--</strong></div>
                <small>Calculated from your Body Profile</small>
            </div>
            <label for="unified-maintenance">Maintenance Used for Planning</label>
            <div class="unified-maintenance-input-row">
                <input id="unified-maintenance" type="number" inputmode="numeric" min="1" step="10" placeholder="Save Body Profile first">
                <button id="unified-use-estimate" class="secondary-btn" type="button">Use Estimate</button>
            </div>
            <small class="unified-help">If you know your real-world maintenance, you can use it here. This does not create a second weight goal.</small>
        </div>

        <div class="unified-calorie-summary">
            <div><span>Target Pace</span><strong id="unified-weekly-target">--</strong></div>
            <div><span>Recommended Starting Target</span><strong id="unified-recommended-target">--</strong></div>
            <div class="unified-active-target"><span>Current Calorie Target</span><strong id="unified-active-target">--</strong></div>
        </div>

        <div class="nutrition-target-actions">
            <button id="unified-save-plan" class="primary-btn" type="button">Save Target</button>
            <button id="unified-open-weight-goal" class="secondary-btn" type="button">Edit Weight Goal</button>
        </div>
        <p id="unified-calorie-message" class="nutrition-message" aria-live="polite"></p>
        <small class="unified-adult-note">Adult-use estimate only. Level Up uses smoothed weight trends before suggesting later adjustments.</small>
    `;
}

function getEstimatedMaintenance() {
    const profile = getNutritionProfile();
    if (!profile || !Number.isFinite(Number(profile.age)) || Number(profile.age) < 18) return null;
    try {
        const value = Number(calculateTdee(profile).tdee);
        return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
    } catch {
        return null;
    }
}

function getStoredManualMaintenance() {
    const value = Number(localStorage.getItem(MANUAL_MAINTENANCE_KEY));
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function hydrateMaintenance(force = true) {
    const estimated = getEstimatedMaintenance();
    setText("unified-estimated-maintenance", Number.isFinite(estimated) ? `${estimated} kcal/day` : "Save Body Profile first");
    const input = document.getElementById("unified-maintenance");
    if (!input || (!force && document.activeElement === input)) return;
    const manual = getStoredManualMaintenance();
    input.value = Number.isFinite(manual) ? String(manual) : Number.isFinite(estimated) ? String(estimated) : "";
}

function useEstimatedMaintenance() {
    const estimated = getEstimatedMaintenance();
    if (!Number.isFinite(estimated)) {
        setText("unified-calorie-message", "Save your adult Body Profile first so Level Up can estimate maintenance.");
        return;
    }
    const input = document.getElementById("unified-maintenance");
    if (input) input.value = String(estimated);
    refreshPreview();
}

function calculatePreview() {
    const goal = getCurrentGoal();
    const maintenance = Number(document.getElementById("unified-maintenance")?.value);
    if (!goal || !Number.isFinite(maintenance) || maintenance <= 0) return null;
    const target = getRecommendedCalories(maintenance, goal);
    if (!Number.isFinite(target) || target <= 0) return null;
    return { goal, maintenance: Math.round(maintenance), target, metrics: getCurrentGoalMetrics(goal) };
}

function refreshAll() {
    hydrateMaintenance(false);
    refreshPreview();
    refreshPlannerSummary();
}

function refreshPreview() {
    const goal = getCurrentGoal();
    const summary = document.getElementById("unified-current-goal-summary");
    const plan = getNutritionPlan();

    if (!goal) {
        if (summary) summary.innerHTML = '<strong>No Current Goal</strong><small>Set your bodyweight goal in Progress → Weight first.</small>';
        setText("unified-weekly-target", "--");
        setText("unified-recommended-target", "--");
        setText("unified-active-target", Number.isFinite(plan.currentCalories) ? `${plan.currentCalories} kcal/day` : "--");
        document.getElementById("unified-save-plan")?.toggleAttribute("disabled", true);
        return;
    }

    const metrics = getCurrentGoalMetrics(goal);
    if (summary) {
        summary.innerHTML = `<strong>${escapeHtml(CURRENT_GOAL_TYPES[goal.type] || "Current Goal")}</strong><small>${Number(goal.targetWeight).toFixed(1)} lb target</small>`;
    }
    setText("unified-weekly-target", goal.type === "maintenance" ? "Maintain" : `${formatPct(goal.targetRatePctPerWeek)} · ≈ ${formatLbRate(metrics.targetRateLbPerWeek)}`);

    const preview = calculatePreview();
    setText("unified-recommended-target", preview ? `${preview.target} kcal/day` : "Enter maintenance");
    setText("unified-active-target", Number.isFinite(plan.currentCalories) ? `${plan.currentCalories} kcal/day` : "Not saved");
    document.getElementById("unified-save-plan")?.toggleAttribute("disabled", !preview);
}

function saveUnifiedPlan() {
    const profile = getNutritionProfile();
    if (!profile || !Number.isFinite(Number(profile.age)) || Number(profile.age) < 18) {
        setText("unified-calorie-message", "Save an adult Body Profile first.");
        return;
    }
    const preview = calculatePreview();
    if (!preview) {
        setText("unified-calorie-message", getCurrentGoal() ? "Enter a valid maintenance calorie value." : "Set a Current Goal in Progress → Weight first.");
        return;
    }

    const estimated = getEstimatedMaintenance();
    if (Number.isFinite(estimated) && preview.maintenance === estimated) localStorage.removeItem(MANUAL_MAINTENANCE_KEY);
    else localStorage.setItem(MANUAL_MAINTENANCE_KEY, String(preview.maintenance));

    syncCalculatedCalories(preview.target);
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));
    setText("unified-calorie-message", `Saved. ${preview.target} kcal/day is now the target used throughout Level Up.`);
    refreshAll();
}

function refreshPlannerSummary() {
    const goal = getCurrentGoal();
    const plan = getNutritionPlan();
    setText("planner-summary-goal", goal ? (CURRENT_GOAL_TYPES[goal.type] || "Current Goal") : "Not set");
    setText("planner-summary-goal-weight", goal && Number.isFinite(Number(goal.targetWeight)) ? `${Number(goal.targetWeight).toFixed(1)} lb` : "--");
    setText("planner-summary-calories", Number.isFinite(plan.currentCalories) ? `${plan.currentCalories} kcal` : "--");
}

function openWeightGoal() {
    document.querySelector('.nav-btn[data-page="progress"]')?.click();
    window.setTimeout(() => {
        const host = document.getElementById("current-goal-host");
        host?.scrollIntoView({ behavior: "smooth", block: "start" });
        host?.querySelector("[data-open-goal-wizard]")?.click();
    }, 140);
}

function formatPct(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    if (Math.abs(number) < 0.005) return "Maintain";
    return `${number > 0 ? "+" : "−"}${Math.abs(number).toFixed(2)}% / week`;
}

function formatLbRate(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    return `${number > 0 ? "+" : number < 0 ? "−" : ""}${Math.abs(number).toFixed(2)} lb/wk`;
}

function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
}
