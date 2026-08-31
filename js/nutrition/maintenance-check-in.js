import { getCalculatedMaintenanceEstimate } from "./calculated-maintenance.js?v=weekly-stable-tdee-1";
import { getActiveNutritionPhase, getActivePhaseMetrics, saveNutritionPhase } from "./nutrition-phase.js?v=calorie-authority-recovery-1";
import { setCurrentCalories } from "./nutrition-storage.js?v=nutrition-phase-1";
import { buildCoordinatedWeeklyUpdate, clearAdjustmentHold, markPhaseCheckHandled, readAdjustmentHold, startAdjustmentHold } from "./calorie-adjustment-coordinator.js?v=coordinated-weekly-calories-1";

const STATE_KEY = "level_up_maintenance_check_in_v1";
const PENDING_KEY = "level_up_pending_maintenance_review_v1";
const MODE_KEY = "level_up_maintenance_update_mode_v1";
const MANUAL_MAINTENANCE_KEY = "level_up_manual_maintenance_calories";
const WEEKLY_REVIEW_PREVIEW_KEY = "level_up_weekly_review_preview";
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

function ensureWeeklyReviewSurfaceStyles() {
    if (document.getElementById("weekly-review-surface-styles")) return;
    const style = document.createElement("style");
    style.id = "weekly-review-surface-styles";
    style.textContent = `
        .nav-btn[data-page="energy"] { position: relative; }
        .nav-btn[data-page="energy"] .maintenance-nav-badge {
            position: absolute;
            top: 9px;
            left: calc(50% + 10px);
            width: 10px;
            height: 10px;
            padding: 0;
            border: 2px solid #17171a;
            border-radius: 999px;
            background: #35d3b4;
            box-shadow: 0 0 0 4px rgba(53, 211, 180, .16), 0 0 12px rgba(53, 211, 180, .72);
            pointer-events: none;
            z-index: 3;
        }
        .progress-weekly-review-alert {
            display: grid;
            gap: 12px;
            margin-top: 14px;
            padding: 16px;
            border: 1px solid rgba(53, 211, 180, .45);
            border-radius: 18px;
            background: rgba(53, 211, 180, .08);
        }
        .progress-weekly-review-alert span {
            color: #35d3b4;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: .12em;
        }
        .progress-weekly-review-alert strong { color: #fff; font-size: 17px; }
        .progress-weekly-review-alert small { color: #aaa8b0; line-height: 1.35; }
        .progress-weekly-review-alert button {
            min-height: 46px;
            border: 0;
            border-radius: 14px;
            background: #35d3b4;
            color: #0e1615;
            font: inherit;
            font-weight: 800;
        }
    `;
    document.head.appendChild(style);
}

function renderProgressReviewAlert(checkIn, mode) {
    document.querySelector(".progress-weekly-review-alert")?.remove();
    const preview = sessionStorage.getItem(WEEKLY_REVIEW_PREVIEW_KEY) === "1";
    if (!preview && (mode === "track" || !checkIn?.ready)) return;
    const card = document.getElementById("weight-calorie-suggestion-card");
    if (!card) return;
    const alert = document.createElement("section");
    alert.className = "progress-weekly-review-alert";
    alert.innerHTML = preview
        ? `<span>TEST · WEEKLY CALORIE REVIEW</span><strong>Preview your review flow</strong><small>No target or log data will change.</small><button type="button">Review test</button>`
        : `<span>WEEKLY CALORIE REVIEW</span><strong>Your calorie update is ready</strong><small>Review and apply the same target shown in Nutrition.</small><button type="button">Review target</button>`;
    alert.querySelector("button")?.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("levelup:open-weekly-calorie-review", { detail: { preview } }));
    });
    card.appendChild(alert);
}

export function initializeMaintenanceCheckInAlert() {
    ensureWeeklyReviewSurfaceStyles();
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
        const sharedReady = document.documentElement.dataset.weeklyCalorieReviewReady === "true";
        const shouldAlert = mode !== "track" && (checkIn.ready || sharedReady);
        const displayedCheckIn = shouldAlert === checkIn.ready ? checkIn : { ...checkIn, ready: shouldAlert };
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
        nav.setAttribute("aria-label", shouldAlert ? "Nutrition — weekly calorie review ready" : "Nutrition");
        renderNutritionHubAlert(displayedCheckIn, mode);
        renderProgressReviewAlert(displayedCheckIn, mode);
    };
    ["levelup:food-log-updated", "levelup:weight-updated", "levelup:nutrition-updated", "levelup:nutrition-phase-updated", "levelup:maintenance-check-in-updated", "levelup:maintenance-mode-updated", "levelup:weekly-calorie-review-readiness"]
        .forEach(name => window.addEventListener(name, refresh));
    window.addEventListener("pageshow", refresh);
    document.addEventListener("click", event => {
        if (event.target.closest?.('.nav-btn[data-page="energy"], .nav-btn[data-page="progress"], [data-page="progress"], #weight-tab')) {
            window.setTimeout(refresh, 80);
            window.setTimeout(refresh, 260);
        }
    });
    refresh();
}

function renderNutritionHubAlert(checkIn, mode) {
    document.querySelector(".maintenance-hub-alert")?.remove();
    const preview = sessionStorage.getItem(WEEKLY_REVIEW_PREVIEW_KEY) === "1";
    if (!preview && (mode === "track" || !checkIn?.ready)) return;
    const hub = document.querySelector("[data-calories-hub]");
    if (!hub) return;
    const alert = document.createElement("section");
    alert.className = "maintenance-hub-alert";
    alert.innerHTML = preview
        ? `<div><span>TEST · WEEKLY CALORIE REVIEW</span><strong>Preview your review flow</strong><small>Uses your current data without changing your target.</small></div><button type="button">Review test</button>`
        : `<div><span>WEEKLY CALORIE REVIEW</span><strong>Your calorie update is ready</strong><small>Review one recommended daily target.</small></div><button type="button">Review</button>`;
    alert.querySelector("button")?.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("levelup:open-weekly-calorie-review", { detail: { preview } }));
    });
    hub.insertBefore(alert, hub.querySelector('[data-calories-panel="log"]'));
}
