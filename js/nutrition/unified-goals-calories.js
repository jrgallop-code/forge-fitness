import { GOAL_PRESETS, calculateTdee } from "./tdee-calculator.js?v=nutrition-phase-1";
import { getNutritionProfile, getNutritionGoal, saveNutritionGoal, getNutritionPlan, syncCalculatedCalories } from "./nutrition-storage.js?v=nutrition-phase-1";
import { getActiveNutritionPhase, getNutritionPhaseHistory, getActivePhaseMetrics, getPhaseDayNumber, saveNutritionPhase } from "./nutrition-phase.js?v=nutrition-phase-1";
import { getCalculatedMaintenanceEstimate } from "./calculated-maintenance.js?v=tdee-food-window-1";
import { clearPendingMaintenanceReview, getMaintenanceUpdateMode, markMaintenanceCheckInReviewed, readPendingMaintenanceReview, setMaintenanceUpdateMode } from "./maintenance-check-in.js?v=coordinated-weekly-calories-1";
import { buildCoordinatedWeeklyUpdate, markPhaseCheckHandled, startAdjustmentHold } from "./calorie-adjustment-coordinator.js?v=coordinated-weekly-calories-1";

const MANUAL_MAINTENANCE_KEY = "level_up_manual_maintenance_calories";
const LEGACY_CUSTOM_WEEKLY_RATE_KEY = "level_up_custom_weekly_rate";
let maintenanceDraft = null;
let targetDraft = null;
let pendingAdaptiveCheckDay = null;

export function initializeUnifiedGoalsCalories() {
    const view = document.querySelector('[data-planner-view="goals"]');
    if (!view) return;
    retireDuplicateGoalInterfaces(view);
    const oldCard = view.querySelector(".goal-box.nutrition-goal-card");
    if (!oldCard) return;

    oldCard.id = "unified-goals-calories-card";
    oldCard.innerHTML = renderUnifiedCard();
    const activePhase = getActiveNutritionPhase();
    const savedGoal = getNutritionGoal();
    const initialGoalId = activePhase?.goalId || savedGoal?.goalId;
    if (initialGoalId && GOAL_PRESETS[initialGoalId]) setValue("unified-goal-select", initialGoalId);

    hydrateMaintenance();
    refreshAll();
    document.getElementById("unified-goal-select")?.addEventListener("change", () => {
        targetDraft = null;
        pendingAdaptiveCheckDay = null;
        refreshAll();
    });
    document.getElementById("unified-maintenance")?.addEventListener("input", event => {
        maintenanceDraft = event.currentTarget.value;
        targetDraft = null;
        pendingAdaptiveCheckDay = null;
        refreshAll();
    });
    document.getElementById("unified-use-estimate")?.addEventListener("click", useEstimatedMaintenance);
    document.getElementById("unified-use-calculated")?.addEventListener("click", useCalculatedMaintenance);
    document.getElementById("unified-maintenance-mode")?.addEventListener("change", event => {
        setMaintenanceUpdateMode(event.currentTarget.value);
        refreshMaintenanceMode();
    });
    document.getElementById("unified-save-plan")?.addEventListener("click", saveUnifiedPlan);
    document.getElementById("save-nutrition-profile-btn")?.addEventListener("click", () => window.setTimeout(refreshAll, 30));
    window.addEventListener("levelup:nutrition-updated", refreshAll);
    window.addEventListener("levelup:nutrition-phase-updated", refreshAll);
    hydratePendingMaintenanceReview();
    refreshMaintenanceMode();
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
    if (eyebrow) eyebrow.textContent = "GOALS & CALORIES";
    if (heading) heading.textContent = "Your Nutrition Phase";
    if (description) description.textContent = "Your phase defines the rate you are aiming for. Changing the phase starts a new tracking period; calorie adjustments stay inside the current phase.";
}

function renderUnifiedCard() {
    return `
        <div id="nutrition-current-phase" class="nutrition-current-phase"></div>
        <span class="eyebrow">PHASE & CALORIES</span>
        <h3>Set Your Phase</h3>
        <p class="nutrition-message unified-calorie-intro">Choose the phase that matches your current goal. A different phase or rate starts a new phase today.</p>
        <label for="unified-goal-select">Phase</label>
        <select id="unified-goal-select">
            <option value="">Choose a phase</option>
            ${Object.entries(GOAL_PRESETS).map(([id, goal]) => `<option value="${id}">${goal.label}</option>`).join("")}
        </select>
        <p id="unified-goal-description" class="nutrition-message unified-goal-description"></p>
        <div class="unified-maintenance-block">
            <div class="unified-maintenance-heading">
                <div><span>Body Profile TDEE Formula</span><strong id="unified-estimated-maintenance">--</strong></div>
                <small>Generic starting estimate from your age, body size and activity—not your logged results.</small>
            </div>
            <div class="unified-calculated-maintenance">
                <div><span>Level Up Calculated TDEE</span><strong id="unified-calculated-maintenance">Not enough data</strong><small id="unified-calculated-maintenance-meta">Uses your actual food logs and weight trend</small><em id="unified-calculated-action-status" aria-live="polite"></em></div>
                <button id="unified-use-calculated" class="secondary-btn" type="button" disabled>Use Level Up TDEE</button>
            </div>
            <p class="unified-maintenance-choice-note"><strong>Which number should I use?</strong> The formula is a starting point. The Level Up estimate becomes more personalized as you log food and weight.</p>
            <div class="unified-maintenance-mode">
                <label for="unified-maintenance-mode">Maintenance update preference</label>
                <select id="unified-maintenance-mode">
                    <option value="review">Ask before adjusting — Recommended</option>
                    <option value="automatic">Adjust automatically</option>
                    <option value="track">Track only</option>
                </select>
                <small id="unified-maintenance-mode-help"></small>
            </div>
            <label for="unified-maintenance">Maintenance Used for Your Plan</label>
            <div class="unified-maintenance-input-row">
                <input id="unified-maintenance" type="number" inputmode="numeric" min="1" step="10" placeholder="Save Body Profile first">
                <button id="unified-use-estimate" class="secondary-btn" type="button">Use Formula Estimate</button>
            </div>
            <small class="unified-help">Changing this calorie baseline does not start a new phase unless you also change the phase/rate.</small>
        </div>
        <div class="unified-calorie-summary">
            <div><span>Daily Adjustment</span><strong id="unified-daily-adjustment">--</strong></div>
            <div><span>Target Rate</span><strong id="unified-weekly-target">--</strong></div>
            <div class="unified-active-target"><span>Planned Daily Target</span><strong id="unified-active-target">--</strong><small>This becomes the active Level Up calorie target when saved.</small></div>
        </div>
        <button id="unified-save-plan" class="primary-btn" type="button">Save</button>
        <p id="unified-calorie-message" class="nutrition-message" aria-live="polite"></p>
        <div id="nutrition-phase-history"></div>
        <small class="unified-adult-note">Weight trend checks use only weigh-ins from the start of the active phase.</small>
    `;
}

function getEstimatedMaintenance() {
    const profile = getNutritionProfile();
    if (!profile || !Number.isFinite(Number(profile.age)) || Number(profile.age) < 18) return null;
    try { const value = Number(calculateTdee(profile).tdee); return Number.isFinite(value) && value > 0 ? Math.round(value) : null; }
    catch { return null; }
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
    const active = getActiveNutritionPhase();
    const manual = getStoredManualMaintenance();
    input.value = maintenanceDraft !== null ? String(maintenanceDraft) : Number.isFinite(Number(active?.maintenanceCalories)) ? String(active.maintenanceCalories) : Number.isFinite(manual) ? String(manual) : Number.isFinite(estimated) ? String(estimated) : "";
}

function useEstimatedMaintenance() {
    const estimated = getEstimatedMaintenance();
    if (!Number.isFinite(estimated)) { setText("unified-calorie-message", "Save your Body Profile first so Level Up can estimate maintenance."); return; }
    const input = document.getElementById("unified-maintenance");
    maintenanceDraft = String(estimated);
    targetDraft = null;
    pendingAdaptiveCheckDay = null;
    if (input) input.value = maintenanceDraft;
    refreshAll();
}

function calculatedMaintenance() {
    return getCalculatedMaintenanceEstimate(getEstimatedMaintenance());
}

function hydratePendingMaintenanceReview() {
    const pending = readPendingMaintenanceReview();
    const value = Number(pending?.coordinatedUpdate?.maintenanceCalories ?? pending?.maintenanceCalories);
    if (!Number.isFinite(value) || value <= 0) return;
    maintenanceDraft = String(Math.round(value));
    const pendingTarget = Number(pending?.coordinatedUpdate?.targetCalories ?? pending?.proposedTarget);
    targetDraft = Number.isFinite(pendingTarget) && pendingTarget > 0 ? Math.round(pendingTarget) : null;
    pendingAdaptiveCheckDay = Number.isFinite(Number(pending?.adaptiveCheckDay)) ? Number(pending.adaptiveCheckDay) : null;
    const input = document.getElementById("unified-maintenance");
    if (input) input.value = maintenanceDraft;
    refreshPreview();
    setText("unified-calculated-action-status", "Weekly recommendation added below for review.");
    setText("unified-calorie-message", "Review the updated daily target, then press Save to apply it.");
}

function refreshMaintenanceMode() {
    const mode = getMaintenanceUpdateMode();
    setValue("unified-maintenance-mode", mode);
    const messages = {
        review: "Level Up combines the new maintenance estimate with your Adaptive Coach pace check, then asks before making one weekly change.",
        automatic: "High-confidence maintenance and coach updates are combined into one weekly change, capped at 150 calories, with Undo. Early estimates still require review.",
        track: "Calculated TDEE remains visible, but Level Up will not alert you or adjust your target."
    };
    setText("unified-maintenance-mode-help", messages[mode] || messages.review);
}

function refreshCalculatedMaintenance() {
    const estimate = calculatedMaintenance();
    setText("unified-calculated-maintenance", Number.isFinite(estimate.maintenanceCalories) ? `${estimate.maintenanceCalories} kcal/day` : estimate.label);
    setText("unified-calculated-maintenance-meta", Number.isFinite(estimate.maintenanceCalories)
        ? `${estimate.label} · based on ${estimate.foodDays} food days and ${estimate.weighIns} weigh-ins`
        : `${estimate.foodDays}/2 food days · ${estimate.weighIns}/3 weigh-ins · a multi-day weight span is required`);
    const button = document.getElementById("unified-use-calculated");
    button?.toggleAttribute("disabled", !Number.isFinite(estimate.maintenanceCalories));
    if (button && button.textContent !== "Added below ✓") button.textContent = "Use Level Up TDEE";
}

function useCalculatedMaintenance() {
    const estimate = calculatedMaintenance();
    if (!Number.isFinite(estimate.maintenanceCalories)) {
        setText("unified-calculated-action-status", "Add at least two complete food days and a multi-day weight trend first.");
        return;
    }
    const input = document.getElementById("unified-maintenance");
    const active = getActiveNutritionPhase();
    const currentTarget = Number(active?.currentCalories ?? active?.startCalories);
    const metrics = active ? getActivePhaseMetrics(active, { rolling: true }) : null;
    const coordinated = active ? buildCoordinatedWeeklyUpdate({
        currentMaintenance: active.maintenanceCalories,
        proposedMaintenance: estimate.maintenanceCalories,
        currentTarget,
        actualRate: metrics?.actualRateLbPerWeek,
        targetRate: metrics?.targetRateLbPerWeek,
        adaptiveReady: Boolean(metrics?.recommendationReady)
    }) : null;
    maintenanceDraft = String(coordinated?.maintenanceCalories ?? estimate.maintenanceCalories);
    targetDraft = coordinated?.targetCalories ?? null;
    pendingAdaptiveCheckDay = Number.isFinite(Number(metrics?.trend?.checkDay)) ? Number(metrics.trend.checkDay) : null;
    if (input) {
        input.value = maintenanceDraft;
        refreshPreview();
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.classList.add("is-level-up-estimate");
        window.setTimeout(() => input.classList.remove("is-level-up-estimate"), 1400);
    }
    const button = document.getElementById("unified-use-calculated");
    if (button) button.textContent = "Added below ✓";
    setText("unified-calculated-action-status", "Added to the shared weekly review. Maintenance is updated first, then the coach correction is applied within the 150-calorie cap.");
    setText("unified-calorie-message", "Review the coordinated target below, then press Save. It has not changed your active target yet.");
}

function calculatePreview() {
    const goalId = document.getElementById("unified-goal-select")?.value;
    const goal = GOAL_PRESETS[goalId];
    const maintenance = Number(document.getElementById("unified-maintenance")?.value);
    if (!goal || !Number.isFinite(maintenance) || maintenance <= 0) return null;
    const active = getActiveNutritionPhase();
    const useCoordinatedTarget = targetDraft !== null && active?.goalId === goalId;
    const target = useCoordinatedTarget ? Math.round(targetDraft) : Math.round(maintenance + goal.dailyCalorieAdjustment);
    return { goalId, goal, maintenance: Math.round(maintenance), rate: goal.weeklyWeightChangeLb, dailyAdjustment: target - Math.round(maintenance), target };
}

function refreshAll() {
    hydrateMaintenance(false);
    refreshCalculatedMaintenance();
    refreshCurrentPhase();
    refreshPreview();
    refreshPlannerSummary();
    renderPhaseHistory();
}

function refreshCurrentPhase() {
    const host = document.getElementById("nutrition-current-phase");
    if (!host) return;
    const phase = getActiveNutritionPhase();
    if (!phase) {
        host.innerHTML = `<div><span>Current Phase</span><strong>None started</strong></div><small>Choose a phase below to begin a clean tracking period.</small>`;
        return;
    }
    const metrics = getActivePhaseMetrics(phase);
    const day = getPhaseDayNumber(phase);
    const target = Number(phase.targetWeeklyRate);
    const actual = metrics.actualRateLbPerWeek;
    host.innerHTML = `
        <div class="nutrition-current-phase-head"><div><span>Current Phase</span><strong>${escapeHtml(phase.label || GOAL_PRESETS[phase.goalId]?.label || "Phase")}</strong></div><b>${escapeHtml(metrics.status)}</b></div>
        <div class="nutrition-current-phase-grid">
            <div><span>Started</span><strong>${formatDate(phase.startDate)}${day ? ` · Day ${day}` : ""}</strong></div>
            <div><span>Target Rate</span><strong>${formatRate(target)}</strong></div>
            <div><span>Actual Since Start</span><strong>${Number.isFinite(actual) ? formatRate(actual) : "Calibrating"}</strong></div>
            <div><span>Current Calories</span><strong>${Number(phase.currentCalories || phase.startCalories) || "--"} kcal/day</strong></div>
        </div>`;
}

function refreshPreview() {
    const goalId = document.getElementById("unified-goal-select")?.value;
    const goal = GOAL_PRESETS[goalId];
    const active = getActiveNutritionPhase();
    setText("unified-goal-description", goal?.description || "Choose the phase that matches your current intention.");
    const preview = calculatePreview();
    if (!preview) {
        setText("unified-daily-adjustment", "--"); setText("unified-weekly-target", "--");
        const plan = getNutritionPlan();
        setText("unified-active-target", Number.isFinite(plan.calculatedCalories) ? `${plan.calculatedCalories} kcal/day` : "--");
        document.getElementById("unified-save-plan")?.toggleAttribute("disabled", true); return;
    }
    setText("unified-daily-adjustment", `${preview.dailyAdjustment > 0 ? "+" : ""}${preview.dailyAdjustment} kcal/day`);
    setText("unified-weekly-target", formatRate(preview.rate));
    setText("unified-active-target", `${preview.target} kcal/day`);
    const button = document.getElementById("unified-save-plan");
    if (button) button.textContent = active && active.goalId === preview.goalId ? "Save Calorie Adjustment" : active ? "Start New Phase" : "Start Phase";
    button?.toggleAttribute("disabled", false);
}

function saveUnifiedPlan() {
    const profile = getNutritionProfile();
    if (!profile || !Number.isFinite(Number(profile.age)) || Number(profile.age) < 18) { setText("unified-calorie-message", "Save an adult Body Profile first."); return; }
    const preview = calculatePreview();
    if (!preview) { setText("unified-calorie-message", "Choose a phase and enter a valid maintenance calorie value."); return; }
    const estimated = getEstimatedMaintenance();
    if (Number.isFinite(estimated) && preview.maintenance === estimated) localStorage.removeItem(MANUAL_MAINTENANCE_KEY); else localStorage.setItem(MANUAL_MAINTENANCE_KEY, String(preview.maintenance));
    localStorage.removeItem(LEGACY_CUSTOM_WEEKLY_RATE_KEY);
    const activeBefore = getActiveNutritionPhase();
    const previousTarget = Number(activeBefore?.currentCalories ?? activeBefore?.startCalories);
    const previousMaintenance = Number(activeBefore?.maintenanceCalories);
    const result = saveNutritionPhase({ goalId: preview.goalId, maintenanceCalories: preview.maintenance, targetCalories: preview.target });
    saveNutritionGoal({ goalId: preview.goalId, updatedAt: new Date().toISOString(), source: "nutrition-phase" });
    syncCalculatedCalories(preview.target);
    const estimate = calculatedMaintenance();
    const usedCalculated = Number.isFinite(estimate.maintenanceCalories) && preview.maintenance === estimate.maintenanceCalories;
    const coordinatedCalculated = targetDraft !== null && activeBefore?.goalId === preview.goalId;
    if (result.action === "adjusted" && activeBefore?.id) {
        const updatedPhase = getActiveNutritionPhase() || activeBefore;
        startAdjustmentHold({
            phase: updatedPhase,
            calories: preview.target,
            maintenanceCalories: preview.maintenance,
            estimatedTargetCalories: preview.target,
            previousTarget,
            previousMaintenance,
            source: coordinatedCalculated ? "coordinated-tdee-and-adaptive-review" : "manual-calorie-adjustment"
        });
        markPhaseCheckHandled(updatedPhase, pendingAdaptiveCheckDay, coordinatedCalculated ? "coordinated-maintenance-review" : "manual-adjustment");
    }
    maintenanceDraft = null;
    targetDraft = null;
    pendingAdaptiveCheckDay = null;
    markMaintenanceCheckInReviewed({ proposedMaintenance: estimate.maintenanceCalories }, usedCalculated || coordinatedCalculated ? "applied" : "kept");
    clearPendingMaintenanceReview();
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));
    const message = result.action === "started" ? `Started ${preview.goal.label} today at ${preview.target} kcal/day.` : result.action === "adjusted" ? `Updated calories to ${preview.target} kcal/day inside the current ${preview.goal.label} phase. The phase start date did not change.` : `${preview.goal.label} remains active at ${preview.target} kcal/day.`;
    setText("unified-calorie-message", message);
    refreshAll();
}

function renderPhaseHistory() {
    const host = document.getElementById("nutrition-phase-history");
    if (!host) return;
    const rows = getNutritionPhaseHistory().filter(p => p.endDate && (p.label || GOAL_PRESETS[p.goalId])).slice(0, 8);
    if (!rows.length) { host.innerHTML = ""; return; }
    host.innerHTML = `<details class="nutrition-phase-history"><summary>Phase History</summary><div>${rows.map(p => {
        const label = p.label || GOAL_PRESETS[p.goalId]?.label || "Phase";
        const start = Number(p.startingTrendWeight ?? p.startWeight);
        const end = Number(p.endTrendWeight ?? p.endWeight);
        const weights = Number.isFinite(start) || Number.isFinite(end) ? `<small>${Number.isFinite(start) ? `${start.toFixed(1)} lb` : "--"} → ${Number.isFinite(end) ? `${end.toFixed(1)} lb` : "--"}</small>` : "";
        return `<div class="nutrition-phase-history-row"><div><strong>${escapeHtml(label)}</strong><small>${formatDate(p.startDate)} – ${formatDate(p.endDate)}</small></div><div><strong>${formatRate(Number(p.targetWeeklyRate))}</strong>${weights}</div></div>`;
    }).join("")}</div></details>`;
}

function refreshPlannerSummary() {
    const active = getActiveNutritionPhase();
    const savedGoal = getNutritionGoal();
    const plan = getNutritionPlan();
    const preset = active ? GOAL_PRESETS[active.goalId] : savedGoal?.goalId ? GOAL_PRESETS[savedGoal.goalId] : null;
    setText("planner-summary-goal", active?.label || preset?.label || "Not set");
    setText("planner-summary-calories", Number.isFinite(plan.currentCalories) ? `${plan.currentCalories} kcal` : "--");
}

function formatRate(value) { const n = Number(value); if (!Number.isFinite(n)) return "--"; if (Math.abs(n) < .005) return "Maintain"; return `${n > 0 ? "+" : "−"}${Math.abs(n).toFixed(2).replace(/0$/, "")} lb/week`; }
function formatDate(value) { if (!value) return "--"; const d = new Date(`${value}T12:00:00`); return Number.isNaN(d.getTime()) ? "--" : d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}); }
function setText(id,value){const node=document.getElementById(id);if(node)node.textContent=value}
function setValue(id,value){const node=document.getElementById(id);if(node)node.value=value??""}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
