import { calculateMacroTargets, poundsToKg } from "./tdee-calculator.js?v=nutrition-phase-1";
import { getNutritionProfile, getNutritionMacroPreference, getNutritionPlan, setCurrentCalories } from "./nutrition-storage.js?v=nutrition-phase-1";
import { getActiveNutritionPhase, getActivePhaseMetrics, saveNutritionPhase } from "./nutrition-phase.js?v=nutrition-phase-1";

const MIN_ADJUSTMENT_KCAL = 100;
const MAX_ADJUSTMENT_KCAL = 200;

export function initializeNutritionPlanUI() {
    removeLegacyPlanUI();
    ensureGoalCheckInUI();
    refreshNutritionPlanUI();
    window.addEventListener("levelup:nutrition-updated", refreshNutritionPlanUI);
    window.addEventListener("levelup:nutrition-phase-updated", refreshNutritionPlanUI);
    document.getElementById("save-nutrition-profile-btn")?.addEventListener("click", () => window.setTimeout(refreshNutritionPlanUI, 30));
}

function removeLegacyPlanUI() {
    document.getElementById("active-calorie-target-card")?.remove();
    document.querySelector('[data-nutrition-view="coach"]')?.remove();
    document.querySelector('[data-planner-view="coach"]')?.remove();
}

function ensureGoalCheckInUI() {
    const goalsView = document.querySelector('[data-planner-view="goals"]');
    if (!goalsView || document.getElementById("goal-check-in-card")) return;
    goalsView.insertAdjacentHTML("beforeend", `
        <article id="goal-check-in-card" class="goal-box nutrition-goal-card goal-check-in-card">
            <span class="eyebrow">PHASE CHECK-IN</span>
            <div class="goal-check-in-heading"><h3 id="goal-check-in-status">CALIBRATING</h3><small id="goal-check-in-confidence"></small></div>
            <p id="goal-check-in-message" class="nutrition-message">Start a nutrition phase and log weight consistently to begin.</p>
            <strong id="goal-check-in-suggested"></strong>
            <div class="nutrition-target-actions">
                <button id="goal-check-in-apply" class="primary-btn" type="button" hidden>Apply Suggested Target</button>
                <button id="goal-check-in-keep" class="secondary-btn" type="button">Keep Current Target</button>
            </div>
        </article>`);
    document.getElementById("goal-check-in-keep")?.addEventListener("click", () => {
        const plan = getNutritionPlan();
        setText("goal-check-in-message", Number.isFinite(plan.currentCalories) ? `Keep calories at ${plan.currentCalories} kcal/day.` : "No calorie target is saved yet.");
        hideApply();
    });
}

function refreshNutritionPlanUI() {
    removeLegacyPlanUI(); ensureGoalCheckInUI();
    const profile = getNutritionProfile(); const plan = getNutritionPlan();
    refreshMacrosFromCurrentTarget(profile, plan); refreshGoalCheckIn(plan);
}

function refreshMacrosFromCurrentTarget(profile, plan) {
    if (!isAdultProfile(profile) || !Number.isFinite(plan.currentCalories)) return;
    const macroPreference = getNutritionMacroPreference()?.macroPreset || "balanced";
    const weightLb = Number(profile.weightLb);
    if (!Number.isFinite(weightLb) || weightLb <= 0) return;
    const macros = calculateMacroTargets({ calories: plan.currentCalories, weightKg: poundsToKg(weightLb), macroPreset: macroPreference });
    if (!macros) return;
    setText("nutrition-protein-target", `${macros.protein} g/day`); setText("nutrition-carb-target", `${macros.carbs} g/day`);
    setText("nutrition-fat-target", `${macros.fat} g/day`); setText("nutrition-macro-calories", `${macros.calories} kcal/day`);
    setText("planner-summary-calories", `${plan.currentCalories} kcal`); setText("planner-summary-protein", `${macros.protein} g`);
}

function refreshGoalCheckIn(plan) {
    const phase = getActiveNutritionPhase();
    if (!phase) {
        setText("goal-check-in-status", "NO ACTIVE PHASE"); setText("goal-check-in-confidence", "");
        setText("goal-check-in-message", "Start a phase above. Trend analysis will begin from that phase's start date.");
        setText("goal-check-in-suggested", ""); hideApply(); return;
    }
    const metrics = getActivePhaseMetrics(phase); const trend = metrics.trend;
    setText("goal-check-in-status", metrics.status);
    const confidence = trend?.status === "actual" ? `Established · ${trend.windowEntries} weigh-ins / ${trend.windowDays} days` : trend?.status === "preliminary" ? `Preliminary · ${trend.windowEntries} weigh-ins / ${trend.windowDays} days` : "Collecting phase data";
    setText("goal-check-in-confidence", confidence);

    if (trend?.status !== "actual" || !Number.isFinite(metrics.actualRateLbPerWeek)) {
        const preliminary = Number.isFinite(metrics.actualRateLbPerWeek) ? ` Preliminary rate: ${formatRate(metrics.actualRateLbPerWeek)}.` : "";
        setText("goal-check-in-message", `Level Up waits for an established trend from this phase before suggesting a calorie change.${preliminary}`);
        setText("goal-check-in-suggested", ""); hideApply(); return;
    }

    const actual = Number(metrics.actualRateLbPerWeek); const target = Number(metrics.targetRateLbPerWeek); const currentCalories = Number(plan.currentCalories);
    if (["ON TRACK", "MAINTAINING"].includes(metrics.status)) {
        setText("goal-check-in-message", `This phase is tracking at ${formatRate(actual)} against ${formatRate(target)}. ${Number.isFinite(currentCalories) ? `Keep calories at ${currentCalories} kcal/day.` : "Save a calorie target when you're ready."}`);
        setText("goal-check-in-suggested", ""); hideApply(); return;
    }
    if (!Number.isFinite(currentCalories) || !Number.isFinite(target)) { hideApply(); return; }

    const difference = actual - target;
    const direction = difference > 0 ? -1 : 1;
    const adjustment = calculateSuggestedAdjustment(difference);
    const suggested = Math.max(1, Math.round(currentCalories + direction * adjustment));
    setText("goal-check-in-message", `Actual rate is ${formatRate(actual)} versus the phase target of ${formatRate(target)}. This suggestion changes calories without starting a new phase.`);
    setText("goal-check-in-suggested", `Suggested calorie target: ${suggested} kcal/day`);
    const apply = document.getElementById("goal-check-in-apply");
    if (apply) {
        apply.hidden = false; apply.textContent = `Apply ${suggested}`;
        apply.onclick = () => {
            saveNutritionPhase({ goalId: phase.goalId, maintenanceCalories: phase.maintenanceCalories, targetCalories: suggested });
            setCurrentCalories(suggested, "Nutrition phase check-in recommendation");
            setText("goal-check-in-message", `Applied. Calories are now ${suggested} kcal/day and the ${phase.label || "current"} phase start date is unchanged.`);
            setText("goal-check-in-suggested", ""); hideApply();
        };
    }
}

function calculateSuggestedAdjustment(diffLbPerWeek) {
    const implied = Math.abs(Number(diffLbPerWeek)) * 3500 / 7;
    const rounded = Math.round(implied / 50) * 50;
    return Math.min(MAX_ADJUSTMENT_KCAL, Math.max(MIN_ADJUSTMENT_KCAL, rounded || MIN_ADJUSTMENT_KCAL));
}
function formatRate(v){const n=Number(v);if(!Number.isFinite(n))return"--";if(Math.abs(n)<.005)return"Maintain";return`${n>0?"+":"−"}${Math.abs(n).toFixed(2).replace(/0$/,"")} lb/week`}
function hideApply(){const b=document.getElementById("goal-check-in-apply");if(b){b.hidden=true;b.onclick=null}}
function isAdultProfile(p){return Boolean(p&&Number.isFinite(Number(p.age))&&Number(p.age)>=18)}
function setText(id,value){const node=document.getElementById(id);if(node)node.textContent=value}
