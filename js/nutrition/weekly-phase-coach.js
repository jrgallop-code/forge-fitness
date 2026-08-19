import { calculatePhaseMovingAverageTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=phase-weighin-anchor-1";
import { saveNutritionPhase } from "./nutrition-phase.js?v=phase-weighin-anchor-1";
import { setCurrentCalories } from "./nutrition-storage.js?v=weekly-ma-coach-1";

const PHASES_KEY = "level_up_nutrition_phases";
const WEIGHT_KEY = "forge_weight_entries";
const HOLD_KEY = "level_up_phase_reassessment_hold";
const CHECK_STATE_KEY = "level_up_weekly_phase_checkin_state";
const FIRST_TREND_DAY = 7;
const FIRST_CHECK_DAY = 14;
const MIN_ENTRIES_PER_WINDOW = 4;
const HOLD_DAYS = 7;
const FULL_GAP_INCREMENT = 50;
const FIRST_STEP_FRACTION = 0.5;
const FIRST_STEP_INCREMENT = 25;
const MAX_FIRST_STEP = 150;
const BODYWEIGHT_TOLERANCE_PCT = 0.001;
const TARGET_TOLERANCE_FRACTION = 0.25;
const DEFAULT_TOLERANCE_LB = 0.1;
const DAY_MS = 86400000;

let refreshQueued = false;

function readPhases() {
    try {
        const value = JSON.parse(localStorage.getItem(PHASES_KEY) || "[]");
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function getActivePhase() {
    return [...readPhases()].reverse().find(phase => phase && !phase.endDate && phase.goalId) || null;
}

function readWeights() {
    try {
        return normalizeWeightEntries(JSON.parse(localStorage.getItem(WEIGHT_KEY) || "[]"));
    } catch {
        return [];
    }
}

function getStartingTrendWeight(phase, weights) {
    const saved = Number(phase?.startingTrendWeight);
    if (Number.isFinite(saved) && saved > 0) return saved;
    const eligible = normalizeWeightEntries(weights).filter(entry => entry.date <= phase?.startDate);
    if (!eligible.length) return null;
    const latest = eligible.at(-1);
    const cutoff = dateMs(latest.date) - (6 * DAY_MS);
    const recent = eligible.filter(entry => dateMs(entry.date) >= cutoff);
    if (!recent.length) return latest.weight;
    return recent.reduce((sum, entry) => sum + entry.weight, 0) / recent.length;
}

function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateMs(value) {
    return new Date(`${value}T12:00:00`).getTime();
}

function phaseKey(phase) {
    return String(phase?.id || `${phase?.goalId || "phase"}|${phase?.startDate || ""}`);
}

function readCheckState() {
    try {
        const value = JSON.parse(localStorage.getItem(CHECK_STATE_KEY) || "{}");
        return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
        return {};
    }
}

function isCheckHandled(phase, checkDay) {
    if (!phase || !Number.isFinite(Number(checkDay))) return false;
    const state = readCheckState()[phaseKey(phase)];
    return Number(state?.lastHandledCheckDay) === Number(checkDay);
}

function markCheckHandled(phase, checkDay, action) {
    if (!phase || !Number.isFinite(Number(checkDay))) return;
    const state = readCheckState();
    state[phaseKey(phase)] = {
        lastHandledCheckDay: Number(checkDay),
        action: String(action || "kept"),
        handledAt: new Date().toISOString()
    };
    localStorage.setItem(CHECK_STATE_KEY, JSON.stringify(state));
}

function getHold(phase, currentCalories) {
    let hold;
    try { hold = JSON.parse(localStorage.getItem(HOLD_KEY) || "null"); }
    catch { hold = null; }
    if (!hold || !phase || hold.phaseId !== phase.id) return null;
    if (Math.round(Number(hold.calories)) !== Math.round(Number(currentCalories))) {
        localStorage.removeItem(HOLD_KEY);
        return null;
    }
    const appliedTime = new Date(hold.appliedAt).getTime();
    if (!Number.isFinite(appliedTime)) {
        localStorage.removeItem(HOLD_KEY);
        return null;
    }
    const daysElapsed = Math.max(0, Math.floor((Date.now() - appliedTime) / DAY_MS));
    if (daysElapsed >= HOLD_DAYS) {
        localStorage.removeItem(HOLD_KEY);
        return null;
    }
    return {
        daysElapsed,
        daysRemaining: HOLD_DAYS - daysElapsed,
        estimatedTargetCalories: Number(hold.estimatedTargetCalories) || null
    };
}

function saveHold(phase, calories, estimatedTargetCalories) {
    localStorage.setItem(HOLD_KEY, JSON.stringify({
        phaseId: phase.id,
        calories: Math.round(calories),
        estimatedTargetCalories: Math.round(estimatedTargetCalories),
        appliedAt: new Date().toISOString()
    }));
}

function evaluateRate(actual, target, referenceWeight) {
    const actualRate = Number(actual);
    const targetRate = Number(target);
    const weight = Number(referenceWeight);
    const bodyweightTolerance = Number.isFinite(weight) && weight > 0
        ? weight * BODYWEIGHT_TOLERANCE_PCT
        : DEFAULT_TOLERANCE_LB;
    const targetTolerance = Number.isFinite(targetRate)
        ? Math.abs(targetRate) * TARGET_TOLERANCE_FRACTION
        : 0;
    const tolerance = Math.max(bodyweightTolerance, targetTolerance);

    if (!Number.isFinite(actualRate) || !Number.isFinite(targetRate)) {
        return { status: "NEED MORE DATA", tolerance };
    }

    if (Math.abs(targetRate) < 0.005) {
        if (Math.abs(actualRate) <= tolerance) return { status: "MAINTAINING", tolerance };
        return { status: actualRate > 0 ? "TRENDING UP" : "TRENDING DOWN", tolerance };
    }

    const difference = actualRate - targetRate;
    const absoluteDifference = Math.abs(difference);
    if (absoluteDifference <= tolerance) return { status: "ON TRACK", tolerance };
    if (absoluteDifference <= tolerance * 2) {
        const paceDifference = difference * Math.sign(targetRate);
        return { status: paceDifference > 0 ? "SLIGHTLY FASTER" : "SLIGHTLY SLOWER", tolerance };
    }
    return { status: "NEEDS ATTENTION", tolerance };
}

function buildCalorieRecommendation({ actual, target, currentCalories }) {
    const rawGap = (Number(target) - Number(actual)) * 500;
    let fullGapCalories = Math.round(rawGap / FULL_GAP_INCREMENT) * FULL_GAP_INCREMENT;
    if (fullGapCalories === 0 && Math.abs(rawGap) > 0.001) {
        fullGapCalories = Math.sign(rawGap) * FULL_GAP_INCREMENT;
    }

    const estimatedTargetCalories = Math.max(1, Math.round(Number(currentCalories) + fullGapCalories));
    let firstStepDelta = Math.round((fullGapCalories * FIRST_STEP_FRACTION) / FIRST_STEP_INCREMENT) * FIRST_STEP_INCREMENT;
    if (firstStepDelta === 0 && fullGapCalories !== 0) {
        firstStepDelta = Math.sign(fullGapCalories) * FIRST_STEP_INCREMENT;
    }
    firstStepDelta = Math.max(-MAX_FIRST_STEP, Math.min(MAX_FIRST_STEP, firstStepDelta));
    const firstStepCalories = Math.max(1, Math.round(Number(currentCalories) + firstStepDelta));

    return { fullGapCalories, estimatedTargetCalories, firstStepDelta, firstStepCalories };
}

function ensureStyles() {
    if (document.getElementById("weekly-phase-coach-styles")) return;
    const style = document.createElement("style");
    style.id = "weekly-phase-coach-styles";
    style.textContent = `
        #goal-check-in-card[data-weekly-coach="1"] .weekly-coach-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}
        #goal-check-in-card[data-weekly-coach="1"] .weekly-coach-metric{padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:10px;background:rgba(255,255,255,.025)}
        #goal-check-in-card[data-weekly-coach="1"] .weekly-coach-metric span{display:block;color:var(--muted,#a1a1aa);font-size:10px;text-transform:uppercase;letter-spacing:.04em}
        #goal-check-in-card[data-weekly-coach="1"] .weekly-coach-metric strong{display:block;margin-top:3px;font-size:14px}
        #goal-check-in-card[data-weekly-coach="1"] .weekly-coach-actions{display:flex;gap:8px;margin-top:10px}
        #goal-check-in-card[data-weekly-coach="1"] .weekly-coach-actions button{flex:1;min-height:44px}
        #goal-check-in-card[data-weekly-coach="1"] .weekly-coach-method{margin:8px 0 0;color:var(--muted,#a1a1aa);font-size:10px;line-height:1.4}
        #goal-check-in-card[data-weekly-coach="1"] .weekly-coach-test{margin-top:14px;border-top:1px solid rgba(255,255,255,.10);padding-top:10px}
        #goal-check-in-card[data-weekly-coach="1"] .weekly-coach-test summary{cursor:pointer;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
        #goal-check-in-card[data-weekly-coach="1"] .weekly-coach-test select{width:100%;margin:10px 0 8px}
        #goal-check-in-card[data-weekly-coach="1"] .weekly-test-result{padding:10px;border-radius:10px;background:rgba(255,255,255,.035);font-size:11px;line-height:1.45}
        #goal-check-in-card[data-weekly-coach="1"] .weekly-test-result strong{font-size:12px}
        #goal-check-in-card[data-weekly-coach="1"] .weekly-test-note{display:block;margin-top:6px;color:var(--muted,#a1a1aa);font-size:9px}
        @media(max-width:390px){#goal-check-in-card[data-weekly-coach="1"] .weekly-coach-grid{gap:6px}#goal-check-in-card[data-weekly-coach="1"] .weekly-coach-metric{padding:9px 8px}}
    `;
    document.head.appendChild(style);
}

function ensureCoachCard() {
    const oldCard = document.getElementById("goal-check-in-card");
    if (!oldCard || oldCard.dataset.weeklyCoach === "1") return oldCard;

    oldCard.dataset.weeklyCoach = "1";
    oldCard.innerHTML = `
        <span class="eyebrow">PHASE CHECK-IN</span>
        <div class="goal-check-in-heading"><h3 id="weekly-coach-status">BUILDING TREND</h3><small id="weekly-coach-confidence"></small></div>
        <p id="weekly-coach-message" class="nutrition-message"></p>
        <div class="weekly-coach-grid">
            <div class="weekly-coach-metric"><span id="weekly-coach-previous-label">Previous 7-Day Avg</span><strong id="weekly-coach-previous">--</strong></div>
            <div class="weekly-coach-metric"><span>Current 7-Day Avg</span><strong id="weekly-coach-current">--</strong></div>
            <div class="weekly-coach-metric"><span>Weekly Change</span><strong id="weekly-coach-actual">--</strong></div>
            <div class="weekly-coach-metric"><span>Target</span><strong id="weekly-coach-target">--</strong></div>
        </div>
        <strong id="weekly-coach-suggestion"></strong>
        <div class="weekly-coach-actions">
            <button id="weekly-coach-apply" class="primary-btn" type="button" hidden></button>
            <button id="weekly-coach-keep" class="secondary-btn" type="button" hidden>Keep Current Target</button>
        </div>
        <p class="weekly-coach-method">The weight trend starts on Day 7 and moves forward only when you log a new weigh-in. Calorie decisions begin on Day 14 and repeat on the weekly schedule, but a new assessment will wait for new weight data. Each 7-day comparison window still needs at least 4 weigh-ins.</p>
        <details class="weekly-coach-test" id="weekly-coach-test-lab">
            <summary>Coach Test Scenarios</summary>
            <small class="weekly-test-note">Simulation only — these examples do not change your saved phase or weigh-ins.</small>
            <select id="weekly-coach-test-select" aria-label="Coach test scenario"></select>
            <div id="weekly-coach-test-result" class="weekly-test-result"></div>
        </details>`;

    const select = oldCard.querySelector("#weekly-coach-test-select");
    if (select) {
        select.innerHTML = TEST_SCENARIOS.map(scenario => `<option value="${scenario.id}">${scenario.label}</option>`).join("");
        select.addEventListener("change", renderSelectedTestScenario);
    }
    oldCard.querySelector("#weekly-coach-keep")?.addEventListener("click", keepCurrentTarget);
    oldCard.querySelector("#weekly-coach-apply")?.addEventListener("click", applyRecommendation);
    renderSelectedTestScenario();
    return oldCard;
}

function refreshCoach() {
    ensureStyles();
    const card = ensureCoachCard();
    if (!card) return;

    const phase = getActivePhase();
    if (!phase) {
        setText("weekly-coach-status", "NO ACTIVE PHASE");
        setText("weekly-coach-confidence", "");
        setText("weekly-coach-message", "Start a nutrition phase and log weight to begin trend tracking.");
        setText("weekly-coach-previous-label", "Previous 7-Day Avg");
        clearMetrics();
        hideActions();
        return;
    }

    const allWeights = readWeights();
    const entries = allWeights.filter(entry => entry.date >= phase.startDate);
    const startingTrendWeight = getStartingTrendWeight(phase, allWeights);
    const asOfDate = localDate();
    const phaseDay = Math.max(1, Math.floor((dateMs(asOfDate) - dateMs(phase.startDate)) / DAY_MS) + 1);
    const trend = calculatePhaseMovingAverageTrend(entries, {
        phaseStartDate: phase.startDate,
        asOfDate,
        startingTrendWeight,
        minEntriesPerWindow: MIN_ENTRIES_PER_WINDOW,
        rolling: phaseDay < FIRST_CHECK_DAY
    });
    const target = Number(phase.targetWeeklyRate);
    const currentCalories = Number(phase.currentCalories ?? phase.startCalories);

    setText("weekly-coach-previous", Number.isFinite(trend.previousAverage) ? `${trend.previousAverage.toFixed(1)} lb` : "--");
    setText("weekly-coach-current", Number.isFinite(trend.currentAverage) ? `${trend.currentAverage.toFixed(1)} lb` : "--");
    setText("weekly-coach-actual", Number.isFinite(trend.weeklyChange) ? formatRate(trend.weeklyChange) : "--");
    setText("weekly-coach-target", Number.isFinite(target) ? formatRate(target) : "--");

    if (trend.reason === "before-first-trend") {
        setText("weekly-coach-previous-label", "Starting Trend");
        setText("weekly-coach-status", "BUILDING TREND");
        setText("weekly-coach-confidence", `Day ${trend.phaseDay} · preliminary trend Day ${FIRST_TREND_DAY}`);
        setText("weekly-coach-message", `Keep logging weight. A preliminary 7-day trend will appear on Day ${FIRST_TREND_DAY}. Calorie recommendations still wait until Day ${FIRST_CHECK_DAY}.`);
        setText("weekly-coach-suggestion", `Preliminary trend in ${trend.daysUntilTrend} day${trend.daysUntilTrend === 1 ? "" : "s"}.`);
        hideActions();
        syncCurrentPhaseSummary(phase);
        return;
    }

    if (trend.status === "preliminary" && Number.isFinite(trend.weeklyChange)) {
        setText("weekly-coach-previous-label", "Starting Trend");
        setText("weekly-coach-status", "PRELIMINARY TREND");
        setText("weekly-coach-confidence", `Day ${trend.phaseDay} · ${trend.currentEntries} weigh-ins in current 7-day window`);
        setText("weekly-coach-message", `Preliminary rolling trend: ${formatRate(trend.weeklyChange)}. This compares your latest 7-day moving average with your phase starting trend.`);
        setText("weekly-coach-suggestion", `Informational only. First calorie decision is Day ${FIRST_CHECK_DAY}${trend.daysUntilCheck > 0 ? ` · in ${trend.daysUntilCheck} day${trend.daysUntilCheck === 1 ? "" : "s"}` : ""}.`);
        hideActions();
        syncCurrentPhaseSummary(phase);
        return;
    }

    setText("weekly-coach-previous-label", "Previous 7-Day Avg");

    if (trend.awaitingNewWeighIn) {
        setText("weekly-coach-status", "AWAITING WEIGH-IN");
        setText("weekly-coach-confidence", `Day ${trend.phaseDay} · last weigh-in ${trend.latestEntryDate || "--"}`);
        setText("weekly-coach-message", Number.isFinite(trend.weeklyChange)
            ? `Your measured weekly change remains ${formatRate(trend.weeklyChange)}. It will not change just because more calendar days pass.`
            : "The next phase assessment is due, but there is not enough new weight data to advance the trend.");
        setText("weekly-coach-suggestion", `Log a new weigh-in to advance the trend and unlock the Day ${trend.nextCheckDay} assessment.`);
        hideActions();
        syncCurrentPhaseSummary(phase);
        return;
    }

    if (trend.status !== "actual" || !Number.isFinite(trend.weeklyChange)) {
        setText("weekly-coach-status", "NEED MORE DATA");
        if (Number.isFinite(trend.checkDay)) {
            setText("weekly-coach-confidence", `Day ${trend.checkDay} check · ${trend.previousEntries}/${MIN_ENTRIES_PER_WINDOW} + ${trend.currentEntries}/${MIN_ENTRIES_PER_WINDOW} weigh-ins`);
            setText("weekly-coach-message", `The Day ${trend.checkDay} check needs at least ${MIN_ENTRIES_PER_WINDOW} weigh-ins in each 7-day block. Keep logging weight.`);
            setText("weekly-coach-suggestion", `No calorie change from sparse data. Next scheduled check: Day ${trend.nextCheckDay}.`);
        } else {
            setText("weekly-coach-confidence", `Day ${trend.phaseDay}`);
            setText("weekly-coach-message", `At least ${MIN_ENTRIES_PER_WINDOW} weigh-ins are needed in the current 7-day window to show a preliminary trend.`);
            setText("weekly-coach-suggestion", `Keep logging weight. First calorie decision remains Day ${FIRST_CHECK_DAY}.`);
        }
        hideActions();
        syncCurrentPhaseSummary(phase);
        return;
    }

    const evaluation = evaluateRate(trend.weeklyChange, target, trend.currentAverage);
    setText("weekly-coach-status", evaluation.status);
    setText("weekly-coach-confidence", `Day ${trend.checkDay} check · ${trend.previousEntries} + ${trend.currentEntries} weigh-ins`);
    syncCurrentPhaseSummary(phase);

    const onTarget = ["ON TRACK", "MAINTAINING"].includes(evaluation.status);
    if (onTarget) {
        setText("weekly-coach-message", `Your 7-day average changed ${formatRate(trend.weeklyChange)} versus a target of ${formatRate(target)}. This is inside the current tolerance range.`);
        setText("weekly-coach-suggestion", Number.isFinite(currentCalories) ? `Keep calories at ${Math.round(currentCalories)} kcal/day. Next scheduled check: Day ${trend.nextCheckDay}.` : `Next scheduled check: Day ${trend.nextCheckDay}.`);
        hideActions();
        return;
    }

    const hold = getHold(phase, currentCalories);
    if (hold) {
        setText("weekly-coach-message", "The last calorie adjustment is still being measured. Hold the current target for a full 7 days before another modification.");
        setText("weekly-coach-suggestion", `Current target: ${Math.round(currentCalories)} kcal/day · reassess in ${hold.daysRemaining} day${hold.daysRemaining === 1 ? "" : "s"}.`);
        hideActions();
        return;
    }

    if (isCheckHandled(phase, trend.checkDay)) {
        setText("weekly-coach-message", `The Day ${trend.checkDay} check-in has already been handled. Keep the current target until the next weekly check.`);
        setText("weekly-coach-suggestion", `Next scheduled check: Day ${trend.nextCheckDay}.`);
        hideActions();
        return;
    }

    if (!Number.isFinite(currentCalories) || !Number.isFinite(target)) {
        setText("weekly-coach-message", "A valid calorie target and phase rate are required before Level Up can recommend an adjustment.");
        setText("weekly-coach-suggestion", "");
        hideActions();
        return;
    }

    const recommendation = buildCalorieRecommendation({ actual: trend.weeklyChange, target, currentCalories });
    card.dataset.phaseKey = phaseKey(phase);
    card.dataset.checkDay = String(trend.checkDay);
    card.dataset.firstStepCalories = String(recommendation.firstStepCalories);
    card.dataset.firstStepDelta = String(recommendation.firstStepDelta);
    card.dataset.estimatedTargetCalories = String(recommendation.estimatedTargetCalories);

    setText("weekly-coach-message", `Actual: ${formatRate(trend.weeklyChange)} · Target: ${formatRate(target)}. The coach estimates the calorie gap, applies 50% first, caps a single weekly step at ±${MAX_FIRST_STEP} kcal/day, then checks again after 7 days.`);
    setText("weekly-coach-suggestion", `Estimated target: ${recommendation.estimatedTargetCalories} kcal/day · full gap ${formatSignedCalories(recommendation.fullGapCalories)} kcal/day · suggested step ${formatSignedCalories(recommendation.firstStepDelta)} kcal/day → ${recommendation.firstStepCalories} kcal/day.`);

    const apply = document.getElementById("weekly-coach-apply");
    const keep = document.getElementById("weekly-coach-keep");
    if (apply) {
        apply.hidden = false;
        apply.textContent = `Apply ${formatSignedCalories(recommendation.firstStepDelta)} kcal/day`;
    }
    if (keep) keep.hidden = false;
}

function applyRecommendation() {
    const phase = getActivePhase();
    const card = document.getElementById("goal-check-in-card");
    if (!phase || !card || card.dataset.phaseKey !== phaseKey(phase)) return;

    const checkDay = Number(card.dataset.checkDay);
    const firstStepCalories = Number(card.dataset.firstStepCalories);
    const firstStepDelta = Number(card.dataset.firstStepDelta);
    const estimatedTargetCalories = Number(card.dataset.estimatedTargetCalories);
    if (!Number.isFinite(checkDay) || checkDay < FIRST_CHECK_DAY || !Number.isFinite(firstStepCalories) || !Number.isFinite(firstStepDelta)) return;

    saveNutritionPhase({
        goalId: phase.goalId,
        maintenanceCalories: phase.maintenanceCalories,
        targetCalories: firstStepCalories
    });
    setCurrentCalories(firstStepCalories, "weekly 7-day moving-average phase adjustment");
    markCheckHandled(phase, checkDay, "adjusted");
    saveHold(phase, firstStepCalories, estimatedTargetCalories);
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated", { detail: { source: "weekly-phase-coach" } }));
    scheduleRefresh();
}

function keepCurrentTarget() {
    const phase = getActivePhase();
    const card = document.getElementById("goal-check-in-card");
    const checkDay = Number(card?.dataset.checkDay);
    if (!phase || !Number.isFinite(checkDay) || checkDay < FIRST_CHECK_DAY) return;
    markCheckHandled(phase, checkDay, "kept");
    scheduleRefresh();
}

function hideActions() {
    const apply = document.getElementById("weekly-coach-apply");
    const keep = document.getElementById("weekly-coach-keep");
    if (apply) {
        apply.hidden = true;
        apply.onclick = null;
    }
    if (keep) keep.hidden = true;
}

function clearMetrics() {
    ["weekly-coach-previous", "weekly-coach-current", "weekly-coach-actual", "weekly-coach-target", "weekly-coach-suggestion"].forEach(id => setText(id, "--"));
}

function syncCurrentPhaseSummary(phase) {
    const host = document.getElementById("nutrition-current-phase");
    if (!host || !phase) return;

    const allWeights = readWeights();
    const entries = allWeights.filter(entry => entry.date >= phase.startDate);
    const startingTrendWeight = getStartingTrendWeight(phase, allWeights);
    const liveTrend = calculatePhaseMovingAverageTrend(entries, {
        phaseStartDate: phase.startDate,
        asOfDate: localDate(),
        startingTrendWeight,
        minEntriesPerWindow: MIN_ENTRIES_PER_WINDOW,
        rolling: true
    });
    const target = Number(phase.targetWeeklyRate);

    let status = "NEED MORE DATA";
    if (liveTrend.reason === "before-first-trend") {
        status = "BUILDING TREND";
    } else if (liveTrend.status === "preliminary" && Number.isFinite(liveTrend.weeklyChange)) {
        status = "PRELIMINARY TREND";
    } else if (liveTrend.awaitingNewWeighIn) {
        status = "AWAITING WEIGH-IN";
    } else if (liveTrend.status === "actual" && Number.isFinite(liveTrend.weeklyChange)) {
        status = evaluateRate(liveTrend.weeklyChange, target, liveTrend.currentAverage).status;
    }

    const badge = host.querySelector(".nutrition-current-phase-head b");
    if (badge && badge.textContent !== status) badge.textContent = status;
    const grid = host.querySelector(".nutrition-current-phase-grid");
    if (!grid) return;
    const actualCell = [...grid.children].find(cell => cell.querySelector("span")?.textContent?.trim() === "Actual Since Start");
    const strong = actualCell?.querySelector("strong");
    const actualText = Number.isFinite(liveTrend.weeklyChange)
        ? `${status === "PRELIMINARY TREND" ? "Preliminary · " : ""}${formatRate(liveTrend.weeklyChange)}`
        : status === "BUILDING TREND" ? "Calibrating" : "Need more data";
    if (strong && strong.textContent !== actualText) strong.textContent = actualText;
}

function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
        refreshQueued = false;
        refreshCoach();
    });
}

function setText(id, value) {
    const node = document.getElementById(id);
    if (node && node.textContent !== value) node.textContent = value;
}

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

function addDays(value, days) {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + days);
    return localDate(date);
}

const TEST_SCENARIOS = [
    { id: "day5", label: "Day 5 · Building trend", day: 5, target: 0.25, actual: 0.25, currentCalories: 2400, phaseLabel: "Lean Bulk" },
    { id: "day7", label: "Day 7 · Preliminary trend", day: 7, target: 0.25, actual: 0.25, currentCalories: 2400, phaseLabel: "Lean Bulk" },
    { id: "day10", label: "Day 10 · Preliminary trend", day: 10, target: 0.25, actual: 0.25, currentCalories: 2400, phaseLabel: "Lean Bulk" },
    { id: "bulk-on", label: "Day 14 · Lean bulk on target", day: 14, target: 0.25, actual: 0.28, currentCalories: 2400, phaseLabel: "Lean Bulk" },
    { id: "bulk-slow", label: "Day 14 · Lean bulk too slow", day: 14, target: 0.25, actual: -0.15, currentCalories: 2400, phaseLabel: "Lean Bulk" },
    { id: "bulk-fast", label: "Day 14 · Lean bulk too fast", day: 14, target: 0.25, actual: 0.75, currentCalories: 2400, phaseLabel: "Lean Bulk" },
    { id: "sparse", label: "Day 14 · Not enough weigh-ins", day: 14, target: 0.25, actual: 0.25, currentCalories: 2400, phaseLabel: "Lean Bulk", sparse: true },
    { id: "day21-slight", label: "Day 21 · Slightly slow bulk", day: 21, target: 0.25, actual: 0.05, currentCalories: 2500, phaseLabel: "Lean Bulk" },
    { id: "cut-slow", label: "Day 21 · Fat loss too slow", day: 21, target: -0.5, actual: -0.1, currentCalories: 1900, phaseLabel: "Fat Loss" },
    { id: "cut-fast", label: "Day 21 · Fat loss too fast", day: 21, target: -0.5, actual: -1.1, currentCalories: 1900, phaseLabel: "Fat Loss" }
];

function buildScenarioEntries(scenario) {
    const startDate = "2026-01-01";
    const daysToBuild = Math.max(1, Number(scenario.day));
    const rows = [];
    for (let day = 1; day <= daysToBuild; day += 1) {
        if (scenario.sparse) {
            const dayInBlock = ((day - 1) % 7) + 1;
            if (![1, 3, 5].includes(dayInBlock)) continue;
        }
        rows.push({
            date: addDays(startDate, day - 1),
            weight: 165 + (((day - 1) / 7) * Number(scenario.actual))
        });
    }
    return { startDate, rows, startingTrendWeight: 165 };
}

function renderSelectedTestScenario() {
    const select = document.getElementById("weekly-coach-test-select");
    const host = document.getElementById("weekly-coach-test-result");
    if (!select || !host) return;
    const scenario = TEST_SCENARIOS.find(item => item.id === select.value) || TEST_SCENARIOS[0];
    const generated = buildScenarioEntries(scenario);
    const asOfDate = addDays(generated.startDate, scenario.day - 1);
    const trend = calculatePhaseMovingAverageTrend(generated.rows, {
        phaseStartDate: generated.startDate,
        asOfDate,
        startingTrendWeight: generated.startingTrendWeight,
        minEntriesPerWindow: MIN_ENTRIES_PER_WINDOW,
        rolling: scenario.day < FIRST_CHECK_DAY
    });

    if (trend.reason === "before-first-trend") {
        host.innerHTML = `<strong>BUILDING TREND</strong><br>Phase day ${trend.phaseDay}. Preliminary trend appears on Day ${FIRST_TREND_DAY}; first calorie decision is Day ${FIRST_CHECK_DAY}.`;
        return;
    }

    if (trend.status === "preliminary") {
        host.innerHTML = `<strong>PRELIMINARY TREND</strong><br>Phase day ${trend.phaseDay} · starting trend ${trend.previousAverage.toFixed(2)} lb · current 7-day average ${trend.currentAverage.toFixed(2)} lb<br>Preliminary change ${formatRate(trend.weeklyChange)}. No calorie adjustment before Day ${FIRST_CHECK_DAY}.`;
        return;
    }

    if (trend.status !== "actual") {
        host.innerHTML = `<strong>NEED MORE DATA</strong><br>Day ${trend.checkDay || trend.phaseDay}: previous block ${trend.previousEntries}/${MIN_ENTRIES_PER_WINDOW} weigh-ins, current block ${trend.currentEntries}/${MIN_ENTRIES_PER_WINDOW}. No calorie change.`;
        return;
    }

    const evaluation = evaluateRate(trend.weeklyChange, scenario.target, trend.currentAverage);
    const onTarget = ["ON TRACK", "MAINTAINING"].includes(evaluation.status);
    const recommendation = onTarget ? null : buildCalorieRecommendation({
        actual: trend.weeklyChange,
        target: scenario.target,
        currentCalories: scenario.currentCalories
    });

    host.innerHTML = `
        <strong>${scenario.phaseLabel} · ${evaluation.status}</strong><br>
        Day ${trend.checkDay} check · previous avg ${trend.previousAverage.toFixed(2)} lb · current avg ${trend.currentAverage.toFixed(2)} lb<br>
        Weekly change ${formatRate(trend.weeklyChange)} · target ${formatRate(scenario.target)}<br>
        ${recommendation
            ? `Calories ${scenario.currentCalories} → suggested first step ${recommendation.firstStepCalories} (${formatSignedCalories(recommendation.firstStepDelta)} kcal/day); estimated full target ${recommendation.estimatedTargetCalories}.`
            : `No change: keep ${scenario.currentCalories} kcal/day.`}
    `;
}

const content = document.getElementById("content");
if (content) new MutationObserver(scheduleRefresh).observe(content, { childList: true, subtree: true });
window.addEventListener("levelup:nutrition-updated", scheduleRefresh);
window.addEventListener("levelup:nutrition-phase-updated", scheduleRefresh);
window.addEventListener("pageshow", scheduleRefresh);
document.addEventListener("click", event => {
    if (event.target.closest?.('[data-page="energy"], [data-nav="energy"]')) window.setTimeout(scheduleRefresh, 50);
}, true);
scheduleRefresh();
