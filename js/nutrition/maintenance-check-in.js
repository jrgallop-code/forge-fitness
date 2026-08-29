import { getCalculatedMaintenanceEstimate } from "./calculated-maintenance.js?v=tdee-shared-trend-1";
import { getActiveNutritionPhase, saveNutritionPhase } from "./nutrition-phase.js?v=nutrition-phase-1";
import { setCurrentCalories } from "./nutrition-storage.js?v=nutrition-phase-1";

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

export function getMaintenanceCheckIn({ estimate, currentMaintenance, currentTarget, state = readMaintenanceCheckInState(), today = new Date() } = {}) {
    const proposedMaintenance = positive(estimate?.maintenanceCalories);
    const baseline = positive(currentMaintenance);
    const target = positive(currentTarget);
    const recentFoodDays = Number(estimate?.recentFoodDays || 0);
    const recentWeighIns = Number(estimate?.recentWeighIns || 0);
    const enoughWeeklyData = recentFoodDays >= 4 && recentWeighIns >= 1;
    const change = proposedMaintenance !== null && baseline !== null
        ? Math.round(proposedMaintenance - baseline)
        : null;
    const goalAdjustment = target !== null && baseline !== null ? target - baseline : 0;
    const proposedTarget = proposedMaintenance !== null ? Math.round(proposedMaintenance + goalAdjustment) : null;
    const reviewed = parseDate(state?.reviewedAt);
    const now = new Date(today); now.setHours(12, 0, 0, 0);
    const daysSinceReview = reviewed === null ? Infinity : Math.floor((now.getTime() - reviewed) / DAY);
    const due = daysSinceReview >= CHECK_IN_DAYS;
    const meaningful = Number.isFinite(change) && Math.abs(change) >= MINIMUM_CHANGE;
    return {
        ready: enoughWeeklyData && due && meaningful,
        enoughWeeklyData,
        due,
        meaningful,
        currentMaintenance: baseline !== null ? Math.round(baseline) : null,
        proposedMaintenance: proposedMaintenance !== null ? Math.round(proposedMaintenance) : null,
        currentTarget: target !== null ? Math.round(target) : null,
        proposedTarget,
        change,
        recentFoodDays,
        recentWeighIns,
        nextCheckInDays: due ? 0 : Math.max(0, CHECK_IN_DAYS - daysSinceReview)
    };
}

export function queueMaintenanceReview(checkIn) {
    if (!checkIn?.ready || !Number.isFinite(checkIn.proposedMaintenance)) return false;
    localStorage.setItem(PENDING_KEY, JSON.stringify({
        maintenanceCalories: checkIn.proposedMaintenance,
        proposedTarget: checkIn.proposedTarget,
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
    const change = Number(checkIn?.change);
    const maintenance = positive(checkIn?.currentMaintenance);
    const target = positive(checkIn?.currentTarget);
    const cap = Math.max(25, Math.round(Number(maximumChange) || MAXIMUM_AUTOMATIC_CHANGE));
    if (!checkIn?.ready || !Number.isFinite(change) || maintenance === null || target === null) return null;
    const appliedChange = Math.max(-cap, Math.min(cap, change));
    return {
        previousMaintenance: Math.round(maintenance),
        previousTarget: Math.round(target),
        maintenanceCalories: Math.round(maintenance + appliedChange),
        targetCalories: Math.round(target + appliedChange),
        appliedChange
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
    showAutomaticUpdateToast(update, phase);
    return true;
}

function showAutomaticUpdateToast(update, phase) {
    document.querySelector(".maintenance-auto-toast")?.remove();
    const toast = document.createElement("aside");
    toast.className = "maintenance-auto-toast";
    toast.setAttribute("role", "status");
    toast.innerHTML = `<div><span>WEEKLY MAINTENANCE UPDATE</span><strong>Target updated to ${update.targetCalories.toLocaleString()} cal/day</strong><small>${update.appliedChange > 0 ? "+" : "−"}${Math.abs(update.appliedChange)} cal/day · capped at ${MAXIMUM_AUTOMATIC_CHANGE} per week</small></div><button type="button">Undo</button>`;
    toast.querySelector("button")?.addEventListener("click", () => {
        markMaintenanceCheckInReviewed({ proposedMaintenance: update.previousMaintenance }, "automatic-undone");
        localStorage.setItem(MANUAL_MAINTENANCE_KEY, String(update.previousMaintenance));
        saveNutritionPhase({
            goalId: phase.goalId,
            maintenanceCalories: update.previousMaintenance,
            targetCalories: update.previousTarget
        });
        setCurrentCalories(update.previousTarget, "Undo automatic Level Up TDEE update");
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
        const checkIn = getMaintenanceCheckIn({
            estimate,
            currentMaintenance,
            currentTarget
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
    alert.innerHTML = `<div><span>WEEKLY TDEE UPDATE</span><strong>New maintenance estimate available</strong><small>Review ${checkIn.currentMaintenance.toLocaleString()} → ${checkIn.proposedMaintenance.toLocaleString()} cal/day</small></div><button type="button">Review</button>`;
    alert.querySelector("button")?.addEventListener("click", () => {
        if (!queueMaintenanceReview(checkIn)) return;
        document.querySelector('[data-calories-tab="plan"]')?.click();
        window.setTimeout(() => document.querySelector('[data-nutrition-view="goals"]')?.click(), 60);
    });
    hub.insertBefore(alert, hub.querySelector('[data-calories-panel="log"]'));
}
