import { getActiveNutritionPhase, getActivePhaseMetrics } from "./nutrition-phase.js?v=calorie-authority-recovery-1";
import { getCalculatedMaintenanceEstimate } from "./calculated-maintenance.js?v=independent-tdee-staged-target-1";
import { markMaintenanceCheckInReviewed } from "./maintenance-check-in.js?v=calorie-authority-recovery-1";

const CHECK_STATE_KEY = "level_up_weekly_phase_checkin_state";
const FIRST_CHECK_DAY = 14;

function phaseKey(phase) {
    return String(phase?.id || `${phase?.goalId || "phase"}|${phase?.startDate || ""}`);
}

function readCheckState() {
    try {
        const state = JSON.parse(localStorage.getItem(CHECK_STATE_KEY) || "{}");
        return state && typeof state === "object" && !Array.isArray(state) ? state : {};
    } catch {
        return {};
    }
}

function keepCurrentTarget(event) {
    const button = event.target.closest?.("#goal-check-in-keep, #weekly-coach-keep, #weight-weekly-review-keep, #weekly-modal-review-keep");
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const phase = getActiveNutritionPhase();
    if (!phase) return;

    const metrics = getActivePhaseMetrics(phase, { rolling: true });
    const checkDay = Number(metrics.trend?.checkDay);
    if (Number.isFinite(checkDay) && checkDay >= FIRST_CHECK_DAY) {
        const state = readCheckState();
        state[phaseKey(phase)] = {
            lastHandledCheckDay: checkDay,
            action: "kept",
            handledAt: new Date().toISOString()
        };
        localStorage.setItem(CHECK_STATE_KEY, JSON.stringify(state));
        markMaintenanceCheckInReviewed({ proposedMaintenance: getCalculatedMaintenanceEstimate()?.maintenanceCalories }, "kept-shared-weekly-review");
    }

    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated", {
        detail: { source: "calorie-authority-keep" }
    }));
}

document.addEventListener("click", keepCurrentTarget, true);
