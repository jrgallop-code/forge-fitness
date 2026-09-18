import { GOAL_PRESETS, roundCalorieTarget } from "./tdee-calculator.js?v=calorie-target-rounding-1";
import { currentExpenditureFromEstimate } from "./new-phase-maintenance.js?v=new-phase-current-expenditure-1";
import { syncCalculatedCalories } from "./nutrition-storage.js?v=legacy-new-phase-target-repair-1";

const PHASES_KEY = "level_up_nutrition_phases";
const MANUAL_MAINTENANCE_KEY = "level_up_manual_maintenance_calories";
const REPAIR_KEY = "level_up_new_phase_target_repair_v1";

function positive(value) {
    const number = Math.round(Number(value));
    return Number.isFinite(number) && number > 0 ? number : null;
}

export function findInheritedNewPhaseTargetRepair(phases, estimate) {
    if (!Array.isArray(phases) || estimate?.status !== "established") return null;
    const activeIndex = phases.findLastIndex(phase => phase?.goalId && !phase?.endDate);
    if (activeIndex < 1) return null;

    const active = phases[activeIndex];
    const previous = phases.slice(0, activeIndex).findLast(phase => phase?.goalId);
    const preset = GOAL_PRESETS[active.goalId];
    const inheritedMaintenance = positive(active.maintenanceCalories);
    const previousMaintenance = positive(previous?.maintenanceCalories);
    const currentTarget = positive(active.currentCalories ?? active.startCalories);
    const expenditure = positive(currentExpenditureFromEstimate(estimate));
    if (!preset || !inheritedMaintenance || inheritedMaintenance !== previousMaintenance || !currentTarget || !expenditure) return null;
    if (previous.goalId === active.goalId || Math.abs(inheritedMaintenance - expenditure) < 100) return null;

    const inheritedTarget = roundCalorieTarget(inheritedMaintenance + Number(preset.dailyCalorieAdjustment || 0));
    if (currentTarget !== inheritedTarget) return null;

    const correctedTarget = roundCalorieTarget(expenditure + Number(preset.dailyCalorieAdjustment || 0));
    if (!correctedTarget || correctedTarget === currentTarget) return null;
    return { activeIndex, expenditure, correctedTarget, currentTarget, goalId: active.goalId };
}

export function repairInheritedNewPhaseTarget(estimate) {
    if (localStorage.getItem(REPAIR_KEY) === "complete") return null;
    let phases;
    try { phases = JSON.parse(localStorage.getItem(PHASES_KEY) || "[]"); }
    catch { phases = []; }

    const repair = findInheritedNewPhaseTargetRepair(phases, estimate);
    if (!repair) return null;

    const now = new Date().toISOString();
    const active = phases[repair.activeIndex];
    phases[repair.activeIndex] = {
        ...active,
        maintenanceCalories: repair.expenditure,
        startCalories: repair.correctedTarget,
        currentCalories: repair.correctedTarget,
        dailyCalorieAdjustment: Number(GOAL_PRESETS[active.goalId]?.dailyCalorieAdjustment || 0),
        adjustments: [
            ...(Array.isArray(active.adjustments) ? active.adjustments : []),
            {
                date: now,
                previousCalories: repair.currentTarget,
                newCalories: repair.correctedTarget,
                maintenanceCalories: repair.expenditure,
                source: "one-time-inherited-phase-baseline-repair"
            }
        ],
        inheritedBaselineRepairAppliedAt: now,
        updatedAt: now
    };
    localStorage.setItem(PHASES_KEY, JSON.stringify(phases));
    localStorage.setItem(MANUAL_MAINTENANCE_KEY, String(repair.expenditure));
    localStorage.setItem(REPAIR_KEY, "complete");
    syncCalculatedCalories(repair.correctedTarget);
    return repair;
}
