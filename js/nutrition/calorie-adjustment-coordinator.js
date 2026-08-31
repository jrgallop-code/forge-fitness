const HOLD_KEY = "level_up_phase_reassessment_hold";
const CHECK_STATE_KEY = "level_up_weekly_phase_checkin_state";
const DAY_MS = 86400000;
export const WEEKLY_ADJUSTMENT_CAP = 150;
export const ADJUSTMENT_HOLD_DAYS = 7;

function finite(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function phaseKey(phase) {
    return String(phase?.id || `${phase?.goalId || "phase"}|${phase?.startDate || ""}`);
}

function clamp(value, limit = WEEKLY_ADJUSTMENT_CAP) {
    const cap = Math.max(25, Math.round(Number(limit) || WEEKLY_ADJUSTMENT_CAP));
    return Math.max(-cap, Math.min(cap, value));
}

function roundTo25(value) {
    return Math.round(Number(value) / 25) * 25;
}

export function buildAdaptivePaceCorrection({ actualRate, targetRate } = {}) {
    const actual = finite(actualRate);
    const target = finite(targetRate);
    if (actual === null || target === null) return 0;
    const raw = (target - actual) * 500;
    if (Math.abs(raw) < 12.5) return 0;
    return Math.round(raw / 25) * 25;
}

export function buildCoordinatedWeeklyUpdate({
    currentMaintenance,
    proposedMaintenance,
    currentTarget,
    actualRate = null,
    targetRate = null,
    adaptiveReady = false,
    actualIntakeCalories = null,
    maximumChange = WEEKLY_ADJUSTMENT_CAP
} = {}) {
    const maintenance = finite(currentMaintenance);
    const proposed = finite(proposedMaintenance);
    const target = finite(currentTarget);
    if (maintenance === null || proposed === null || target === null || maintenance <= 0 || proposed <= 0 || target <= 0) return null;

    const requestedMaintenanceChange = Math.round(proposed - maintenance);
    const maintenanceChange = clamp(requestedMaintenanceChange, maximumChange);
    const requestedPaceCorrection = adaptiveReady
        ? buildAdaptivePaceCorrection({ actualRate, targetRate })
        : 0;
    const observedIntake = actualIntakeCalories === null || actualIntakeCalories === undefined || actualIntakeCalories === ""
        ? null
        : finite(actualIntakeCalories);
    // When completed food logs and a usable weight trend are available, the
    // logged intake already contains the user's real maintenance, activity and
    // phase surplus/deficit. Apply the rate-gap correction to that one baseline
    // instead of adding maintenance and phase adjustments a second time.
    const useObservedPaceBaseline = observedIntake !== null && adaptiveReady;
    const fullRequestedTarget = Math.round(useObservedPaceBaseline
        ? observedIntake + requestedPaceCorrection
        : target + requestedMaintenanceChange + requestedPaceCorrection);
    const direction = Math.sign(fullRequestedTarget - target);
    const adjustmentBaseline = observedIntake === null
        ? target
        : direction > 0
            ? Math.max(target, observedIntake)
            : direction < 0
                ? Math.min(target, observedIntake)
                : observedIntake;
    const behavioralChange = useObservedPaceBaseline
        ? requestedPaceCorrection
        : clamp(fullRequestedTarget - adjustmentBaseline, maximumChange);
    const nextTarget = useObservedPaceBaseline
        ? roundTo25(fullRequestedTarget)
        : observedIntake === null
        ? target + clamp(maintenanceChange + requestedPaceCorrection, maximumChange)
        : adjustmentBaseline + behavioralChange;
    const targetChange = Math.round(nextTarget - target);
    const paceCorrection = useObservedPaceBaseline
        ? requestedPaceCorrection
        : targetChange - maintenanceChange;

    const result = {
        previousMaintenance: Math.round(maintenance),
        previousTarget: Math.round(target),
        maintenanceCalories: Math.round(maintenance + maintenanceChange),
        targetCalories: Math.round(nextTarget),
        maintenanceChange,
        paceCorrection,
        targetChange,
        requestedMaintenanceChange,
        requestedPaceCorrection,
        capped: !useObservedPaceBaseline && (maintenanceChange !== requestedMaintenanceChange || Math.abs(fullRequestedTarget - adjustmentBaseline) > Math.max(25, Math.round(Number(maximumChange) || WEEKLY_ADJUSTMENT_CAP)))
    };
    if (observedIntake !== null) {
        result.actualIntakeCalories = Math.round(observedIntake);
        result.adjustmentBaseline = Math.round(adjustmentBaseline);
        result.behavioralChange = Math.round(behavioralChange);
        result.fullRequestedTarget = fullRequestedTarget;
        result.usedObservedPaceBaseline = useObservedPaceBaseline;
    }
    return result;
}

export function readAdjustmentHold({ phase, currentCalories, now = new Date() } = {}) {
    let hold;
    try { hold = JSON.parse(localStorage.getItem(HOLD_KEY) || "null"); }
    catch { hold = null; }
    if (!hold || !phase || hold.phaseId !== phase.id) return null;
    const calories = finite(currentCalories ?? phase.currentCalories ?? phase.startCalories);
    if (calories === null || Math.round(Number(hold.calories)) !== Math.round(calories)) return null;
    const applied = new Date(hold.appliedAt).getTime();
    const nowTime = new Date(now).getTime();
    if (!Number.isFinite(applied) || !Number.isFinite(nowTime)) return null;
    const daysElapsed = Math.max(0, Math.floor((nowTime - applied) / DAY_MS));
    if (daysElapsed >= ADJUSTMENT_HOLD_DAYS) return null;
    return {
        ...hold,
        daysElapsed,
        daysRemaining: ADJUSTMENT_HOLD_DAYS - daysElapsed
    };
}

export function startAdjustmentHold({ phase, calories, maintenanceCalories = null, estimatedTargetCalories = null, source = "weekly-calorie-decision", previousTarget = null, previousMaintenance = null } = {}) {
    const target = finite(calories);
    if (!phase?.id || target === null || target <= 0) return null;
    const hold = {
        phaseId: phase.id,
        calories: Math.round(target),
        maintenanceCalories: finite(maintenanceCalories) === null ? null : Math.round(Number(maintenanceCalories)),
        estimatedTargetCalories: finite(estimatedTargetCalories) === null ? Math.round(target) : Math.round(Number(estimatedTargetCalories)),
        previousTarget: finite(previousTarget) === null ? null : Math.round(Number(previousTarget)),
        previousMaintenance: finite(previousMaintenance) === null ? null : Math.round(Number(previousMaintenance)),
        source,
        appliedAt: new Date().toISOString()
    };
    localStorage.setItem(HOLD_KEY, JSON.stringify(hold));
    return hold;
}

export function clearAdjustmentHold() {
    localStorage.removeItem(HOLD_KEY);
}

export function markPhaseCheckHandled(phase, checkDay, action = "adjusted") {
    if (!phase || !Number.isFinite(Number(checkDay))) return;
    let state;
    try { state = JSON.parse(localStorage.getItem(CHECK_STATE_KEY) || "{}"); }
    catch { state = {}; }
    if (!state || typeof state !== "object" || Array.isArray(state)) state = {};
    state[phaseKey(phase)] = {
        lastHandledCheckDay: Number(checkDay),
        action,
        handledAt: new Date().toISOString()
    };
    localStorage.setItem(CHECK_STATE_KEY, JSON.stringify(state));
}
