import {
    getActiveNutritionPhase,
    getActivePhaseMetrics,
    saveNutritionPhase
} from "./nutrition-phase.js?v=nutrition-phase-full-window-1";
import { setCurrentCalories } from "./nutrition-storage.js?v=weekly-ma-coach-1";
import { calculateDisplayWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=nutrition-display-regression-1";
import { getLoggedCalorieWindow, localDateKey, previousDateKey } from "./food-log-data.js?v=adaptive-calorie-average-1";

const FIRST_CHECK_DAY = 14;
const FULL_GAP_INCREMENT = 50;
const CHECK_STATE_KEY = "level_up_weekly_phase_checkin_state";
const HOLD_KEY = "level_up_phase_reassessment_hold";
const HOLD_DAYS = 7;
const WEIGHT_KEY = "forge_weight_entries";
let refreshScheduled = false;
let refreshAgain = false;

function formatRate(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(2)} lb/week`;
}

function formatSignedCalories(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    if (Math.abs(number) < 0.5) return "0";
    return `${number > 0 ? "+" : "−"}${Math.abs(Math.round(number))}`;
}

function setText(node, value) {
    if (!node || node.textContent === value) return false;
    node.textContent = value;
    return true;
}

function getVisibleTrend(metrics) {
    if (metrics?.isFutureTest) return null;
    try {
        const entries = normalizeWeightEntries(JSON.parse(localStorage.getItem(WEIGHT_KEY) || "[]"));
        const latestDate = entries.at(-1)?.date || null;
        return calculateDisplayWeightTrend(entries, { endDate: latestDate });
    } catch {
        return null;
    }
}

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

function getHandledCheck(phase, checkDay) {
    if (!phase || !Number.isFinite(Number(checkDay))) return null;
    const record = readCheckState()?.[phaseKey(phase)];
    return Number(record?.lastHandledCheckDay) === Number(checkDay) ? record : null;
}

function markCheckHandled(phase, checkDay, action) {
    if (!phase || !Number.isFinite(Number(checkDay))) return;
    const state = readCheckState();
    state[phaseKey(phase)] = {
        lastHandledCheckDay: Number(checkDay),
        action: String(action || "adjusted"),
        handledAt: new Date().toISOString()
    };
    localStorage.setItem(CHECK_STATE_KEY, JSON.stringify(state));
}

function getHold(phase, currentCalories) {
    let hold;
    try { hold = JSON.parse(localStorage.getItem(HOLD_KEY) || "null"); }
    catch { hold = null; }
    if (!hold || hold.phaseId !== phase?.id) return null;
    if (Math.round(Number(hold.calories)) !== Math.round(Number(currentCalories))) return null;
    const applied = new Date(hold.appliedAt).getTime();
    if (!Number.isFinite(applied)) return null;
    const daysElapsed = Math.max(0, Math.floor((Date.now() - applied) / 86400000));
    if (daysElapsed >= HOLD_DAYS) return null;
    return { daysRemaining: HOLD_DAYS - daysElapsed };
}

function saveHold(phase, calories) {
    localStorage.setItem(HOLD_KEY, JSON.stringify({
        phaseId: phase.id,
        calories: Math.round(calories),
        estimatedTargetCalories: Math.round(calories),
        appliedAt: new Date().toISOString()
    }));
}

function buildRecommendation(actual, target, currentCalories) {
    const rawGap = (Number(target) - Number(actual)) * 500;
    let adjustment = Math.round(rawGap / FULL_GAP_INCREMENT) * FULL_GAP_INCREMENT;
    if (adjustment === 0 && Math.abs(rawGap) > 0.001) {
        adjustment = Math.sign(rawGap) * FULL_GAP_INCREMENT;
    }
    return {
        adjustment,
        targetCalories: Math.max(1, Math.round(Number(currentCalories) + adjustment))
    };
}

function getAdaptiveCalorieBaseline(metrics, currentCalories) {
    const trend = metrics?.trend;
    let startDate = trend?.currentWindowStart;
    let endDate = trend?.currentWindowEnd || trend?.measurementDate;
    if (startDate && endDate === localDateKey()) {
        startDate = previousDateKey(startDate);
        endDate = previousDateKey(endDate);
    }
    const intake = getLoggedCalorieWindow({
        startDate,
        endDate,
        minLoggedDays: 4
    });
    const useLoggedAverage = intake.sufficient && Number.isFinite(Number(intake.averageCalories));
    return {
        calories: useLoggedAverage ? Number(intake.averageCalories) : Number(currentCalories),
        intake,
        useLoggedAverage
    };
}

function calorieBaselineCopy(baseline) {
    const intake = baseline?.intake;
    if (!intake?.totalDays) return "using current target";
    if (!baseline.useLoggedAverage) {
        return `current target (${intake.loggedDays}/${intake.totalDays} days logged)`;
    }
    return `logged average (${intake.loggedDays}/${intake.totalDays} days)`;
}

function hideCoachActions() {
    const apply = document.getElementById("weekly-coach-apply") || document.getElementById("goal-check-in-apply");
    const keep = document.getElementById("weekly-coach-keep");
    if (apply) apply.hidden = true;
    if (keep) keep.hidden = true;
}

function syncCurrentPhaseCard(metrics) {
    const card = document.getElementById("nutrition-current-phase");
    if (!card) return;
    setText(card.querySelector(".nutrition-current-phase-head b"), metrics.status);

    const grid = card.querySelector(".nutrition-current-phase-grid");
    if (!grid) return;
    const actualCell = [...grid.children].find(cell => {
        const label = cell.querySelector("span")?.textContent?.trim();
        return label === "Actual Since Start" || label === "Current Weekly Trend";
    });
    setText(actualCell?.querySelector("span"), "Current Weekly Trend");

    const visibleTrend = getVisibleTrend(metrics);
    const visibleRate = visibleTrend?.weeklyChange === null || visibleTrend?.weeklyChange === undefined
        ? NaN
        : Number(visibleTrend.weeklyChange);
    const actual = Number.isFinite(visibleRate) ? visibleRate : Number(metrics.actualRateLbPerWeek);
    const isPreliminary = Number.isFinite(visibleRate)
        ? visibleTrend.status === "preliminary"
        : metrics.status === "PRELIMINARY TREND";
    const actualText = Number.isFinite(actual)
        ? `${isPreliminary ? "Preliminary · " : ""}${formatRate(actual)}`
        : metrics.status === "BUILDING TREND"
            ? "Calibrating"
            : "Need more data";
    setText(actualCell?.querySelector("strong"), actualText);
}

function syncCoach(metrics, phase) {
    const card = document.getElementById("goal-check-in-card");
    const trend = metrics.trend;
    if (!card || !trend) return;

    const actual = Number(metrics.actualRateLbPerWeek);
    const target = Number(metrics.targetRateLbPerWeek);
    const currentCalories = Number(phase.currentCalories ?? phase.startCalories);
    const baseline = getAdaptiveCalorieBaseline(metrics, currentCalories);
    const checkDay = Number(trend.checkDay);
    const weeklyCoach = card.dataset.weeklyCoach === "1";

    if (weeklyCoach) {
        setText(document.getElementById("weekly-coach-previous-label"), metrics.status === "PRELIMINARY TREND" ? "Starting Trend" : "Previous 7-Day Avg");
        setText(document.getElementById("weekly-coach-previous"), Number.isFinite(Number(trend.previousAverage)) ? `${Number(trend.previousAverage).toFixed(1)} lb` : "--");
        setText(document.getElementById("weekly-coach-current"), Number.isFinite(Number(trend.currentAverage)) ? `${Number(trend.currentAverage).toFixed(1)} lb` : "--");
        setText(document.getElementById("weekly-coach-actual"), Number.isFinite(actual) ? formatRate(actual) : "--");
        setText(document.getElementById("weekly-coach-target"), Number.isFinite(target) ? formatRate(target) : "--");
        setText(document.getElementById("weekly-coach-status"), metrics.status);
    } else {
        setText(document.getElementById("goal-check-in-status"), metrics.status);
    }

    const messageNode = document.getElementById(weeklyCoach ? "weekly-coach-message" : "goal-check-in-message");
    const suggestionNode = document.getElementById(weeklyCoach ? "weekly-coach-suggestion" : "goal-check-in-suggested");

    if (metrics.status === "BUILDING TREND") {
        setText(messageNode, `Keep logging weight. A preliminary trend begins on Day 7; calorie decisions wait until Day ${FIRST_CHECK_DAY}.`);
        setText(suggestionNode, `First calorie decision: Day ${FIRST_CHECK_DAY}.`);
        hideCoachActions();
        return;
    }

    if (metrics.status === "PRELIMINARY TREND") {
        setText(messageNode, `Preliminary rolling trend: ${formatRate(actual)}. This is informational until Day ${FIRST_CHECK_DAY}.`);
        setText(suggestionNode, `No calorie decision before Day ${FIRST_CHECK_DAY}.`);
        hideCoachActions();
        return;
    }

    if (metrics.status === "AWAITING WEIGH-IN") {
        const pendingDay = Number.isFinite(checkDay) ? checkDay : FIRST_CHECK_DAY;
        setText(messageNode, Number.isFinite(actual)
            ? `Your measured weekly trend remains ${formatRate(actual)}. A new weigh-in is needed to run the pending assessment.`
            : "The scheduled phase assessment is due, but another weigh-in is needed before it can run.");
        setText(suggestionNode, `Log a new weigh-in to run the Day ${pendingDay} assessment.`);
        hideCoachActions();
        return;
    }

    if (!Number.isFinite(actual) || !Number.isFinite(target)) {
        setText(messageNode, "Need more weight data before evaluating this phase.");
        setText(suggestionNode, "Keep logging weight consistently.");
        hideCoachActions();
        return;
    }

    if (["ON TRACK", "MAINTAINING"].includes(metrics.status)) {
        setText(messageNode, `Your current 7-day trend is ${formatRate(actual)} versus a target of ${formatRate(target)}.`);
        setText(suggestionNode, baseline.useLoggedAverage
            ? `Your logged average of ${Math.round(baseline.calories)} kcal/day (${baseline.intake.loggedDays}/${baseline.intake.totalDays} days) is producing an on-track trend. Current target: ${Math.round(currentCalories)} kcal/day.`
            : Number.isFinite(currentCalories)
                ? `Keep calories at ${Math.round(currentCalories)} kcal/day. Log at least 4 days in the current 7-day window to personalize the next check.`
                : "Keep the current plan.");
        hideCoachActions();
        return;
    }

    const hold = getHold(phase, currentCalories);
    if (hold) {
        setText(messageNode, "The calorie adjustment is being measured. Hold the current target for 7 days before another change.");
        setText(suggestionNode, `Current target: ${Math.round(currentCalories)} kcal/day · reassess in ${hold.daysRemaining} day${hold.daysRemaining === 1 ? "" : "s"}.`);
        hideCoachActions();
        return;
    }

    if (getHandledCheck(phase, checkDay)) {
        setText(messageNode, `The Day ${checkDay} check-in has already been handled.`);
        setText(suggestionNode, `Next scheduled check: Day ${trend.nextCheckDay || checkDay + 7}.`);
        hideCoachActions();
        return;
    }

    if (!metrics.recommendationReady || !Number.isFinite(currentCalories)) {
        setText(messageNode, `Current weekly trend: ${formatRate(actual)} · Target: ${formatRate(target)}.`);
        setText(suggestionNode, "No calorie change is unlocked yet.");
        hideCoachActions();
        return;
    }

    const recommendation = buildRecommendation(actual, target, baseline.calories);
    card.dataset.fullAdjustmentCalories = String(recommendation.targetCalories);
    card.dataset.fullAdjustmentDelta = String(recommendation.adjustment);
    card.dataset.fullAdjustmentCheckDay = String(checkDay);

    setText(messageNode, `Current weekly trend: ${formatRate(actual)} · Target: ${formatRate(target)}. Level Up bases this check on ${calorieBaselineCopy(baseline)}, then reassesses after 7 days.`);
    setText(suggestionNode, `Baseline: ${Math.round(baseline.calories)} kcal/day · Adjustment: ${formatSignedCalories(recommendation.adjustment)} kcal/day → ${recommendation.targetCalories} kcal/day.`);

    const apply = document.getElementById(weeklyCoach ? "weekly-coach-apply" : "goal-check-in-apply");
    if (apply) {
        apply.hidden = false;
        apply.textContent = `Apply ${formatSignedCalories(recommendation.adjustment)} kcal/day`;
    }
    const keep = document.getElementById("weekly-coach-keep");
    if (keep) keep.hidden = false;
}

function syncSuggestedCalories(metrics, phase) {
    if (metrics.isFutureTest) return;

    const currentCalories = Number(phase.currentCalories ?? phase.startCalories);
    if (!Number.isFinite(currentCalories)) return;
    const baseline = getAdaptiveCalorieBaseline(metrics, currentCalories);

    let primary = `${Math.round(baseline.calories)} kcal/day`;
    let secondary = "";
    const trend = metrics.trend;
    const checkDay = Number(trend?.checkDay);
    const target = Number(metrics.targetRateLbPerWeek);
    const actual = Number(metrics.actualRateLbPerWeek);
    const hold = getHold(phase, currentCalories);

    if (hold) {
        primary = `${Math.round(currentCalories)} kcal/day`;
        secondary = `Adjustment applied · reassess in ${hold.daysRemaining} day${hold.daysRemaining === 1 ? "" : "s"}`;
    } else if (metrics.status === "AWAITING WEIGH-IN") {
        secondary = `Awaiting a new weigh-in for the Day ${Number.isFinite(checkDay) ? checkDay : FIRST_CHECK_DAY} assessment`;
    } else if (metrics.status === "PRELIMINARY TREND") {
        secondary = `${calorieBaselineCopy(baseline)} · first calorie decision on Day ${FIRST_CHECK_DAY}`;
    } else if (metrics.status === "BUILDING TREND") {
        secondary = `${calorieBaselineCopy(baseline)} · preliminary trend begins on Day 7`;
    } else if (["ON TRACK", "MAINTAINING"].includes(metrics.status)) {
        secondary = `${calorieBaselineCopy(baseline)} · on track · next check Day ${trend?.nextCheckDay || "--"}`;
    } else if (getHandledCheck(phase, checkDay)) {
        secondary = `Day ${checkDay} check handled · next check Day ${trend?.nextCheckDay || checkDay + 7}`;
    } else if (metrics.recommendationReady && Number.isFinite(actual) && Number.isFinite(target)) {
        const recommendation = buildRecommendation(actual, target, baseline.calories);
        primary = `${recommendation.targetCalories} kcal/day`;
        secondary = `Based on ${Math.round(baseline.calories)} kcal ${calorieBaselineCopy(baseline)} · ${formatSignedCalories(recommendation.adjustment)} kcal/day`;
    } else {
        secondary = "Weekly check is not ready yet";
    }

    const nutritionCard = document.querySelector("#nutrition-current-phase [data-phase-calorie-suggestion]");
    setText(nutritionCard?.querySelector("strong"), primary);
    setText(nutritionCard?.querySelector("small"), secondary);
    setText(document.getElementById("weight-calorie-suggestion"), primary);
    setText(document.getElementById("weight-calorie-suggestion-total"), secondary);
}

function applyFullAdjustment(event) {
    const apply = event.target.closest?.("#weekly-coach-apply, #goal-check-in-apply");
    if (!apply) return;

    const phase = getActiveNutritionPhase();
    if (!phase) return;
    const metrics = getActivePhaseMetrics(phase, { rolling: true });
    if (metrics.isFutureTest || !metrics.recommendationReady) return;

    const actual = Number(metrics.actualRateLbPerWeek);
    const target = Number(metrics.targetRateLbPerWeek);
    const currentCalories = Number(phase.currentCalories ?? phase.startCalories);
    const baseline = getAdaptiveCalorieBaseline(metrics, currentCalories);
    const checkDay = Number(metrics.trend?.checkDay);
    if (!Number.isFinite(actual) || !Number.isFinite(target) || !Number.isFinite(currentCalories) || !Number.isFinite(checkDay) || checkDay < FIRST_CHECK_DAY) return;
    if (["ON TRACK", "MAINTAINING"].includes(metrics.status) || getHandledCheck(phase, checkDay) || getHold(phase, currentCalories)) return;

    const recommendation = buildRecommendation(actual, target, baseline.calories);
    event.preventDefault();
    event.stopImmediatePropagation();

    saveNutritionPhase({
        goalId: phase.goalId,
        maintenanceCalories: phase.maintenanceCalories,
        targetCalories: recommendation.targetCalories
    });
    setCurrentCalories(recommendation.targetCalories, "full weekly phase calorie-gap adjustment");
    markCheckHandled(phase, checkDay, "adjusted-full");
    saveHold(phase, recommendation.targetCalories);
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated", {
        detail: { source: "full-calorie-adjustment" }
    }));
    scheduleRefresh();
}

function refresh() {
    const phase = getActiveNutritionPhase();
    if (!phase) return;
    const metrics = getActivePhaseMetrics(phase, { rolling: true });
    syncCurrentPhaseCard(metrics);
    syncCoach(metrics, phase);
    syncSuggestedCalories(metrics, phase);

    if (!metrics.isFutureTest) {
        setText(
            document.querySelector("#goal-check-in-card[data-weekly-coach='1'] .weekly-coach-method"),
            "The displayed weekly trend uses the same recent regression as Weight Progress. Calorie decisions begin on Day 14 and use the logged calorie average from the aligned 7-day intake window when at least 4 days are logged. Otherwise, Level Up falls back to the current target."
        );
    }
}

function runStabilizedRefresh() {
    refresh();
    window.setTimeout(refresh, 60);
    window.setTimeout(refresh, 160);
    window.setTimeout(() => {
        refresh();
        refreshScheduled = false;
        if (refreshAgain) {
            refreshAgain = false;
            scheduleRefresh();
        }
    }, 360);
}

function scheduleRefresh() {
    if (refreshScheduled) {
        refreshAgain = true;
        return;
    }
    refreshScheduled = true;
    refreshAgain = false;
    window.requestAnimationFrame(runStabilizedRefresh);
}

const content = document.getElementById("content");
if (content) {
    new MutationObserver(() => scheduleRefresh()).observe(content, {
        childList: true,
        subtree: true
    });
}

document.addEventListener("click", applyFullAdjustment, true);
document.addEventListener("click", event => {
    if (event.target.closest?.("#save-weight-btn, .remove-weight-entry, [data-page='energy'], [data-nav='energy'], [data-page='progress'], #weight-tab")) {
        scheduleRefresh();
        window.setTimeout(scheduleRefresh, 300);
    }
}, true);
window.addEventListener("levelup:nutrition-updated", scheduleRefresh);
window.addEventListener("levelup:nutrition-phase-updated", scheduleRefresh);
window.addEventListener("levelup:food-log-updated", scheduleRefresh);
window.addEventListener("pageshow", scheduleRefresh);
window.addEventListener("focus", scheduleRefresh);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleRefresh();
});

scheduleRefresh();
