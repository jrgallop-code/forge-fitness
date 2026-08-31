import { getCalculatedMaintenanceEstimate } from "./calculated-maintenance.js?v=weekly-stable-tdee-1";
import { getActiveNutritionPhase, getActivePhaseMetrics, saveNutritionPhase } from "./nutrition-phase.js?v=calorie-authority-recovery-1";
import { setCurrentCalories } from "./nutrition-storage.js?v=nutrition-phase-1";
import { buildCoordinatedWeeklyUpdate, clearAdjustmentHold, markPhaseCheckHandled, readAdjustmentHold, startAdjustmentHold } from "./calorie-adjustment-coordinator.js?v=coordinated-weekly-calories-1";

const STATE_KEY = "level_up_maintenance_check_in_v1";
const PENDING_KEY = "level_up_pending_maintenance_review_v1";
const MODE_KEY = "level_up_maintenance_update_mode_v1";
const MANUAL_MAINTENANCE_KEY = "level_up_manual_maintenance_calories";
const DAY = 86400000;
const MINIMUM_CHANGE = 50;
const CHECK_IN_DAYS = 7;
const MAXIMUM_AUTOMATIC_CHANGE = 150;
const MODES = new Set(["review", "automatic", "track"]);

function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value) {
    const time = new Date(`${value}T12:00:00`).getTime();
    return Number.isFinite(time) ? time : null;
}

function positive(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
}

export function readMaintenanceCheckInState() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY) || "{}") || {}; }
    catch { return {}; }
}

export function getMaintenanceUpdateMode() {
    const mode = localStorage.getItem(MODE_KEY);
    return MODES.has(mode) ? mode : "review";
}

export function setMaintenanceUpdateMode(mode) {
    const next = MODES.has(mode) ? mode : "review";
    localStorage.setItem(MODE_KEY, next);
    window.dispatchEvent(new CustomEvent("levelup:maintenance-mode-updated", { detail: { mode: next } }));
    return next;
}

export function getMaintenanceCheckIn({ estimate, currentMaintenance, currentTarget, adaptiveMetrics = null, adjustmentHold = null, state = readMaintenanceCheckInState(), today = new Date() } = {}) {
    const proposedMaintenance = positive(estimate?.maintenanceCalories);
    const baseline = positive(currentMaintenance);
    const target = positive(currentTarget);
    const recentFoodDays = Number(estimate?.recentFoodDays || 0);
    const recentWeighIns = Number(estimate?.recentWeighIns || 0);
    const enoughWeeklyData = recentFoodDays >= 4 && recentWeighIns >= 1;
    const adaptiveGateReady = adaptiveMetrics === null || adaptiveMetrics?.recommendationReady === true;
    const change = proposedMaintenance !== null && baseline !== null
        ? Math.round(proposedMaintenance - baseline)
        : null;
    const coordinatedUpdate = buildCoordinatedWeeklyUpdate({
        currentMaintenance: baseline,
        proposedMaintenance,
        currentTarget: target,
        actualRate: adaptiveMetrics?.actualRateLbPerWeek,
        targetRate: adaptiveMetrics?.targetRateLbPerWeek,
        adaptiveReady: Boolean(adaptiveMetrics?.recommendationReady) && !["ON TRACK", "MAINTAINING"].includes(adaptiveMetrics?.status)
    });
    const proposedTarget = coordinatedUpdate?.targetCalories ?? null;
    const reviewed = parseDate(state?.reviewedAt);
    const now = new Date(today); now.setHours(12, 0, 0, 0);
    const daysSinceReview = reviewed === null ? Infinity : Math.floor((now.getTime() - reviewed) / DAY);
    const due = daysSinceReview >= CHECK_IN_DAYS;
    const coordinatedTargetChange = Number(coordinatedUpdate?.targetCalories) - Number(target);
    // A review is meaningful when either maintenance moved or measured pace
    // calls for a target change. Requiring a TDEE change hid valid reviews.
    const meaningful = (Number.isFinite(change) && Math.abs(change) >= MINIMUM_CHANGE)
        || (Number.isFinite(coordinatedTargetChange) && Math.abs(coordinatedTargetChange) >= MINIMUM_CHANGE);
    return {
        ready: enoughWeeklyData && adaptiveGateReady && due && meaningful && Boolean(coordinatedUpdate) && !adjustmentHold,
        enoughWeeklyData,
        adaptiveGateReady,
        due,
        meaningful,
        currentMaintenance: baseline !== null ? Math.round(baseline) : null,
        proposedMaintenance: proposedMaintenance !== null ? Math.round(proposedMaintenance) : null,
        currentTarget: target !== null ? Math.round(target) : null,
        proposedTarget,
        change,
        recentFoodDays,
        recentWeighIns,
        nextCheckInDays: adjustmentHold?.daysRemaining ?? (due ? 0 : Math.max(0, CHECK_IN_DAYS - daysSinceReview)),
        adjustmentHold,
        adaptiveMetrics,
        coordinatedUpdate
    };
}

export function queueMaintenanceReview(checkIn) {
    if (!checkIn?.ready || !Number.isFinite(checkIn.proposedMaintenance)) return false;
    localStorage.setItem(PENDING_KEY, JSON.stringify({
        maintenanceCalories: checkIn.proposedMaintenance,
        proposedTarget: checkIn.proposedTarget,
        coordinatedUpdate: checkIn.coordinatedUpdate,
        adaptiveCheckDay: checkIn.adaptiveMetrics?.trend?.checkDay ?? null,
        createdAt: new Date().toISOString()
    }));
    return true;
}

export function readPendingMaintenanceReview() {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) || "null"); }
    catch { return null; }
}

export function clearPendingMaintenanceReview() {
    localStorage.removeItem(PENDING_KEY);
}

export function markMaintenanceCheckInReviewed(checkIn, action = "kept") {
    localStorage.setItem(STATE_KEY, JSON.stringify({
        reviewedAt: localDateKey(),
        estimate: Number(checkIn?.proposedMaintenance) || null,
        action
    }));
    clearPendingMaintenanceReview();
    window.dispatchEvent(new CustomEvent("levelup:maintenance-check-in-updated", { detail: { action } }));
}

export function buildAutomaticMaintenanceUpdate(checkIn, maximumChange = MAXIMUM_AUTOMATIC_CHANGE) {
    if (!checkIn?.ready) return null;
    const fallbackProposed = Number(checkIn?.currentMaintenance) + Number(checkIn?.change);
    const update = buildCoordinatedWeeklyUpdate({
        currentMaintenance: checkIn.currentMaintenance,
        proposedMaintenance: Number.isFinite(Number(checkIn.proposedMaintenance)) ? checkIn.proposedMaintenance : fallbackProposed,
        currentTarget: checkIn.currentTarget,
        actualRate: checkIn.adaptiveMetrics?.actualRateLbPerWeek,
        targetRate: checkIn.adaptiveMetrics?.targetRateLbPerWeek,
        adaptiveReady: Boolean(checkIn.adaptiveMetrics?.recommendationReady) && !["ON TRACK", "MAINTAINING"].includes(checkIn.adaptiveMetrics?.status),
        maximumChange
    });
    if (!update) return null;
    return {
        ...update,
        appliedChange: update.targetChange
    };
}

function applyAutomaticMaintenanceUpdate(checkIn, phase) {
    const update = buildAutomaticMaintenanceUpdate(checkIn);
    if (!update || !phase?.goalId) return false;
    markMaintenanceCheckInReviewed(checkIn, "automatic");
    localStorage.setItem(MANUAL_MAINTENANCE_KEY, String(update.maintenanceCalories));
    saveNutritionPhase({
        goalId: phase.goalId,
        maintenanceCalories: update.maintenanceCalories,
        targetCalories: update.targetCalories
    });
    setCurrentCalories(update.targetCalories, "Automatic weekly Level Up TDEE update");
    startAdjustmentHold({
        phase,
        calories: update.targetCalories,
        maintenanceCalories: update.maintenanceCalories,
        estimatedTargetCalories: update.targetCalories,
        previousTarget: update.previousTarget,
        previousMaintenance: update.previousMaintenance,
        source: "coordinated-tdee-and-adaptive-update"
    });
    markPhaseCheckHandled(phase, checkIn.adaptiveMetrics?.trend?.checkDay, "coordinated-maintenance-update");
    showAutomaticUpdateToast(update, phase);
    return true;
}

function showAutomaticUpdateToast(update, phase) {
    document.querySelector(".maintenance-auto-toast")?.remove();
    const toast = document.createElement("aside");
    toast.className = "maintenance-auto-toast";
    toast.setAttribute("role", "status");
    const paceCopy = update.paceCorrection
        ? ` · coach ${update.paceCorrection > 0 ? "+" : "−"}${Math.abs(update.paceCorrection)}`
        : " · pace on target";
    toast.innerHTML = `<div><span>WEEKLY CALORIE UPDATE</span><strong>Target updated to ${update.targetCalories.toLocaleString()} cal/day</strong><small>Maintenance ${update.maintenanceChange > 0 ? "+" : "−"}${Math.abs(update.maintenanceChange)}${paceCopy} · combined change capped at ${MAXIMUM_AUTOMATIC_CHANGE}</small></div><button type="button">Undo</button>`;
    toast.querySelector("button")?.addEventListener("click", () => {
        markMaintenanceCheckInReviewed({ proposedMaintenance: update.previousMaintenance }, "automatic-undone");
        localStorage.setItem(MANUAL_MAINTENANCE_KEY, String(update.previousMaintenance));
        saveNutritionPhase({
            goalId: phase.goalId,
            maintenanceCalories: update.previousMaintenance,
            targetCalories: update.previousTarget
        });
        setCurrentCalories(update.previousTarget, "Undo automatic Level Up TDEE update");
        clearAdjustmentHold();
        toast.remove();
    });
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 9000);
}

export function initializeMaintenanceCheckInAlert() {
    const refresh = () => {
        const nav = document.querySelector('.nav-btn[data-page="energy"]');
        if (!nav) return;
        const phase = getActiveNutritionPhase();
        const currentMaintenance = Number(phase?.maintenanceCalories);
        const currentTarget = Number(phase?.currentCalories ?? phase?.startCalories);
        const estimate = getCalculatedMaintenanceEstimate();
        const adaptiveMetrics = phase ? getActivePhaseMetrics(phase, { rolling: true }) : null;
        const adjustmentHold = readAdjustmentHold({ phase, currentCalories: currentTarget });
        const checkIn = getMaintenanceCheckIn({
            estimate,
            currentMaintenance,
            currentTarget,
            adaptiveMetrics,
            adjustmentHold
        });
        const mode = getMaintenanceUpdateMode();
        if (mode === "automatic" && checkIn.ready && estimate.status === "established") {
            applyAutomaticMaintenanceUpdate(checkIn, phase);
            return;
        }
        const shouldAlert = mode !== "track" && checkIn.ready;
        nav.classList.toggle("has-maintenance-check-in", shouldAlert);
        let badge = nav.querySelector(".maintenance-nav-badge");
        if (shouldAlert && !badge) {
            badge = document.createElement("span");
            badge.className = "maintenance-nav-badge";
            badge.setAttribute("aria-hidden", "true");
            nav.appendChild(badge);
        } else if (!shouldAlert) {
            badge?.remove();
        }
        nav.setAttribute("aria-label", shouldAlert ? "Nutrition — weekly maintenance check-in ready" : "Nutrition");
        renderNutritionHubAlert(checkIn, mode);
    };
    ["levelup:food-log-updated", "levelup:weight-updated", "levelup:nutrition-updated", "levelup:nutrition-phase-updated", "levelup:maintenance-check-in-updated", "levelup:maintenance-mode-updated"]
        .forEach(name => window.addEventListener(name, refresh));
    window.addEventListener("pageshow", refresh);
    document.addEventListener("click", event => {
        if (event.target.closest?.('.nav-btn[data-page="energy"]')) window.setTimeout(refresh, 80);
    });
    refresh();
}

function renderNutritionHubAlert(checkIn, mode) {
    document.querySelector(".maintenance-hub-alert")?.remove();
    if (mode === "track" || !checkIn?.ready) return;
    const hub = document.querySelector("[data-calories-hub]");
    if (!hub) return;
    const alert = document.createElement("section");
    alert.className = "maintenance-hub-alert";
    alert.innerHTML = `<div><span>WEEKLY CALORIE REVIEW</span><strong>Your calorie update is ready</strong><small>Review one recommended daily target.</small></div><button type="button">Review</button>`;
    alert.querySelector("button")?.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("levelup:open-weekly-calorie-review"));
    });
    hub.insertBefore(alert, hub.querySelector('[data-calories-panel="log"]'));
}
