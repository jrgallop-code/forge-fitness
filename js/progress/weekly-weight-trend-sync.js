import {
    calculatePhaseMovingAverageTrend,
    calculateSevenDayAverage,
    calculateWeightTrend,
    normalizeWeightEntries
} from "../core/weight-trend.js?v=future-weight-carousel-sync-1";

const WEIGHT_KEY = "forge_weight_entries";
const PHASES_KEY = "level_up_nutrition_phases";
const DAY_MS = 86400000;
const FIRST_CHECK_DAY = 14;
const MIN_ENTRIES_PER_WINDOW = 4;
let queued = false;

function readWeights() {
    try {
        return normalizeWeightEntries(JSON.parse(localStorage.getItem(WEIGHT_KEY) || "[]"));
    } catch {
        return [];
    }
}

function readPhases() {
    try {
        const phases = JSON.parse(localStorage.getItem(PHASES_KEY) || "[]");
        return Array.isArray(phases) ? phases : [];
    } catch {
        return [];
    }
}

function getActivePhase() {
    return [...readPhases()].reverse().find(phase => phase?.startDate && !phase?.endDate) || null;
}

function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateMs(value) {
    return new Date(`${value}T12:00:00`).getTime();
}

function getFutureTestDate(weights) {
    const latest = weights.at(-1)?.date || null;
    const today = localDate();
    return latest && latest > today ? latest : null;
}

function getStartingTrendWeight(phase, weights) {
    const saved = Number(phase?.startingTrendWeight);
    if (Number.isFinite(saved) && saved > 0) return saved;

    const eligible = weights.filter(entry => entry.date <= phase?.startDate);
    if (!eligible.length) return null;

    const latest = eligible.at(-1);
    const cutoff = dateMs(latest.date) - (6 * DAY_MS);
    const recent = eligible.filter(entry => dateMs(entry.date) >= cutoff);
    if (!recent.length) return latest.weight;
    return recent.reduce((sum, entry) => sum + entry.weight, 0) / recent.length;
}

function getCarouselTrend(weights) {
    const testDate = getFutureTestDate(weights);
    const activePhase = getActivePhase();

    if (activePhase?.startDate) {
        const asOfDate = testDate || localDate();
        const phaseDay = Math.max(
            1,
            Math.floor((dateMs(asOfDate) - dateMs(activePhase.startDate)) / DAY_MS) + 1
        );
        const phaseEntries = weights.filter(entry =>
            entry.date >= activePhase.startDate && entry.date <= asOfDate
        );
        const startingTrendWeight = getStartingTrendWeight(activePhase, weights);
        const trend = calculatePhaseMovingAverageTrend(phaseEntries, {
            phaseStartDate: activePhase.startDate,
            asOfDate,
            startingTrendWeight,
            minEntriesPerWindow: MIN_ENTRIES_PER_WINDOW,
            rolling: phaseDay < FIRST_CHECK_DAY
        });
        const trendWeight = testDate
            ? calculateSevenDayAverage(weights.filter(entry => entry.date <= testDate), testDate).average
            : null;

        return {
            testDate,
            phaseAware: true,
            trend,
            trendWeight
        };
    }

    if (testDate) {
        return {
            testDate,
            phaseAware: false,
            trend: calculateWeightTrend(weights, {
                endDate: testDate,
                minEntriesPerWindow: MIN_ENTRIES_PER_WINDOW
            }),
            trendWeight: calculateSevenDayAverage(weights, testDate).average
        };
    }

    return {
        testDate: null,
        phaseAware: false,
        trend: calculateWeightTrend(weights, { minEntriesPerWindow: MIN_ENTRIES_PER_WINDOW }),
        trendWeight: null
    };
}

function refresh() {
    const value = document.getElementById("actual-weekly-weight-change");
    if (!value) return;

    const weights = readWeights();
    const { testDate, phaseAware, trend, trendWeight } = getCarouselTrend(weights);
    const nextValue = Number.isFinite(trend.weeklyChange)
        ? formatRate(trend.weeklyChange)
        : "Need more data";
    if (value.textContent !== nextValue) value.textContent = nextValue;

    const card = value.closest(".metric-card");
    const heading = card?.querySelector("h3");
    const headingText = trend.status === "preliminary" ? "Preliminary Trend" : "Weekly Trend";
    if (heading && heading.textContent !== headingText) heading.textContent = headingText;

    if (testDate) {
        const trendWeightNode = document.getElementById("latest-weight");
        if (trendWeightNode && Number.isFinite(trendWeight)) {
            const nextTrendWeight = `${trendWeight.toFixed(1)} lb`;
            if (trendWeightNode.textContent !== nextTrendWeight) trendWeightNode.textContent = nextTrendWeight;
            trendWeightNode.title = `7-day trend weight through future test date ${testDate}`;
        }

        value.title = `Future test date ${testDate}. This uses the same phase-aware trend calculation as the calorie coach.`;
        if (card) {
            card.title = trend.status === "preliminary"
                ? `Preliminary phase trend through future test date ${testDate}. At least ${MIN_ENTRIES_PER_WINDOW} weigh-ins are required in the current 7-day window.`
                : `Phase trend through future test date ${testDate}. Scheduled checks use at least ${MIN_ENTRIES_PER_WINDOW} weigh-ins in each 7-day block.`;
        }
        return;
    }

    if (phaseAware) {
        value.title = "Uses the same active-phase trend and scheduled check-in calculation as the calorie coach.";
        if (card) {
            card.title = trend.status === "preliminary"
                ? `Preliminary phase trend. At least ${MIN_ENTRIES_PER_WINDOW} weigh-ins are required in the current 7-day window.`
                : `Active-phase trend. Scheduled checks use at least ${MIN_ENTRIES_PER_WINDOW} weigh-ins in each 7-day block.`;
        }
        return;
    }

    value.title = "Current 7-day average minus the previous 7-day average";
    if (card) card.title = "Weekly change uses two consecutive 7-day moving-average windows, with at least 4 weigh-ins per window.";
}

function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
        queued = false;
        refresh();
    });
}

function formatRate(value) {
    const number = Number(value);
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(2)} lb/wk`;
}

const content = document.getElementById("content");
if (content) new MutationObserver(schedule).observe(content, { childList: true, subtree: true });
window.addEventListener("pageshow", schedule);
window.addEventListener("levelup:nutrition-updated", schedule);
window.addEventListener("levelup:nutrition-phase-updated", schedule);
document.addEventListener("click", event => {
    if (event.target.closest?.("#save-weight-btn, .remove-weight-entry, #weight-tab, [data-page='progress']")) {
        window.setTimeout(schedule, 60);
        window.setTimeout(schedule, 220);
    }
}, true);
schedule();
