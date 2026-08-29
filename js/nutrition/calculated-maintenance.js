const FOOD_LOG_KEY = "level_up_food_log_v1";
const FOOD_COMPLETE_KEY = "level_up_food_log_complete_days_v1";
const WEIGHT_KEY = "forge_weight_entries";
const DAY = 86400000;

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

function regressionRate(weights, startKey, endKey) {
    const start = new Date(`${startKey}T00:00:00`).getTime();
    const end = new Date(`${endKey}T23:59:59`).getTime();
    const points = (Array.isArray(weights) ? weights : [])
        .map(entry => ({ x: new Date(`${entry?.date}T12:00:00`).getTime() / DAY, y: Number(entry?.weight) }))
        .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y) && point.x * DAY >= start && point.x * DAY <= end);
    if (points.length < 2) return { rate: null, count: points.length, spanDays: 0 };
    const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
    const rate = denominator ? points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0) / denominator * 7 : null;
    return {
        rate: Number.isFinite(rate) ? rate : null,
        count: points.length,
        spanDays: Math.round(Math.max(...points.map(point => point.x)) - Math.min(...points.map(point => point.x)))
    };
}

export function calculateMaintenanceEstimate({ foodLog = {}, weights = [], completedDays = {}, endDate = new Date(), profileEstimate = null } = {}) {
    const end = new Date(endDate);
    end.setHours(12, 0, 0, 0);
    end.setDate(end.getDate() - 1);
    const dates = Array.from({ length: 21 }, (_, index) => {
        const day = new Date(end);
        day.setDate(end.getDate() - (20 - index));
        return dateKey(day);
    });
    const hasCompletionHistory = Object.values(completedDays || {}).some(Boolean);
    const loggedDates = dates.filter(key => Array.isArray(foodLog?.[key]) && foodLog[key].length > 0);
    const usableDates = hasCompletionHistory ? loggedDates.filter(key => completedDays?.[key] === true) : loggedDates;
    const intakeValues = usableDates.map(key => caloriesFor(foodLog[key])).filter(value => value > 0);
    const averageIntake = intakeValues.length ? intakeValues.reduce((sum, value) => sum + value, 0) / intakeValues.length : null;
    const trend = regressionRate(weights, dates[0], dates[dates.length - 1]);
    const enoughPreliminary = intakeValues.length >= 10 && trend.count >= 6 && trend.spanDays >= 12;
    const enoughEstablished = hasCompletionHistory && intakeValues.length >= 15 && trend.count >= 9 && trend.spanDays >= 17;
    const correction = Number.isFinite(trend.rate) ? trend.rate * 500 : null;
    const raw = Number.isFinite(averageIntake) && Number.isFinite(correction) ? averageIntake - correction : null;
    const maintenanceCalories = enoughPreliminary && Number.isFinite(raw)
        ? Math.round(Math.min(6000, Math.max(800, raw)) / 25) * 25
        : null;
    const status = enoughEstablished ? "established" : enoughPreliminary ? "preliminary" : "learning";
    const label = status === "established" ? "High confidence" : status === "preliminary" ? "Preliminary" : "Learning";
    return {
        maintenanceCalories,
        profileEstimate: Number.isFinite(Number(profileEstimate)) ? Math.round(Number(profileEstimate)) : null,
        averageIntake: Number.isFinite(averageIntake) ? averageIntake : null,
        weightRateLbPerWeek: trend.rate,
        energyCorrection: Number.isFinite(correction) ? -correction : null,
        foodDays: intakeValues.length,
        weighIns: trend.count,
        weightSpanDays: trend.spanDays,
        hasCompletionHistory,
        status,
        label,
        windowDays: 21,
        startDate: dates[0],
        endDate: dates[dates.length - 1],
        foodDaysNeeded: Math.max(0, 10 - intakeValues.length),
        weighInsNeeded: Math.max(0, 6 - trend.count),
        message: status === "learning"
            ? "Keep logging complete food days and regular weigh-ins so Level Up can separate intake from weight change."
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

