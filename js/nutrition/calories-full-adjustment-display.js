import {
    getActiveNutritionPhase,
    getActivePhaseMetrics,
    saveNutritionPhase
} from "./nutrition-phase.js?v=calorie-authority-recovery-1";
import { setCurrentCalories } from "./nutrition-storage.js?v=weekly-ma-coach-1";
import { calculateDisplayWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=nutrition-display-regression-1";
import { getLoggedCalorieWindow, localDateKey, previousDateKey } from "./food-log-data.js?v=adaptive-calorie-average-1";
import { buildCoordinatedWeeklyUpdate, markPhaseCheckHandled, readAdjustmentHold, startAdjustmentHold, WEEKLY_ADJUSTMENT_CAP } from "./calorie-adjustment-coordinator.js?v=observed-pace-target-1";
import { getCalculatedMaintenanceEstimate } from "./calculated-maintenance.js?v=weekly-stable-tdee-1";
import { markMaintenanceCheckInReviewed } from "./maintenance-check-in.js?v=calorie-authority-recovery-1";
import { buildPendingCalorieCheckMessage } from "./calorie-check-feedback.js?v=all-calorie-requirements-1";

const FIRST_CHECK_DAY = 14;
const WEIGHT_KEY = "forge_weight_entries";
const WEEKLY_REVIEW_PREVIEW_KEY = "level_up_weekly_review_preview";
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

function setSuggestionHeading(value) {
    setText(document.querySelector("#nutrition-current-phase [data-phase-calorie-suggestion] > span"), value);
    setText(document.querySelector("#weight-calorie-suggestion-card h3"), value);
}

function syncAppliedTargetAcrossSurfaces(targetCalories) {
    const target = Math.round(Number(targetCalories));
    if (!Number.isFinite(target)) return;
    const primary = `${target} kcal/day`;
    const secondary = "Adjustment applied · reassess in 7 days";
    setSuggestionHeading("Current Calorie Target");
    setText(document.getElementById("weight-calorie-suggestion"), primary);
    setText(document.getElementById("weight-calorie-suggestion-total"), secondary);
    const nutritionCard = document.querySelector("#nutrition-current-phase [data-phase-calorie-suggestion]");
    setText(nutritionCard?.querySelector("strong"), primary);
    setText(nutritionCard?.querySelector("small"), secondary);
    hideWeightReview();
    document.querySelector(".progress-weekly-review-alert")?.remove();
}

function ensureWeightReview() {
    const card = document.getElementById("weight-calorie-suggestion-card");
    if (!card) return null;
    let review = card.querySelector("[data-weekly-calorie-review]");
    if (review) return review;
    review = document.createElement("div");
    review.className = "weekly-calorie-review";
    review.dataset.weeklyCalorieReview = "1";
    review.hidden = true;
    review.innerHTML = `
        <div class="weekly-calorie-review-row"><span>Current target</span><strong data-review-current>--</strong></div>
        <div class="weekly-calorie-review-row"><span>Maintenance update</span><strong data-review-maintenance>--</strong></div>
        <div class="weekly-calorie-review-row"><span>Goal progress</span><strong data-review-pace>--</strong></div>
        <div class="weekly-calorie-review-result"><span>New daily target</span><strong data-review-target>--</strong></div>
        <div class="weekly-calorie-review-actions">
            <button id="weight-weekly-review-apply" class="primary-btn" type="button">Update target</button>
            <button id="weight-weekly-review-keep" class="secondary-btn" type="button">Keep current</button>
        </div>`;
    card.appendChild(review);
    return review;
}

function hideWeightReview() {
    const review = document.querySelector("[data-weekly-calorie-review]");
    if (review) review.hidden = true;
}

function showWeightReview(recommendation) {
    const review = ensureWeightReview();
    if (!review || !recommendation) return;
    review.hidden = false;
    setText(review.querySelector("[data-review-current]"), `${recommendation.previousTarget} kcal/day`);
    setText(review.querySelector("[data-review-maintenance]"), `${formatSignedCalories(recommendation.maintenanceChange)} cal/day`);
    setText(review.querySelector("[data-review-pace]"), `${formatSignedCalories(recommendation.paceCorrection)} cal/day`);
    setText(review.querySelector("[data-review-target]"), `${recommendation.targetCalories} kcal/day`);
    const apply = review.querySelector("#weight-weekly-review-apply");
    if (apply) apply.textContent = `Update to ${recommendation.targetCalories}`;
}

function closeWeeklyReviewModal() {
    document.querySelector("[data-weekly-calorie-modal]")?.remove();
}

function openWeeklyReviewModal(event = {}) {
    const phase = getActiveNutritionPhase();
    if (!phase) return;
    const liveMetrics = getActivePhaseMetrics(phase, { rolling: true });
    const preview = event?.detail?.preview === true || sessionStorage.getItem(WEEKLY_REVIEW_PREVIEW_KEY) === "1";
    const visibleTrend = getVisibleTrend(liveMetrics);
    const targetRate = Number(liveMetrics?.targetRateLbPerWeek ?? phase?.targetWeeklyRate);
    const fallbackActual = Number.isFinite(targetRate) ? targetRate - 0.25 : 0;
    const previewActual = Number.isFinite(Number(visibleTrend?.weeklyChange))
        ? Number(visibleTrend.weeklyChange)
        : Number.isFinite(Number(liveMetrics?.actualRateLbPerWeek))
            ? Number(liveMetrics.actualRateLbPerWeek)
            : fallbackActual;
    const metrics = preview
        ? { ...liveMetrics, recommendationReady: true, status: "NEEDS ATTENTION", actualRateLbPerWeek: previewActual, targetRateLbPerWeek: targetRate }
        : liveMetrics;
    const recommendation = buildSharedRecommendation(metrics, phase, { preview });
    if ((!preview && !metrics?.recommendationReady) || !recommendation || (!preview && recommendation.targetChange === 0)) return;

    closeWeeklyReviewModal();
    const modal = document.createElement("div");
    modal.className = "weekly-calorie-modal";
    modal.dataset.weeklyCalorieModal = "1";
    modal.innerHTML = `
        <section class="weekly-calorie-modal-card" role="dialog" aria-modal="true" aria-labelledby="weekly-calorie-modal-title">
            <header><div><span>${preview ? "TEST PREVIEW · " : ""}WEEKLY CALORIE REVIEW</span><h2 id="weekly-calorie-modal-title">Your recommended target</h2></div><button type="button" data-weekly-modal-close aria-label="Close review">×</button></header>
            <p>${preview ? "This demonstrates what the review would show using your current data. Nothing in this preview will be saved." : "Your logged week, full calculation and recommended change now."}</p>
            <div class="weekly-calorie-modal-breakdown">
                <div><span>Current saved target</span><strong>${recommendation.previousTarget} kcal/day</strong></div>
                <div><span>Logged weekly average${recommendation.weeklyAverageLoggedDays ? ` (${recommendation.weeklyAverageLoggedDays}/${recommendation.weeklyAverageTotalDays || 7} days)` : ""}</span><strong>${Number.isFinite(recommendation.weeklyAverageCalories) ? `${recommendation.weeklyAverageCalories} kcal/day` : "Not enough logged days"}</strong></div>
                <div><span>Current weight trend</span><strong>${formatRate(recommendation.actualRate)}</strong></div>
                <div><span>Goal weight trend</span><strong>${formatRate(recommendation.targetRate)}</strong></div>
                <div><span>Calories needed for goal pace</span><strong>${formatSignedCalories(recommendation.requestedPaceCorrection)} cal/day</strong></div>
                <div><span>Calculated target</span><strong>${recommendation.fullTargetCalories} kcal/day</strong></div>
                <div class="weekly-calorie-modal-result"><span>Recommended target now</span><strong>${recommendation.targetCalories} kcal/day</strong></div>
            </div>
            ${recommendation.capped ? `<small class="weekly-calorie-modal-cap">Limited to ${formatSignedCalories(recommendation.behavioralChange ?? recommendation.targetChange)} calories from ${Number.isFinite(recommendation.actualIntakeCalories) ? `your ${recommendation.actualIntakeCalories} weekly average` : "your current target"}. The saved target changes by ${formatSignedCalories(recommendation.targetChange)}. Level Up will reassess next week.</small>` : ""}
            <div class="weekly-calorie-modal-actions">
                <button id="weekly-modal-review-apply" class="primary-btn" type="button">${preview ? `Test update to ${recommendation.targetCalories}` : `Update to ${recommendation.targetCalories}`}</button>
                <button id="weekly-modal-review-keep" class="secondary-btn" type="button">${preview ? "Close preview" : `Keep ${recommendation.previousTarget}`}</button>
            </div>
            <small data-weekly-modal-status aria-live="polite"></small>
        </section>`;
    modal.addEventListener("click", event => {
        if (event.target === modal || event.target.closest?.("[data-weekly-modal-close]")) closeWeeklyReviewModal();
    });
    document.body.appendChild(modal);
    if (preview) {
        const finishPreview = () => {
            sessionStorage.removeItem(WEEKLY_REVIEW_PREVIEW_KEY);
            closeWeeklyReviewModal();
            window.dispatchEvent(new CustomEvent("levelup:maintenance-check-in-updated", { detail: { action: "preview-finished" } }));
        };
        modal.querySelector("#weekly-modal-review-apply")?.addEventListener("click", finishPreview);
        modal.querySelector("#weekly-modal-review-keep")?.addEventListener("click", finishPreview);
    } else {
        modal.querySelector("#weekly-modal-review-apply")?.addEventListener("click", applyEvent => {
            applyFullAdjustment(applyEvent, { phase, metrics, recommendation });
        });
    }
    modal.querySelector("[data-weekly-modal-close]")?.focus();
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

function readCheckState() {
    try {
        const state = JSON.parse(localStorage.getItem("level_up_weekly_phase_checkin_state") || "{}");
        return state && typeof state === "object" && !Array.isArray(state) ? state : {};
    } catch {
        return {};
    }
}

function getHandledCheck(phase, checkDay) {
    if (!phase || !Number.isFinite(Number(checkDay))) return null;
    const key = String(phase?.id || `${phase?.goalId || "phase"}|${phase?.startDate || ""}`);
    const record = readCheckState()?.[key];
    return Number(record?.lastHandledCheckDay) === Number(checkDay) ? record : null;
}

function markCheckHandled(phase, checkDay, action) {
    markPhaseCheckHandled(phase, checkDay, action);
}

function getHold(phase, currentCalories) {
    return readAdjustmentHold({ phase, currentCalories });
}

function buildSharedRecommendation(metrics, phase, { preview = false } = {}) {
    const currentMaintenance = Number(phase?.maintenanceCalories);
    const currentTarget = Number(phase?.currentCalories ?? phase?.startCalories);
    const estimate = getCalculatedMaintenanceEstimate();
    const proposedMaintenance = Number.isFinite(Number(estimate?.maintenanceCalories))
        ? Number(estimate.maintenanceCalories)
        : currentMaintenance;
    const liveBaseline = getAdaptiveCalorieBaseline(metrics, currentTarget);
    const baseline = preview && !liveBaseline.useLoggedAverage
        ? {
            ...liveBaseline,
            calories: currentTarget,
            useLoggedAverage: true,
            intake: { ...(liveBaseline.intake || {}), loggedDays: 7, totalDays: 7, averageCalories: currentTarget }
        }
        : liveBaseline;
    const update = buildCoordinatedWeeklyUpdate({
        currentMaintenance,
        proposedMaintenance,
        currentTarget,
        actualRate: metrics?.actualRateLbPerWeek,
        targetRate: metrics?.targetRateLbPerWeek,
        adaptiveReady: metrics?.recommendationReady === true && !["ON TRACK", "MAINTAINING"].includes(metrics?.status),
        actualIntakeCalories: baseline.useLoggedAverage ? baseline.calories : null,
        maximumChange: WEEKLY_ADJUSTMENT_CAP
    });
    if (!update) return null;
    const fullTargetCalories = Number.isFinite(Number(update.fullRequestedTarget))
        ? Math.round(Number(update.fullRequestedTarget) / 25) * 25
        : update.targetCalories;
    return {
        ...update,
        estimate,
        fullMaintenanceCalories: Math.round(proposedMaintenance),
        fullTargetCalories,
        actualRate: Number(metrics?.actualRateLbPerWeek),
        targetRate: Number(metrics?.targetRateLbPerWeek),
        weeklyAverageCalories: baseline.useLoggedAverage ? Math.round(baseline.calories) : null,
        weeklyAverageLoggedDays: baseline.intake?.loggedDays ?? 0,
        weeklyAverageTotalDays: baseline.intake?.totalDays ?? 7
    };
}

function getAdaptiveCalorieBaseline(metrics, currentCalories) {
    const endDate = previousDateKey(localDateKey());
    let startDate = endDate;
    for (let day = 1; day < 7; day += 1) startDate = previousDateKey(startDate);
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

function pendingFoodLogCopy(baseline) {
    const logged = Math.max(0, Math.round(Number(baseline?.intake?.loggedDays) || 0));
    const needed = Math.max(0, 4 - logged);
    return `No calorie recommendation yet · Log ${needed} more complete food day${needed === 1 ? "" : "s"} in the current 7-day window (${logged}/4)`;
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

    if (metrics.recommendationReady && !baseline.useLoggedAverage) {
        setText(messageNode, `Your current 7-day trend is ${formatRate(actual)} versus a target of ${formatRate(target)}.`);
        setText(suggestionNode, `${pendingFoodLogCopy(baseline)}. Your pace is informational until then.`);
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

    const recommendation = buildSharedRecommendation(metrics, phase);
    if (!recommendation) {
        setText(suggestionNode, "The shared weekly calorie review could not calculate a safe update yet.");
        hideCoachActions();
        return;
    }
    if (recommendation.targetChange === 0) {
        setText(messageNode, `Your current 7-day trend is ${formatRate(actual)} versus a target of ${formatRate(target)}.`);
        setText(suggestionNode, `The combined TDEE and goal-pace review supports keeping calories at ${Math.round(currentCalories)} kcal/day.`);
        hideCoachActions();
        return;
    }
    card.dataset.fullAdjustmentCalories = String(recommendation.targetCalories);
    card.dataset.fullAdjustmentDelta = String(recommendation.targetChange);
    card.dataset.fullAdjustmentCheckDay = String(checkDay);

    setText(messageNode, `Current weekly trend: ${formatRate(actual)} · Target: ${formatRate(target)}. This review applies the trend gap once to your completed-day calorie average, then waits 7 days.`);
    setText(suggestionNode, `Logged average ${recommendation.weeklyAverageCalories} · pace correction ${formatSignedCalories(recommendation.requestedPaceCorrection)} → ${recommendation.targetCalories} kcal/day.`);

    const apply = document.getElementById(weeklyCoach ? "weekly-coach-apply" : "goal-check-in-apply");
    if (apply) {
        apply.hidden = false;
        apply.textContent = `Apply ${formatSignedCalories(recommendation.targetChange)} kcal/day`;
    }
    const keep = document.getElementById("weekly-coach-keep");
    if (keep) keep.hidden = false;
}

function syncSuggestedCalories(metrics, phase) {
    if (metrics.isFutureTest) return;

    const currentCalories = Number(phase.currentCalories ?? phase.startCalories);
    if (!Number.isFinite(currentCalories)) return;
    const baseline = getAdaptiveCalorieBaseline(metrics, currentCalories);

    let primary = `${Math.round(currentCalories)} kcal/day`;
    let secondary = "";
    let heading = "Current Calorie Target";
    const trend = metrics.trend;
    const checkDay = Number(trend?.checkDay);
    const target = Number(metrics.targetRateLbPerWeek);
    const actual = Number(metrics.actualRateLbPerWeek);
    const hold = getHold(phase, currentCalories);
    const visibleRate = getVisibleTrend(metrics)?.weeklyChange;

    if (hold) {
        primary = `${Math.round(currentCalories)} kcal/day`;
        secondary = `Adjustment applied · reassess in ${hold.daysRemaining} day${hold.daysRemaining === 1 ? "" : "s"}`;
    } else if (metrics.status === "AWAITING WEIGH-IN") {
        secondary = buildPendingCalorieCheckMessage({ metrics, visibleRate, foodLoggedDays: baseline?.intake?.loggedDays });
    } else if (metrics.status === "PRELIMINARY TREND") {
        secondary = `${calorieBaselineCopy(baseline)} · first calorie decision on Day ${FIRST_CHECK_DAY}`;
    } else if (metrics.status === "BUILDING TREND") {
        secondary = `${calorieBaselineCopy(baseline)} · preliminary trend begins on Day 7`;
    } else if (metrics.recommendationReady && !baseline.useLoggedAverage) {
        secondary = pendingFoodLogCopy(baseline);
    } else if (metrics.recommendationReady && ["ON TRACK", "MAINTAINING"].includes(metrics.status)) {
        heading = "Suggested Calories";
        secondary = `${calorieBaselineCopy(baseline)} · on track · next check Day ${trend?.nextCheckDay || "--"}`;
    } else if (getHandledCheck(phase, checkDay)) {
        secondary = `Day ${checkDay} check handled · next check Day ${trend?.nextCheckDay || checkDay + 7}`;
    } else if (metrics.recommendationReady && Number.isFinite(actual) && Number.isFinite(target)) {
        heading = "Weekly Calorie Review";
        const recommendation = buildSharedRecommendation(metrics, phase);
        if (!recommendation) return;
        primary = `${recommendation.targetCalories} kcal/day`;
        secondary = recommendation.targetChange === 0
            ? "Your current target still fits your progress."
            : "One recommended update based on your latest progress.";
        if (recommendation.targetChange !== 0) showWeightReview(recommendation);
        else hideWeightReview();
    } else {
        secondary = buildPendingCalorieCheckMessage({ metrics, visibleRate, foodLoggedDays: baseline?.intake?.loggedDays });
    }

    if (!(metrics.recommendationReady && Number.isFinite(actual) && Number.isFinite(target)) || hold || getHandledCheck(phase, checkDay)) {
        hideWeightReview();
    }

    const nutritionCard = document.querySelector("#nutrition-current-phase [data-phase-calorie-suggestion]");
    setSuggestionHeading(heading);
    setText(nutritionCard?.querySelector("strong"), primary);
    setText(nutritionCard?.querySelector("small"), secondary);
    setText(document.getElementById("weight-calorie-suggestion"), primary);
    setText(document.getElementById("weight-calorie-suggestion-total"), secondary);
}

function applyFullAdjustment(event, context = {}) {
    const apply = event.target.closest?.("#weekly-coach-apply, #goal-check-in-apply, #weight-weekly-review-apply, #weekly-modal-review-apply");
    if (!apply) return;

    const phase = context.phase || getActiveNutritionPhase();
    if (!phase) return;
    const metrics = context.metrics || getActivePhaseMetrics(phase, { rolling: true });
    const isExplicitModalRecommendation = Boolean(context.recommendation);
    if (!isExplicitModalRecommendation && (metrics.isFutureTest || !metrics.recommendationReady)) return;

    const actual = Number(metrics.actualRateLbPerWeek);
    const target = Number(metrics.targetRateLbPerWeek);
    const currentCalories = Number(phase.currentCalories ?? phase.startCalories);
    const reportedCheckDay = Number(metrics.trend?.checkDay);
    const phaseDay = Number(metrics.trend?.phaseDay);
    const checkDay = Number.isFinite(reportedCheckDay) && reportedCheckDay >= FIRST_CHECK_DAY
        ? reportedCheckDay
        : Number.isFinite(phaseDay) && phaseDay >= FIRST_CHECK_DAY
            ? phaseDay
            : FIRST_CHECK_DAY;
    if (!Number.isFinite(currentCalories)) return;
    if (!isExplicitModalRecommendation && (!Number.isFinite(actual) || !Number.isFinite(target))) return;
    if (!isExplicitModalRecommendation && (getHandledCheck(phase, checkDay) || getHold(phase, currentCalories))) return;

    const recommendation = context.recommendation || buildSharedRecommendation(metrics, phase);
    if (!recommendation) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    apply.disabled = true;
    apply.textContent = "Updating…";

    let saved;
    try {
        saved = saveNutritionPhase({
            goalId: phase.goalId,
            maintenanceCalories: recommendation.maintenanceCalories,
            targetCalories: recommendation.targetCalories
        });
    } catch (error) {
        console.error("Weekly calorie target save failed:", error);
    }
    if (!saved?.phase || Number(saved.phase.currentCalories ?? saved.phase.startCalories) !== Number(recommendation.targetCalories)) {
        apply.disabled = false;
        apply.textContent = `Update to ${recommendation.targetCalories}`;
        setText(document.querySelector("[data-weekly-modal-status]"), "The target did not save. Please try again.");
        return;
    }
    localStorage.setItem("level_up_manual_maintenance_calories", String(recommendation.maintenanceCalories));
    setCurrentCalories(recommendation.targetCalories, "shared weekly TDEE and phase-pace adjustment");
    markCheckHandled(phase, checkDay, "coordinated-weekly-review");
    markMaintenanceCheckInReviewed({ proposedMaintenance: recommendation.maintenanceCalories }, "coordinated-weekly-review");
    startAdjustmentHold({
        phase,
        calories: recommendation.targetCalories,
        maintenanceCalories: recommendation.maintenanceCalories,
        estimatedTargetCalories: recommendation.targetCalories,
        previousTarget: recommendation.previousTarget,
        previousMaintenance: recommendation.previousMaintenance,
        source: "coordinated-tdee-and-adaptive-update"
    });
    syncAppliedTargetAcrossSurfaces(recommendation.targetCalories);
    window.dispatchEvent(new CustomEvent("levelup:calorie-target-applied", {
        detail: { calories: recommendation.targetCalories, source: "weekly-calorie-review" }
    }));
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated", {
        detail: { source: "full-calorie-adjustment", calories: recommendation.targetCalories }
    }));
    closeWeeklyReviewModal();
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

document.addEventListener("click", applyFullAdjustment);
window.addEventListener("levelup:open-weekly-calorie-review", openWeeklyReviewModal);
window.addEventListener("levelup:nutrition-updated", event => {
    if (event?.detail?.source === "calorie-authority-keep") closeWeeklyReviewModal();
});
document.addEventListener("click", event => {
    if (event.target.closest?.("#save-weight-btn, .remove-weight-entry, [data-page='energy'], [data-nav='energy'], [data-page='progress'], #weight-tab")) {
        scheduleRefresh();
        window.setTimeout(scheduleRefresh, 300);
    }
}, true);
window.addEventListener("levelup:nutrition-updated", scheduleRefresh);
window.addEventListener("levelup:nutrition-phase-updated", scheduleRefresh);
window.addEventListener("levelup:calorie-target-applied", event => {
    syncAppliedTargetAcrossSurfaces(event?.detail?.calories);
    scheduleRefresh();
});
window.addEventListener("levelup:food-log-updated", scheduleRefresh);
window.addEventListener("pageshow", scheduleRefresh);
window.addEventListener("focus", scheduleRefresh);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleRefresh();
});

scheduleRefresh();
