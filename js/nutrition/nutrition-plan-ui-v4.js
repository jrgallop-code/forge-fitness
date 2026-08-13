import { calculateMacroTargets, poundsToKg } from "./tdee-calculator.js?v=phase-tolerance-1";
import { getNutritionProfile, getNutritionMacroPreference, getNutritionPlan, setCurrentCalories } from "./nutrition-storage.js?v=phase-tolerance-1";
import { getActiveNutritionPhase, getActivePhaseMetrics, saveNutritionPhase } from "./nutrition-phase.js?v=phase-tolerance-1";

const FULL_GAP_INCREMENT = 50;
const FIRST_STEP_FRACTION = 0.5;
const FIRST_STEP_INCREMENT = 25;
const REASSESSMENT_DAYS = 21;
const REASSESSMENT_HOLD_KEY = "level_up_phase_reassessment_hold";

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
            <div class="goal-check-in-heading"><h3 id="goal-check-in-status">NEED MORE PHASE DATA</h3><small id="goal-check-in-confidence"></small></div>
            <p id="goal-check-in-message" class="nutrition-message">Start a nutrition phase and log weight consistently to begin.</p>
            <strong id="goal-check-in-suggested"></strong>
            <div class="nutrition-target-actions">
                <button id="goal-check-in-apply" class="primary-btn" type="button" hidden>Apply First Adjustment</button>
                <button id="goal-check-in-keep" class="secondary-btn" type="button">Keep Current Target</button>
            </div>
        </article>`);
    document.getElementById("goal-check-in-keep")?.addEventListener("click", () => {
        const calories = getActiveCalories();
        setText("goal-check-in-message", Number.isFinite(calories) ? `Keep calories at ${calories} kcal/day.` : "No calorie target is saved yet.");
        hideApply();
    });
}

function refreshNutritionPlanUI() {
    removeLegacyPlanUI(); ensureGoalCheckInUI();
    const profile = getNutritionProfile();
    const calories = getActiveCalories();
    refreshMacrosFromCurrentTarget(profile, calories);
    refreshGoalCheckIn();
}

function getActiveCalories() {
    const phase = getActiveNutritionPhase();
    const phaseCalories = Number(phase?.currentCalories ?? phase?.startCalories);
    if (Number.isFinite(phaseCalories) && phaseCalories > 0) return Math.round(phaseCalories);
    const plan = getNutritionPlan();
    const planCalories = Number(plan.currentCalories);
    return Number.isFinite(planCalories) && planCalories > 0 ? Math.round(planCalories) : null;
}

function refreshMacrosFromCurrentTarget(profile, calories) {
    if (!isAdultProfile(profile) || !Number.isFinite(calories)) return;
    const macroPreference = getNutritionMacroPreference()?.macroPreset || "balanced";
    const weightLb = Number(profile.weightLb);
    if (!Number.isFinite(weightLb) || weightLb <= 0) return;
    const macros = calculateMacroTargets({ calories, weightKg: poundsToKg(weightLb), macroPreset: macroPreference });
    if (!macros) return;
    setText("nutrition-protein-target", `${macros.protein} g/day`); setText("nutrition-carb-target", `${macros.carbs} g/day`);
    setText("nutrition-fat-target", `${macros.fat} g/day`); setText("nutrition-macro-calories", `${macros.calories} kcal/day`);
    setText("planner-summary-calories", `${calories} kcal`); setText("planner-summary-protein", `${macros.protein} g`);
}

function refreshGoalCheckIn() {
    const phase = getActiveNutritionPhase();
    if (!phase) {
        setText("goal-check-in-status", "NO ACTIVE PHASE"); setText("goal-check-in-confidence", "");
        setText("goal-check-in-message", "Start a phase above. Trend analysis will begin from that phase's start date.");
        setText("goal-check-in-suggested", ""); hideApply(); return;
    }

    const metrics = getActivePhaseMetrics(phase);
    const trend = metrics.trend;
    setText("goal-check-in-status", metrics.status);

    const confidence = trend?.status === "actual"
        ? `Established · ${trend.windowEntries} weigh-ins / ${trend.windowDays} days`
        : trend?.status === "preliminary"
            ? `Preliminary · ${trend.windowEntries} weigh-ins / ${trend.windowDays} days`
            : `Need more phase data · ${trend?.windowEntries || 0} weigh-ins / ${trend?.windowDays || 0} days`;
    setText("goal-check-in-confidence", confidence);

    if (metrics.status === "NEED MORE PHASE DATA" || !Number.isFinite(metrics.actualRateLbPerWeek)) {
        setText("goal-check-in-message", "There is not enough weight data from this phase yet to estimate a reliable weekly rate.");
        setText("goal-check-in-suggested", ""); hideApply(); return;
    }

    const actual = Number(metrics.actualRateLbPerWeek);
    const target = Number(metrics.targetRateLbPerWeek);
    const currentCalories = getActiveCalories();

    if (metrics.status === "PRELIMINARY") {
        setText("goal-check-in-message", `Preliminary phase rate: ${formatRate(actual)}. Level Up waits for at least 14 days and enough weigh-ins before judging the phase.`);
        setText("goal-check-in-suggested", ""); hideApply(); return;
    }

    if (["ON TRACK", "MAINTAINING"].includes(metrics.status)) {
        const statusCopy = metrics.status === "MAINTAINING" ? "Your trend is within the maintenance range." : "Your trend is within the phase target range.";
        setText("goal-check-in-message", `${statusCopy} Actual: ${formatRate(actual)} · Target: ${formatRate(target)}. ${Number.isFinite(currentCalories) ? `Keep calories at ${currentCalories} kcal/day.` : "Save a calorie target when you're ready."}`);
        setText("goal-check-in-suggested", ""); hideApply(); return;
    }

    const reassessment = getReassessmentWait(phase, currentCalories);
    if (reassessment) {
        setText("goal-check-in-message", "The 50% first adjustment is active. Hold the current target long enough to measure the response before making another change.");
        setText("goal-check-in-suggested", `Current target: ${currentCalories} kcal/day · Reassess in ${reassessment.daysRemaining} day${reassessment.daysRemaining === 1 ? "" : "s"}.`);
        hideApply(); return;
    }

    if (!metrics.recommendationReady) {
        setText("goal-check-in-message", `Actual: ${formatRate(actual)} · Target: ${formatRate(target)}. The trend is ${statusPhrase(metrics.status)}, but Level Up waits for a full 21-day phase window before suggesting a calorie change.`);
        setText("goal-check-in-suggested", ""); hideApply(); return;
    }

    if (!Number.isFinite(currentCalories) || !Number.isFinite(target)) { hideApply(); return; }

    const recommendation = buildCalorieRecommendation({ actual, target, currentCalories });
    setText("goal-check-in-message", `Actual: ${formatRate(actual)} · Target: ${formatRate(target)}. The full estimated calorie gap is shown below; Level Up applies 50% first, then reassesses the phase trend.`);
    setText("goal-check-in-suggested", `Estimated target: ${recommendation.estimatedTargetCalories} kcal/day · Gap ${formatSignedCalories(recommendation.fullGapCalories)} kcal/day · First step ${formatSignedCalories(recommendation.firstStepDelta)} kcal/day → ${recommendation.firstStepCalories} kcal/day.`);

    const apply = document.getElementById("goal-check-in-apply");
    if (apply) {
        apply.hidden = false;
        apply.textContent = `Apply ${formatSignedCalories(recommendation.firstStepDelta)} kcal/day`;
        apply.onclick = () => {
            saveNutritionPhase({ goalId: phase.goalId, maintenanceCalories: phase.maintenanceCalories, targetCalories: recommendation.firstStepCalories });
            setCurrentCalories(recommendation.firstStepCalories, "50% phase calorie-gap adjustment");
            saveReassessmentHold({ phaseId: phase.id, calories: recommendation.firstStepCalories, estimatedTargetCalories: recommendation.estimatedTargetCalories });
            setText("goal-check-in-message", `Applied the 50% first step (${formatSignedCalories(recommendation.firstStepDelta)} kcal/day). New target: ${recommendation.firstStepCalories} kcal/day. The ${phase.label || "current"} phase start date and target rate are unchanged.`);
            setText("goal-check-in-suggested", `Estimated target before reassessment: ${recommendation.estimatedTargetCalories} kcal/day. Hold ${recommendation.firstStepCalories} kcal/day for the next 21-day assessment window.`); hideApply();
        };
    }
}

function buildCalorieRecommendation({ actual, target, currentCalories }) {
    const rawGap = (Number(target) - Number(actual)) * (3500 / 7);
    let fullGapCalories = Math.round(rawGap / FULL_GAP_INCREMENT) * FULL_GAP_INCREMENT;
    if (fullGapCalories === 0 && Math.abs(rawGap) > 0.001) fullGapCalories = Math.sign(rawGap) * FULL_GAP_INCREMENT;
    const estimatedTargetCalories = Math.max(1, Math.round(Number(currentCalories) + fullGapCalories));
    let firstStepDelta = Math.round((fullGapCalories * FIRST_STEP_FRACTION) / FIRST_STEP_INCREMENT) * FIRST_STEP_INCREMENT;
    if (firstStepDelta === 0 && fullGapCalories !== 0) firstStepDelta = Math.sign(fullGapCalories) * FIRST_STEP_INCREMENT;
    const firstStepCalories = Math.max(1, Math.round(Number(currentCalories) + firstStepDelta));
    return { fullGapCalories, estimatedTargetCalories, firstStepDelta, firstStepCalories };
}

function saveReassessmentHold({ phaseId, calories, estimatedTargetCalories }) {
    localStorage.setItem(REASSESSMENT_HOLD_KEY, JSON.stringify({ phaseId, calories, estimatedTargetCalories, appliedAt: new Date().toISOString() }));
}

function getReassessmentWait(phase, currentCalories) {
    let hold;
    try { hold = JSON.parse(localStorage.getItem(REASSESSMENT_HOLD_KEY) || "null"); }
    catch { hold = null; }
    if (!hold || hold.phaseId !== phase?.id) return null;
    if (Math.round(Number(hold.calories)) !== Math.round(Number(currentCalories))) {
        localStorage.removeItem(REASSESSMENT_HOLD_KEY);
        return null;
    }
    const time = new Date(hold.appliedAt).getTime();
    if (!Number.isFinite(time)) {
        localStorage.removeItem(REASSESSMENT_HOLD_KEY);
        return null;
    }
    const daysElapsed = Math.max(0, Math.floor((Date.now() - time) / 86400000));
    if (daysElapsed >= REASSESSMENT_DAYS) {
        localStorage.removeItem(REASSESSMENT_HOLD_KEY);
        return null;
    }
    return { daysElapsed, daysRemaining: REASSESSMENT_DAYS - daysElapsed, estimatedTargetCalories: Number(hold.estimatedTargetCalories) || null };
}

function formatSignedCalories(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    if (Math.abs(number) < 0.5) return "0";
    return `${number > 0 ? "+" : "−"}${Math.abs(Math.round(number))}`;
}

function statusPhrase(status) {
    if (status === "SLIGHTLY SLOWER") return "slightly slower than target";
    if (status === "SLIGHTLY FASTER") return "slightly faster than target";
    if (status === "TRENDING UP") return "trending up outside the maintenance range";
    if (status === "TRENDING DOWN") return "trending down outside the maintenance range";
    if (status === "NEEDS ATTENTION") return "outside the target range";
    return "outside the target range";
}

function formatRate(value) {
    if (value === null || value === undefined || value === "") return "--";
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(2)} lb/week`;
}

function hideApply(){const b=document.getElementById("goal-check-in-apply");if(b){b.hidden=true;b.onclick=null}}
function isAdultProfile(p){return Boolean(p&&Number.isFinite(Number(p.age))&&Number(p.age)>=18)}
function setText(id,value){const node=document.getElementById(id);if(node)node.textContent=value}
