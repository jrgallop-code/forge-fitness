import { calculateDisplayWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=tdee-shared-trend-1";

const FOOD_LOG_KEY = "level_up_food_log_v1";
const WEIGHT_KEY = "forge_weight_entries";
const WEEKLY_ESTIMATE_KEY = "level_up_weekly_tdee_estimate_v1";
const DAY_MS = 86400000;
const WEEKLY_REVIEW_DAYS = 7;
const BUILDING_CONFIDENCE_CAP = 50;
const HIGH_CONFIDENCE_CAP = 100;

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

export function calculateMaintenanceEstimate({ foodLog = {}, weights = [], endDate = new Date(), profileEstimate = null } = {}) {
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
    // Every non-empty log through yesterday is a completed intake day for this
    // estimate. Legacy completion flags are intentionally ignored because they
    // are not written consistently across food-log entry points and cloud restores.
    const usableDates = loggedDates;
    const intakeValues = usableDates.map(key => caloriesFor(foodLog[key])).filter(value => value > 0);
    const averageIntake = intakeValues.length ? intakeValues.reduce((sum, value) => sum + value, 0) / intakeValues.length : null;
    // Food stops at yesterday so an unfinished current day cannot depress intake.
    // Weight uses the latest non-future weigh-in, matching Weight Progress exactly.
    const eligibleWeights = normalizeWeightEntries(weights).filter(entry => entry.date <= asOfKey);
    const weightTrendEndDate = eligibleWeights.at(-1)?.date || dates[dates.length - 1];
    const trend = sharedWeightTrend(eligibleWeights, weightTrendEndDate);
    const enoughEarly = intakeValues.length >= 2 && trend.count >= 3 && trend.spanDays >= 5;
    const enoughPreliminary = intakeValues.length >= 7 && trend.count >= 6 && trend.spanDays >= 10;
    const enoughEstablished = intakeValues.length >= 15 && trend.count >= 9 && trend.spanDays >= 17;
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
    const foodLog = readJson(FOOD_LOG_KEY, {});
    const weights = readJson(WEIGHT_KEY, []);
    const today = new Date();
    const liveEstimate = calculateMaintenanceEstimate({ foodLog, weights, endDate: today, profileEstimate });
    const previousDay = new Date(today);
    previousDay.setDate(previousDay.getDate() - 1);
    const previousEstimate = calculateMaintenanceEstimate({ foodLog, weights, endDate: previousDay, profileEstimate });
    const stored = readJson(WEEKLY_ESTIMATE_KEY, null);
    const stabilized = stabilizeMaintenanceEstimate({ liveEstimate, previousEstimate, snapshot: stored, today });
    if (stabilized.snapshot) localStorage.setItem(WEEKLY_ESTIMATE_KEY, JSON.stringify(stabilized.snapshot));
    return stabilized.estimate;
}

export function stabilizeMaintenanceEstimate({ liveEstimate, previousEstimate = null, snapshot = null, today = new Date() } = {}) {
    const live = liveEstimate || {};
    if (!Number.isFinite(Number(live.maintenanceCalories))) {
        return { estimate: live, snapshot };
    }

    const now = new Date(today);
    now.setHours(12, 0, 0, 0);
    const todayKey = dateKey(now);
    // A short-lived release incorrectly back-solved TDEE from an accepted
    // calorie target. TDEE must remain an independent intake-and-weight
    // estimate, so replace that snapshot immediately while leaving the user's
    // accepted target untouched.
    if (snapshot?.estimate?.reviewSynchronized === true) {
        const nextSnapshot = {
            reviewedAt: todayKey,
            estimate: {
                ...live,
                uncappedMaintenanceCalories: Number(live.maintenanceCalories),
                independentTdeeRestored: true
            }
        };
        return { estimate: decorateStableEstimate(nextSnapshot, live, now, false), snapshot: nextSnapshot };
    }
    const validStored = snapshot
        && Number.isFinite(Number(snapshot?.estimate?.maintenanceCalories))
        && /^\d{4}-\d{2}-\d{2}$/.test(String(snapshot.reviewedAt || ""));

    if (!validStored) {
        const seed = Number.isFinite(Number(previousEstimate?.maintenanceCalories)) ? previousEstimate : live;
        const nextSnapshot = { reviewedAt: todayKey, estimate: { ...seed } };
        return { estimate: decorateStableEstimate(nextSnapshot, live, now, false), snapshot: nextSnapshot };
    }

    const reviewedTime = new Date(`${snapshot.reviewedAt}T12:00:00`).getTime();
    const daysSinceReview = Number.isFinite(reviewedTime) ? Math.floor((now.getTime() - reviewedTime) / DAY_MS) : WEEKLY_REVIEW_DAYS;
    const due = daysSinceReview >= WEEKLY_REVIEW_DAYS;
    const enoughWeeklyData = Number(live.foodDays) >= 7
        && Number(live.weighIns) >= 7
        && Number(live.weightSpanDays) >= 14;

    if (!due || !enoughWeeklyData) {
        return { estimate: decorateStableEstimate(snapshot, live, now, due), snapshot };
    }

    const previousCalories = Number(snapshot.estimate.maintenanceCalories);
    const liveCalories = Number(live.maintenanceCalories);
    const maximumStep = live.status === "established" ? HIGH_CONFIDENCE_CAP : BUILDING_CONFIDENCE_CAP;
    const change = Math.max(-maximumStep, Math.min(maximumStep, liveCalories - previousCalories));
    const nextCalories = Math.round((previousCalories + change) / 25) * 25;
    const nextSnapshot = {
        reviewedAt: todayKey,
        estimate: {
            ...live,
            maintenanceCalories: nextCalories,
            uncappedMaintenanceCalories: liveCalories
        }
    };
    return { estimate: decorateStableEstimate(nextSnapshot, live, now, false), snapshot: nextSnapshot };
}

function decorateStableEstimate(snapshot, live, now, reviewDue) {
    const reviewed = new Date(`${snapshot.reviewedAt}T12:00:00`);
    const nextReview = new Date(reviewed);
    nextReview.setDate(nextReview.getDate() + WEEKLY_REVIEW_DAYS);
    const estimate = snapshot.estimate || live;
    return {
        ...estimate,
        // The weekly snapshot stabilizes the reviewed calorie value only.
        // Evidence stays live so all cards use the same shared weight trend.
        averageIntake: live.averageIntake,
        weightRateLbPerWeek: live.weightRateLbPerWeek,
        energyCorrection: live.energyCorrection,
        foodDays: live.foodDays,
        weighIns: live.weighIns,
        weightSpanDays: live.weightSpanDays,
        weightTrendLabel: live.weightTrendLabel,
        weightTrendEndDate: live.weightTrendEndDate,
        status: live.status,
        label: live.label,
        profileEstimate: live.profileEstimate,
        recentFoodDays: live.recentFoodDays,
        recentWeighIns: live.recentWeighIns,
        liveMaintenanceCalories: Number(live.maintenanceCalories),
        weeklyStable: true,
        weeklyReviewDue: Boolean(reviewDue),
        weeklyDataReady: Number(live.foodDays) >= 7 && Number(live.weighIns) >= 7 && Number(live.weightSpanDays) >= 14,
        lastReviewedAt: snapshot.reviewedAt,
        nextReviewDate: dateKey(nextReview),
        daysUntilReview: Math.max(0, Math.ceil((nextReview.getTime() - now.getTime()) / DAY_MS))
    };
}
