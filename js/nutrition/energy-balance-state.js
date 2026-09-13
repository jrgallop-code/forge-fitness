import { getCalculatedMaintenanceEstimate, getCalculatedMaintenanceHistory } from "./calculated-maintenance.js?v=energy-summary-1";
import { calculateTdee } from "./tdee-calculator.js?v=nutrition-phase-1";
import { getNutritionProfile } from "./nutrition-storage.js?v=nutrition-phase-1";
import { readCompletedFoodDays, readFoodLog } from "./food-log-data.js?v=fatsecret-progress-calories-1";

export function energyDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function shiftEnergyDateKey(value, days) {
    const date = new Date(`${value}T12:00:00`);
    if (!Number.isFinite(date.getTime())) return value;
    date.setDate(date.getDate() + days);
    return energyDateKey(date);
}

function positive(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
}

function profileMaintenance() {
    const profile = getNutritionProfile();
    if (!profile || Number(profile.age) < 18) return null;
    try { return Math.round(Number(calculateTdee(profile).tdee)) || null; }
    catch { return null; }
}

function caloriesForDay(entries) {
    if (!Array.isArray(entries) || !entries.length) return null;
    const total = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.nutrition?.calories) || 0), 0);
    return total > 0 ? total : null;
}

export function summarizeEnergyRange({
    history = [],
    foodLog = {},
    completedDays = {},
    requestedStart = null,
    endDate = energyDateKey(),
    today = energyDateKey()
} = {}) {
    const ordered = (Array.isArray(history) ? history : [])
        .filter(point => /^\d{4}-\d{2}-\d{2}$/.test(String(point?.date || "")))
        .sort((a, b) => a.date.localeCompare(b.date));
    const visibleStart = requestedStart
        || ordered.find(point => positive(point.liveMaintenanceCalories) !== null || positive(point.maintenanceCalories) !== null)?.date
        || endDate;
    const historyByDate = new Map(ordered.map(point => [point.date, point]));
    let lastUsable = null;

    const expenditureFor = point => {
        const live = positive(point?.liveMaintenanceCalories);
        const reviewed = positive(point?.maintenanceCalories);
        if (live !== null) {
            lastUsable = live;
            return { calories: live, mode: "updating" };
        }
        const held = lastUsable ?? reviewed;
        if (held !== null) {
            lastUsable = held;
            return { calories: held, mode: "holding" };
        }
        return { calories: null, mode: "learning" };
    };

    ordered.filter(point => point.date < visibleStart).forEach(expenditureFor);

    const points = [];
    for (let date = visibleStart; date <= endDate; date = shiftEnergyDateKey(date, 1)) {
        const source = historyByDate.get(date);
        const expenditure = expenditureFor(source);
        const intakeCalories = date === today && completedDays?.[today] !== true
            ? null
            : caloriesForDay(foodLog?.[date]);
        points.push({
            ...(source || {}),
            date,
            expenditureCalories: positive(expenditure.calories),
            intakeCalories: positive(intakeCalories),
            mode: expenditure.mode
        });
    }

    const visible = points.filter(point => positive(point.expenditureCalories) !== null);
    const matched = visible.filter(point => positive(point.intakeCalories) !== null);
    const averageVisibleExpenditure = visible.length
        ? visible.reduce((sum, point) => sum + point.expenditureCalories, 0) / visible.length
        : null;
    const averageIntake = matched.length
        ? matched.reduce((sum, point) => sum + point.intakeCalories, 0) / matched.length
        : null;
    const averageExpenditure = matched.length
        ? matched.reduce((sum, point) => sum + point.expenditureCalories, 0) / matched.length
        : null;
    const balance = Number.isFinite(averageIntake) && Number.isFinite(averageExpenditure)
        ? averageIntake - averageExpenditure
        : null;

    return {
        startDate: matched[0]?.date || visibleStart,
        endDate: matched.at(-1)?.date || endDate,
        visibleStart,
        points,
        visible,
        matched,
        averageVisibleExpenditure,
        averageIntake,
        averageExpenditure,
        balance
    };
}

export function getEnergyBalanceState({ startDate = null, endDate = energyDateKey() } = {}) {
    const profileEstimate = profileMaintenance();
    const current = getCalculatedMaintenanceEstimate(profileEstimate);
    const historyStart = startDate ? shiftEnergyDateKey(startDate, -28) : null;
    const history = getCalculatedMaintenanceHistory(profileEstimate, { startDate: historyStart }).map(point => ({ ...point }));
    const today = energyDateKey();
    const currentLive = positive(current?.liveMaintenanceCalories);

    if (currentLive !== null && history.at(-1)?.date === today) {
        history[history.length - 1].liveMaintenanceCalories = currentLive;
    }

    const state = summarizeEnergyRange({
        history,
        foodLog: readFoodLog(),
        completedDays: readCompletedFoodDays(),
        requestedStart: startDate,
        endDate,
        today
    });
    const currentExpenditure = currentLive ?? positive(current?.maintenanceCalories);
    const currentMode = currentLive !== null ? "updating" : currentExpenditure !== null ? "holding" : "learning";

    return { ...state, profileEstimate, current, currentLive, currentExpenditure, currentMode };
}
