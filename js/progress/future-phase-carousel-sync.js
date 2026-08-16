import {
    getActiveNutritionPhase,
    getActivePhaseMetrics
} from "../nutrition/nutrition-phase.js?v=future-weight-shared-date-1";

const FIRST_CHECK_DAY = 14;
const FULL_GAP_INCREMENT = 50;
const FIRST_STEP_INCREMENT = 25;
const MAX_FIRST_STEP = 150;
let queued = false;
let lastSignature = "";

function formatRate(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(2)} lb/wk`;
}

function formatShortDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return "";
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric"
    });
}

function formatSignedCalories(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    if (Math.abs(number) < 0.5) return "0";
    return `${number > 0 ? "+" : "−"}${Math.abs(Math.round(number))}`;
}

function buildCaloriePreview(metrics, phase) {
    const currentCalories = Number(phase?.currentCalories ?? phase?.startCalories);
    if (!Number.isFinite(currentCalories)) {
        return { primary: "No calorie target", secondary: "Future test preview" };
    }

    const testLabel = metrics.asOfDate ? `Test through ${formatShortDate(metrics.asOfDate)}` : "Future test preview";
    const trend = metrics.trend;

    if (metrics.status === "PRELIMINARY TREND") {
        return {
            primary: `${Math.round(currentCalories)} kcal/day`,
            secondary: `${testLabel} · preliminary trend · first calorie decision Day ${FIRST_CHECK_DAY}`
        };
    }

    if (metrics.status === "BUILDING TREND") {
        return {
            primary: `${Math.round(currentCalories)} kcal/day`,
            secondary: `${testLabel} · preliminary trend begins Day 7`
        };
    }

    if (metrics.status === "NEED MORE DATA" || metrics.status === "NEED MORE PHASE DATA") {
        return {
            primary: `${Math.round(currentCalories)} kcal/day`,
            secondary: `${testLabel} · need 4 weigh-ins in each required 7-day window`
        };
    }

    if (["ON TRACK", "MAINTAINING"].includes(metrics.status)) {
        return {
            primary: `${Math.round(currentCalories)} kcal/day`,
            secondary: `${testLabel} · on track · next check Day ${trend?.nextCheckDay || "--"}`
        };
    }

    if (!metrics.recommendationReady) {
        return {
            primary: `${Math.round(currentCalories)} kcal/day`,
            secondary: `${testLabel} · weekly check is not ready yet`
        };
    }

    const actual = Number(metrics.actualRateLbPerWeek);
    const target = Number(metrics.targetRateLbPerWeek);
    if (!Number.isFinite(actual) || !Number.isFinite(target)) {
        return {
            primary: `${Math.round(currentCalories)} kcal/day`,
            secondary: `${testLabel} · need more phase data before adjusting`
        };
    }

    const rawGap = (target - actual) * 500;
    let fullGap = Math.round(rawGap / FULL_GAP_INCREMENT) * FULL_GAP_INCREMENT;
    if (fullGap === 0 && Math.abs(rawGap) > 0.001) {
        fullGap = Math.sign(rawGap) * FULL_GAP_INCREMENT;
    }

    const estimatedTarget = Math.max(1, Math.round(currentCalories + fullGap));
    let firstStep = Math.round((fullGap * 0.5) / FIRST_STEP_INCREMENT) * FIRST_STEP_INCREMENT;
    if (firstStep === 0 && fullGap !== 0) {
        firstStep = Math.sign(fullGap) * FIRST_STEP_INCREMENT;
    }
    firstStep = Math.max(-MAX_FIRST_STEP, Math.min(MAX_FIRST_STEP, firstStep));
    const firstStepTarget = Math.max(1, Math.round(currentCalories + firstStep));

    return {
        primary: `${estimatedTarget} kcal/day`,
        secondary: `${testLabel} · preview only · gap ${formatSignedCalories(fullGap)} · first step ${formatSignedCalories(firstStep)} → ${firstStepTarget} kcal/day`
    };
}

function buildPhaseRate(metrics) {
    const rate = formatRate(metrics.actualRateLbPerWeek);
    if (metrics.status === "BUILDING TREND") return "Building trend · preliminary Day 7";
    if (metrics.status === "PRELIMINARY TREND" && rate) return `Preliminary · ${rate}`;
    if (metrics.status === "NEED MORE DATA" || metrics.status === "NEED MORE PHASE DATA" || !rate) return "Need more data";

    const labels = {
        "MAINTAINING": "Maintaining",
        "ON TRACK": "On Track",
        "SLIGHTLY FASTER": "Slightly Faster",
        "SLIGHTLY SLOWER": "Slightly Slower",
        "NEEDS ATTENTION": "Needs Attention",
        "TRENDING UP": "Trending Up",
        "TRENDING DOWN": "Trending Down"
    };
    return `${labels[metrics.status] || metrics.status} · ${rate}`;
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function refresh() {
    const phase = getActiveNutritionPhase();
    if (!phase) {
        lastSignature = "";
        return;
    }

    const metrics = getActivePhaseMetrics(phase, { rolling: true });
    if (!metrics.isFutureTest) {
        lastSignature = "";
        return;
    }

    const rateNode = document.getElementById("weight-phase-rate");
    const rateHeading = document.getElementById("weight-phase-rate-heading");
    const calorieNode = document.getElementById("weight-calorie-suggestion");
    const calorieDetail = document.getElementById("weight-calorie-suggestion-total");
    if (!rateNode && !calorieNode) return;

    const phaseRate = buildPhaseRate(metrics);
    const caloriePreview = buildCaloriePreview(metrics, phase);
    const testDate = formatShortDate(metrics.asOfDate);
    const signature = JSON.stringify({
        asOfDate: metrics.asOfDate,
        status: metrics.status,
        actual: metrics.actualRateLbPerWeek,
        target: metrics.targetRateLbPerWeek,
        recommendationReady: metrics.recommendationReady,
        currentCalories: phase.currentCalories ?? phase.startCalories,
        phaseRate,
        caloriePreview
    });

    if (signature === lastSignature && rateNode?.dataset.futurePhaseSync === "1") return;
    lastSignature = signature;

    setText(rateHeading, testDate ? `Phase Weekly Rate · Test ${testDate}` : "Phase Weekly Rate");
    setText(rateNode, phaseRate);
    setText(calorieNode, caloriePreview.primary);
    setText(calorieDetail, caloriePreview.secondary);

    if (rateNode) rateNode.dataset.futurePhaseSync = "1";
    if (calorieNode) calorieNode.dataset.futurePhaseSync = "1";
}

function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        refresh();
        window.setTimeout(refresh, 80);
        window.setTimeout(refresh, 220);
    });
}

const content = document.getElementById("content");
if (content) {
    new MutationObserver(mutations => {
        const relevant = mutations.some(mutation =>
            mutation.type === "childList" ||
            mutation.type === "characterData"
        );
        if (relevant) schedule();
    }).observe(content, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

window.addEventListener("levelup:nutrition-updated", schedule);
window.addEventListener("levelup:nutrition-phase-updated", schedule);
window.addEventListener("pageshow", schedule);
window.addEventListener("focus", schedule);
document.addEventListener("click", event => {
    if (event.target.closest?.("#save-weight-btn, .remove-weight-entry, #weight-tab, [data-page='progress']")) {
        window.setTimeout(schedule, 40);
        window.setTimeout(schedule, 260);
    }
}, true);

schedule();
