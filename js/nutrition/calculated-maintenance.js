import { calculateDisplayWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=tdee-shared-trend-1";

const FOOD_LOG_KEY = "level_up_food_log_v1";
const FOOD_COMPLETE_KEY = "level_up_food_log_complete_days_v1";
const WEIGHT_KEY = "forge_weight_entries";

function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
}

function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function caloriesFor(entries) {
    return (Array.isArray(entries) ? entries : []).reduce((sum, entry) => sum + Math.max(0, Number(entry?.nutrition?.calories) || 0), 0);
}

function sharedWeightTrend(weights, endKey) {
    const normalized = normalizeWeightEntries(weights).filter(entry => entry.date <= endKey);
    const result = calculateDisplayWeightTrend(normalized, {
        endDate: endKey,
        windowDays: 21,
        minEntries: 3,
        minSpanDays: 5,
        fullEntries: 9
    });
    return {
        rate: Number.isFinite(result.weeklyChange) ? result.weeklyChange : null,
        count: result.entries || 0,
        spanDays: result.spanDays ? Math.max(0, result.spanDays - 1) : 0,
        label: result.label
    };
}

export function calculateMaintenanceEstimate({ foodLog = {}, weights = [], completedDays = {}, endDate = new Date(), profileEstimate = null } = {}) {
    const asOf = new Date(endDate);
    asOf.setHours(12, 0, 0, 0);
    const asOfKey = dateKey(asOf);
    const end = new Date(asOf);
    end.setDate(end.getDate() - 1);
    const dates = Array.from({ length: 21 }, (_, index) => {
        const day = new Date(end);
        day.setDate(end.getDate() - (20 - index));
        return dateKey(day);
    });
    const loggedDates = dates.filter(key => Array.isArray(foodLog?.[key]) && foodLog[key].length > 0);
    const completedLoggedDates = loggedDates.filter(key => completedDays?.[key] === true);
    // Old completion flags can outlive the corresponding food entries after a
    // restore or cloud merge. Only enable strict completion filtering when a
    // completion flag actually matches food in the active 21-day window.
    const hasCompletionHistory = completedLoggedDates.length > 0;
    const usableDates = hasCompletionHistory ? completedLoggedDates : loggedDates;
    const intakeValues = usableDates.map(key => caloriesFor(foodLog[key])).filter(value => value > 0);
    const averageIntake = intakeValues.length ? intakeValues.reduce((sum, value) => sum + value, 0) / intakeValues.length : null;
    // Food stops at yesterday so an unfinished current day cannot depress intake.
    // Weight uses the latest non-future weigh-in, matching Weight Progress exactly.
    const eligibleWeights = normalizeWeightEntries(weights).filter(entry => entry.date <= asOfKey);
    const weightTrendEndDate = eligibleWeights.at(-1)?.date || dates[dates.length - 1];
    const trend = sharedWeightTrend(eligibleWeights, weightTrendEndDate);
    const enoughEarly = intakeValues.length >= 2 && trend.count >= 3 && trend.spanDays >= 5;
    const enoughPreliminary = intakeValues.length >= 7 && trend.count >= 6 && trend.spanDays >= 10;
    const enoughEstablished = hasCompletionHistory && intakeValues.length >= 15 && trend.count >= 9 && trend.spanDays >= 17;
    const correction = Number.isFinite(trend.rate) ? trend.rate * 500 : null;
    const raw = Number.isFinite(averageIntake) && Number.isFinite(correction) ? averageIntake - correction : null;
    const maintenanceCalories = enoughEarly && Number.isFinite(raw)
        ? Math.round(Math.min(6000, Math.max(800, raw)) / 25) * 25
        : null;
    const status = enoughEstablished ? "established" : enoughPreliminary ? "preliminary" : enoughEarly ? "early" : "learning";
    const label = status === "established" ? "High confidence" : status === "preliminary" ? "Building confidence" : status === "early" ? "Early estimate" : "Not enough data";
    const recentDates = dates.slice(-7);
    const recentFoodDays = recentDates.filter(key => usableDates.includes(key)).length;
    const recentWeighIns = normalizeWeightEntries(weights).filter(entry => recentDates.includes(entry.date)).length;
    return {
        maintenanceCalories,
        profileEstimate: Number.isFinite(Number(profileEstimate)) ? Math.round(Number(profileEstimate)) : null,
        averageIntake: Number.isFinite(averageIntake) ? averageIntake : null,
        weightRateLbPerWeek: trend.rate,
        energyCorrection: Number.isFinite(correction) ? -correction : null,
        foodDays: intakeValues.length,
        weighIns: trend.count,
        weightSpanDays: trend.spanDays,
        weightTrendLabel: trend.label || "Weekly Trend",
        weightTrendEndDate,
        recentFoodDays,
        recentWeighIns,
        hasCompletionHistory,
        status,
        label,
        windowDays: 21,
        startDate: dates[0],
        endDate: dates[dates.length - 1],
        foodDaysNeeded: Math.max(0, 2 - intakeValues.length),
        weighInsNeeded: Math.max(0, 3 - trend.count),
        message: status === "learning"
            ? "Log at least two complete food days and enough weigh-ins to establish a weight trend."
            : status === "early"
                ? "This is a real trend-based estimate, but it can move noticeably while Level Up gathers more complete food days."
                : "Calculated from your average logged intake and regression weight trend."
    };
}

export function getCalculatedMaintenanceEstimate(profileEstimate = null) {
    return calculateMaintenanceEstimate({
        foodLog: readJson(FOOD_LOG_KEY, {}),
        weights: readJson(WEIGHT_KEY, []),
        completedDays: readJson(FOOD_COMPLETE_KEY, {}),
        profileEstimate
    });
}
