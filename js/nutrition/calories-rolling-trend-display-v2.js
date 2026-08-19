import {
    getActiveNutritionPhase,
    getActivePhaseMetrics
} from "./nutrition-phase.js?v=nutrition-phase-full-window-1";

const FIRST_CHECK_DAY = 14;
const FULL_GAP_INCREMENT = 50;
const FIRST_STEP_INCREMENT = 25;
const MAX_FIRST_STEP = 150;
const CHECK_STATE_KEY = "level_up_weekly_phase_checkin_state";
const HOLD_KEY = "level_up_phase_reassessment_hold";
const HOLD_DAYS = 7;
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
    if (node.childNodes.length === 1 && node.firstChild?.nodeType === Node.TEXT_NODE) {
        node.firstChild.nodeValue = value;
        return true;
    }
    node.textContent = value;
    return true;
}

function phaseKey(phase) {
    return String(phase?.id || `${phase?.goalId || "phase"}|${phase?.startDate || ""}`);
}

function getHandledCheck(phase, checkDay) {
    if (!phase || !Number.isFinite(Number(checkDay))) return null;
    try {
        const state = JSON.parse(localStorage.getItem(CHECK_STATE_KEY) || "{}");
        const record = state?.[phaseKey(phase)];
        return Number(record?.lastHandledCheckDay) === Number(checkDay) ? record : null;
    } catch {
        return null;
    }
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
    return {
        daysRemaining: HOLD_DAYS - daysElapsed,
        estimatedTargetCalories: Number(hold.estimatedTargetCalories) || null
    };
}

function buildRecommendation(actual, target, currentCalories) {
    const rawGap = (Number(target) - Number(actual)) * 500;
    let fullGap = Math.round(rawGap / FULL_GAP_INCREMENT) * FULL_GAP_INCREMENT;
    if (fullGap === 0 && Math.abs(rawGap) > 0.001) fullGap = Math.sign(rawGap) * FULL_GAP_INCREMENT;
    const estimatedTarget = Math.max(1, Math.round(Number(currentCalories) + fullGap));
    let firstStep = Math.round((fullGap * 0.5) / FIRST_STEP_INCREMENT) * FIRST_STEP_INCREMENT;
    if (firstStep === 0 && fullGap !== 0) firstStep = Math.sign(fullGap) * FIRST_STEP_INCREMENT;
    firstStep = Math.max(-MAX_FIRST_STEP, Math.min(MAX_FIRST_STEP, firstStep));
    return {
        fullGap,
        estimatedTarget,
        firstStep,
        firstStepTarget: Math.max(1, Math.round(Number(currentCalories) + firstStep))
    };
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

    const actual = Number(metrics.actualRateLbPerWeek);
    const actualText = Number.isFinite(actual)
        ? `${metrics.status === "PRELIMINARY TREND" ? "Preliminary · " : ""}${formatRate(actual)}`
        : metrics.status === "BUILDING TREND"
            ? "Calibrating"
            : "Need more data";

    setText(actualCell?.querySelector("strong"), actualText);
}

function hideCoachActions() {
    const apply = document.getElementById("weekly-coach-apply");
    const keep = document.getElementById("weekly-coach-keep");
    if (apply) apply.hidden = true;
    if (keep) keep.hidden = true;
}

function syncCoach(metrics, phase) {
    const card = document.getElementById("goal-check-in-card");
    const trend = metrics.trend;
    if (!card || !trend) return;

    const actual = Number(metrics.actualRateLbPerWeek);
    const target = Number(metrics.targetRateLbPerWeek);
    const currentCalories = Number(phase.currentCalories ?? phase.startCalories);
    const checkDay = Number(trend.checkDay);

    setText(document.getElementById("weekly-coach-previous-label"), metrics.status === "PRELIMINARY TREND" ? "Starting Trend" : "Previous 7-Day Avg");
    setText(document.getElementById("weekly-coach-previous"), Number.isFinite(Number(trend.previousAverage)) ? `${Number(trend.previousAverage).toFixed(1)} lb` : "--");
    setText(document.getElementById("weekly-coach-current"), Number.isFinite(Number(trend.currentAverage)) ? `${Number(trend.currentAverage).toFixed(1)} lb` : "--");
    setText(document.getElementById("weekly-coach-actual"), Number.isFinite(actual) ? formatRate(actual) : "--");
    setText(document.getElementById("weekly-coach-target"), Number.isFinite(target) ? formatRate(target) : "--");
    setText(document.getElementById("weekly-coach-status"), metrics.status);

    if (metrics.status === "BUILDING TREND") {
        setText(document.getElementById("weekly-coach-confidence"), `Day ${trend.phaseDay} · preliminary trend Day ${FIRST_CHECK_DAY - 7}`);
        setText(document.getElementById("weekly-coach-message"), `Keep logging weight. A preliminary 7-day trend will appear on Day ${FIRST_CHECK_DAY - 7}. Calorie recommendations wait until Day ${FIRST_CHECK_DAY}.`);
        setText(document.getElementById("weekly-coach-suggestion"), `First calorie decision: Day ${FIRST_CHECK_DAY}.`);
        hideCoachActions();
        return;
    }

    if (metrics.status === "PRELIMINARY TREND") {
        setText(document.getElementById("weekly-coach-confidence"), `Day ${trend.phaseDay} · ${trend.currentEntries} weigh-ins in current 7-day window`);
        setText(document.getElementById("weekly-coach-message"), `Preliminary rolling trend: ${formatRate(actual)}. This is informational until Day ${FIRST_CHECK_DAY}.`);
        setText(document.getElementById("weekly-coach-suggestion"), `No calorie decision before Day ${FIRST_CHECK_DAY}.`);
        hideCoachActions();
        return;
    }

    if (metrics.status === "AWAITING WEIGH-IN") {
        setText(document.getElementById("weekly-coach-confidence"), `Day ${trend.phaseDay} · last weigh-in ${trend.latestEntryDate || "--"}`);
        setText(document.getElementById("weekly-coach-message"), Number.isFinite(actual)
            ? `Your measured weekly trend remains ${formatRate(actual)}. Missing calendar days do not change it.`
            : "The scheduled phase assessment is due, but another weigh-in is needed before it can run.");
        setText(document.getElementById("weekly-coach-suggestion"), `Log a new weigh-in on or after Day ${Number.isFinite(checkDay) ? checkDay : FIRST_CHECK_DAY} to run that assessment.`);
        hideCoachActions();
        return;
    }

    if (!Number.isFinite(actual) || !Number.isFinite(target)) {
        setText(document.getElementById("weekly-coach-confidence"), `Day ${trend.phaseDay || "--"}`);
        setText(document.getElementById("weekly-coach-message"), "Need more weight data before evaluating this phase.");
        setText(document.getElementById("weekly-coach-suggestion"), "Keep logging weight consistently.");
        hideCoachActions();
        return;
    }

    setText(document.getElementById("weekly-coach-confidence"), Number.isFinite(checkDay)
        ? `Day ${checkDay} check · ${trend.previousEntries} + ${trend.currentEntries} weigh-ins`
        : `Day ${trend.phaseDay}`);

    const onTarget = ["ON TRACK", "MAINTAINING"].includes(metrics.status);
    if (onTarget) {
        setText(document.getElementById("weekly-coach-message"), `Your current 7-day trend is ${formatRate(actual)} versus a target of ${formatRate(target)}.`);
        setText(document.getElementById("weekly-coach-suggestion"), Number.isFinite(currentCalories) ? `Keep calories at ${Math.round(currentCalories)} kcal/day.` : "Keep the current plan.");
        hideCoachActions();
        return;
    }

    const hold = getHold(phase, currentCalories);
    if (hold) {
        setText(document.getElementById("weekly-coach-message"), "The last calorie adjustment is still being measured. Hold the current target before another modification.");
        setText(document.getElementById("weekly-coach-suggestion"), `Current target: ${Math.round(currentCalories)} kcal/day · reassess in ${hold.daysRemaining} day${hold.daysRemaining === 1 ? "" : "s"}.`);
        hideCoachActions();
        return;
    }

    if (getHandledCheck(phase, checkDay)) {
        setText(document.getElementById("weekly-coach-message"), `The Day ${checkDay} check-in has already been handled.`);
        setText(document.getElementById("weekly-coach-suggestion"), `Next scheduled check: Day ${trend.nextCheckDay || checkDay + 7}.`);
        hideCoachActions();
        return;
    }

    if (!metrics.recommendationReady || !Number.isFinite(currentCalories)) {
        setText(document.getElementById("weekly-coach-message"), `Current weekly trend: ${formatRate(actual)} · Target: ${formatRate(target)}.`);
        setText(document.getElementById("weekly-coach-suggestion"), "No calorie change is unlocked yet.");
        hideCoachActions();
        return;
    }

    const recommendation = buildRecommendation(actual, target, currentCalories);
    card.dataset.phaseKey = phaseKey(phase);
    card.dataset.checkDay = String(checkDay);
    card.dataset.firstStepCalories = String(recommendation.firstStepTarget);
    card.dataset.firstStepDelta = String(recommendation.firstStep);
    card.dataset.estimatedTargetCalories = String(recommendation.estimatedTarget);

    setText(document.getElementById("weekly-coach-message"), `Current weekly trend: ${formatRate(actual)} · Target: ${formatRate(target)}. Level Up applies 50% of the estimated calorie gap first, capped at ±${MAX_FIRST_STEP} kcal/day.`);
    setText(document.getElementById("weekly-coach-suggestion"), `Estimated target: ${recommendation.estimatedTarget} kcal/day · full gap ${formatSignedCalories(recommendation.fullGap)} kcal/day · suggested step ${formatSignedCalories(recommendation.firstStep)} kcal/day → ${recommendation.firstStepTarget} kcal/day.`);

    const apply = document.getElementById("weekly-coach-apply");
    const keep = document.getElementById("weekly-coach-keep");
    if (apply) {
        apply.hidden = false;
        apply.textContent = `Apply ${formatSignedCalories(recommendation.firstStep)} kcal/day`;
    }
    if (keep) keep.hidden = false;
}

function syncSuggestedCalories(metrics, phase) {
    const currentCalories = Number(phase.currentCalories ?? phase.startCalories);
    if (!Number.isFinite(currentCalories)) return;

    let primary = `${Math.round(currentCalories)} kcal/day`;
    let secondary = "";
    const trend = metrics.trend;
    const checkDay = Number(trend?.checkDay);
    const target = Number(metrics.targetRateLbPerWeek);
    const actual = Number(metrics.actualRateLbPerWeek);
    const hold = getHold(phase, currentCalories);

    if (hold) {
        secondary = `Weekly adjustment applied · reassess in ${hold.daysRemaining} day${hold.daysRemaining === 1 ? "" : "s"}`;
    } else if (metrics.status === "AWAITING WEIGH-IN") {
        secondary = `Awaiting a new weigh-in for the Day ${Number.isFinite(checkDay) ? checkDay : FIRST_CHECK_DAY} assessment`;
    } else if (metrics.status === "PRELIMINARY TREND") {
        secondary = `Preliminary 7-day trend · first calorie decision on Day ${FIRST_CHECK_DAY}`;
    } else if (metrics.status === "BUILDING TREND") {
        secondary = `Preliminary trend begins on Day ${FIRST_CHECK_DAY - 7}`;
    } else if (["ON TRACK", "MAINTAINING"].includes(metrics.status)) {
        secondary = `On track · next check Day ${trend?.nextCheckDay || "--"}`;
    } else if (getHandledCheck(phase, checkDay)) {
        secondary = `Day ${checkDay} check handled · next check Day ${trend?.nextCheckDay || checkDay + 7}`;
    } else if (metrics.recommendationReady && Number.isFinite(actual) && Number.isFinite(target)) {
        const recommendation = buildRecommendation(actual, target, currentCalories);
        primary = `${recommendation.estimatedTarget} kcal/day`;
        secondary = `Weekly gap ${formatSignedCalories(recommendation.fullGap)} · First step ${formatSignedCalories(recommendation.firstStep)} → ${recommendation.firstStepTarget} kcal/day`;
    } else {
        secondary = "Weekly check is not ready yet";
    }

    const card = document.querySelector("#nutrition-current-phase [data-phase-calorie-suggestion]");
    setText(card?.querySelector("strong"), primary);
    setText(card?.querySelector("small"), secondary);
    setText(document.getElementById("weight-calorie-suggestion"), primary);
    setText(document.getElementById("weight-calorie-suggestion-total"), secondary);
}

function refresh() {
    const phase = getActiveNutritionPhase();
    if (!phase) return;

    const metrics = getActivePhaseMetrics(phase, { rolling: true });
    syncCurrentPhaseCard(metrics);
    syncCoach(metrics, phase);
    syncSuggestedCalories(metrics, phase);
    setText(
        document.querySelector("#goal-check-in-card[data-weekly-coach='1'] .weekly-coach-method"),
        "The displayed weekly trend always compares the two complete 7-day windows ending on your latest weigh-in. The phase start controls when calorie decisions unlock; it does not truncate the comparison window."
    );
}

function runStabilizedRefresh() {
    refresh();
    window.setTimeout(refresh, 40);
    window.setTimeout(refresh, 120);
    window.setTimeout(() => {
        refresh();
        refreshScheduled = false;
        if (refreshAgain) {
            refreshAgain = false;
            scheduleRefresh();
        }
    }, 300);
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
    new MutationObserver(() => {
        if (document.getElementById("nutrition-current-phase") || document.getElementById("goal-check-in-card")) {
            scheduleRefresh();
        }
    }).observe(content, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

window.addEventListener("levelup:nutrition-updated", scheduleRefresh);
window.addEventListener("levelup:nutrition-phase-updated", scheduleRefresh);
window.addEventListener("pageshow", scheduleRefresh);
window.addEventListener("focus", scheduleRefresh);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleRefresh();
});

document.addEventListener("click", event => {
    if (event.target.closest?.("#save-weight-btn, .remove-weight-entry, [data-page='energy'], [data-nav='energy']")) {
        scheduleRefresh();
        window.setTimeout(scheduleRefresh, 300);
    }
}, true);

scheduleRefresh();
