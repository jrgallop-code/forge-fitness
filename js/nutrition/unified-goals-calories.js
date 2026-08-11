import { GOAL_PRESETS, calculateTdee } from "./tdee-calculator.js?v=unified-goals-1";
import { getNutritionProfile, getNutritionGoal, saveNutritionGoal, getNutritionPlan, syncCalculatedCalories } from "./nutrition-storage.js?v=unified-goals-1";

const MANUAL_MAINTENANCE_KEY = "level_up_manual_maintenance_calories";
const CUSTOM_WEEKLY_RATE_KEY = "level_up_custom_weekly_rate";

export function initializeUnifiedGoalsCalories() {
    const view = document.querySelector('[data-planner-view="goals"]');
    if (!view) return;

    document.getElementById("active-calorie-target-card")?.remove();
    const oldCard = view.querySelector(".goal-box.nutrition-goal-card");
    if (!oldCard) return;

    oldCard.id = "unified-goals-calories-card";
    oldCard.innerHTML = renderUnifiedCard();

    const savedGoal = getNutritionGoal();
    if (savedGoal?.goalId && GOAL_PRESETS[savedGoal.goalId]) {
        setValue("unified-goal-select", savedGoal.goalId);
    }

    hydrateMaintenance();
    hydrateCustomRate();
    refreshPreview();

    document.getElementById("unified-goal-select")?.addEventListener("change", refreshPreview);
    document.getElementById("unified-maintenance")?.addEventListener("input", refreshPreview);
    document.getElementById("unified-custom-rate")?.addEventListener("input", refreshPreview);
    document.getElementById("unified-use-estimate")?.addEventListener("click", useEstimatedMaintenance);
    document.getElementById("unified-save-plan")?.addEventListener("click", saveUnifiedPlan);

    window.addEventListener("levelup:nutrition-updated", () => {
        hydrateMaintenance(false);
        refreshPreview();
    });
}

function renderUnifiedCard() {
    return `
        <span class="eyebrow">CALORIE CALCULATOR</span>
        <h3>Set Your Calorie Target</h3>
        <p class="nutrition-message unified-calorie-intro">Choose your goal, then use Level Up's maintenance estimate or edit the maintenance value if you know your real-world number.</p>

        <label for="unified-goal-select">Goal</label>
        <select id="unified-goal-select">
            <option value="">Choose a goal</option>
            ${Object.entries(GOAL_PRESETS).map(([id, goal]) => `<option value="${id}">${goal.label}</option>`).join("")}
        </select>
        <p id="unified-goal-description" class="nutrition-message unified-goal-description"></p>

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
            <small class="unified-help">This editable number is the maintenance value used to calculate your calorie target.</small>
        </div>

        <details class="unified-calorie-advanced">
            <summary>Advanced weekly target</summary>
            <p>Optional. Leave blank to use the selected goal's standard rate.</p>
            <label for="unified-custom-rate">Custom weekly change (lb/week)</label>
            <input id="unified-custom-rate" type="number" step="0.05" placeholder="Example: -0.7">
        </details>

        <div class="unified-calorie-summary">
            <div><span>Daily Adjustment</span><strong id="unified-daily-adjustment">--</strong></div>
            <div><span>Weekly Target</span><strong id="unified-weekly-target">--</strong></div>
            <div class="unified-active-target"><span>Active Daily Target</span><strong id="unified-active-target">--</strong><small>This is the calorie value used throughout Level Up.</small></div>
        </div>

        <button id="unified-save-plan" class="primary-btn" type="button">Save Calorie Plan</button>
        <p id="unified-calorie-message" class="nutrition-message" aria-live="polite"></p>
        <small class="unified-adult-note">Adult-use estimate only. Use real-world weight trends and recovery to refine your target over time.</small>
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

function getStoredCustomRate() {
    const raw = localStorage.getItem(CUSTOM_WEEKLY_RATE_KEY);
    if (raw === null || raw === "") return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
}

function hydrateMaintenance(force = true) {
    const estimated = getEstimatedMaintenance();
    setText("unified-estimated-maintenance", Number.isFinite(estimated) ? `${estimated} kcal/day` : "Save Body Profile first");

    const input = document.getElementById("unified-maintenance");
    if (!input) return;
    if (!force && document.activeElement === input) return;
    const manual = getStoredManualMaintenance();
    input.value = Number.isFinite(manual) ? String(manual) : Number.isFinite(estimated) ? String(estimated) : "";
}

function hydrateCustomRate() {
    const input = document.getElementById("unified-custom-rate");
    if (!input) return;
    const custom = getStoredCustomRate();
    input.value = Number.isFinite(custom) ? String(custom) : "";
}

function useEstimatedMaintenance() {
    const estimated = getEstimatedMaintenance();
    if (!Number.isFinite(estimated)) {
        setText("unified-calorie-message", "Save your Body Profile first so Level Up can estimate maintenance.");
        return;
    }
    const input = document.getElementById("unified-maintenance");
    if (input) input.value = String(estimated);
    refreshPreview();
}

function getEffectiveRate(goalId) {
    const customInput = document.getElementById("unified-custom-rate");
    const raw = String(customInput?.value ?? "").trim();
    if (raw !== "") {
        const custom = Number(raw);
        if (Number.isFinite(custom)) return custom;
    }
    return GOAL_PRESETS[goalId]?.weeklyWeightChangeLb ?? null;
}

function calculatePreview() {
    const goalId = document.getElementById("unified-goal-select")?.value;
    const goal = GOAL_PRESETS[goalId];
    const maintenance = Number(document.getElementById("unified-maintenance")?.value);
    const rate = getEffectiveRate(goalId);
    if (!goal || !Number.isFinite(maintenance) || maintenance <= 0 || !Number.isFinite(rate)) return null;
    const dailyAdjustment = Math.round((rate * 3500) / 7);
    return {
        goalId,
        goal,
        maintenance: Math.round(maintenance),
        rate,
        dailyAdjustment,
        target: Math.round(maintenance + dailyAdjustment)
    };
}

function refreshPreview() {
    const goalId = document.getElementById("unified-goal-select")?.value;
    const goal = GOAL_PRESETS[goalId];
    setText("unified-goal-description", goal?.description || "Choose the goal that matches your current phase.");

    const preview = calculatePreview();
    if (!preview) {
        setText("unified-daily-adjustment", "--");
        setText("unified-weekly-target", "--");
        const plan = getNutritionPlan();
        setText("unified-active-target", Number.isFinite(plan.calculatedCalories) ? `${plan.calculatedCalories} kcal/day` : "--");
        return;
    }

    const sign = preview.dailyAdjustment > 0 ? "+" : "";
    const rateSign = preview.rate > 0 ? "+" : "";
    setText("unified-daily-adjustment", `${sign}${preview.dailyAdjustment} kcal/day`);
    setText("unified-weekly-target", `${rateSign}${preview.rate.toFixed(2).replace(/\.00$/, "")} lb/week`);
    setText("unified-active-target", `${preview.target} kcal/day`);
}

function saveUnifiedPlan() {
    const profile = getNutritionProfile();
    if (!profile || !Number.isFinite(Number(profile.age)) || Number(profile.age) < 18) {
        setText("unified-calorie-message", "Save an adult Body Profile first.");
        return;
    }

    const preview = calculatePreview();
    if (!preview) {
        setText("unified-calorie-message", "Choose a goal and enter a valid maintenance calorie value.");
        return;
    }

    const estimated = getEstimatedMaintenance();
    if (Number.isFinite(estimated) && preview.maintenance === estimated) {
        localStorage.removeItem(MANUAL_MAINTENANCE_KEY);
    } else {
        localStorage.setItem(MANUAL_MAINTENANCE_KEY, String(preview.maintenance));
    }

    const customRaw = String(document.getElementById("unified-custom-rate")?.value ?? "").trim();
    if (customRaw === "") {
        localStorage.removeItem(CUSTOM_WEEKLY_RATE_KEY);
    } else {
        localStorage.setItem(CUSTOM_WEEKLY_RATE_KEY, String(preview.rate));
    }

    saveNutritionGoal({ goalId: preview.goalId, updatedAt: new Date().toISOString() });
    syncCalculatedCalories(preview.target);
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));
    setText("unified-calorie-message", `Saved. ${preview.target} kcal/day is now the active target used throughout Level Up.`);
    refreshPreview();
}

function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
}

function setValue(id, value) {
    const node = document.getElementById(id);
    if (node) node.value = value ?? "";
}
