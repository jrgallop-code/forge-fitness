import { calculateWeightTrend } from "../core/weight-trend.js?v=weight-trend-regression-1";
import { getNutritionPlan, setCurrentCalories } from "./nutrition-storage.js?v=manual-goals-1";

const PHASES_KEY = "level_up_nutrition_phases";
const WEIGHT_KEY = "forge_weight_entries";
const GOAL_WEIGHT_KEY = "level_up_goal_weight";
const COACH_TOLERANCE_LB_PER_WEEK = 0.20;
const MIN_ADJUSTMENT_KCAL = 100;
const MAX_ADJUSTMENT_KCAL = 200;

const PHASE_LABELS = {
    fat_loss: "Fat Loss",
    maintenance: "Maintenance",
    lean_bulk: "Lean Bulk",
    custom: "Custom"
};

function readJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    }
    catch {
        return fallback;
    }
}

function getActivePhase() {
    const phases = readJson(PHASES_KEY, []);
    return Array.isArray(phases)
        ? phases.find(phase => !phase?.endDate) || null
        : null;
}

function getGoalWeight() {
    const value = Number(localStorage.getItem(GOAL_WEIGHT_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
}

function getAllWeights() {
    const rows = readJson(WEIGHT_KEY, []);
    if (!Array.isArray(rows)) return [];

    return rows
        .map(row => ({
            date: String(row?.date || ""),
            weight: Number(row?.weight)
        }))
        .filter(row =>
            /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
            Number.isFinite(row.weight) &&
            row.weight > 0
        )
        .sort((a, b) => a.date.localeCompare(b.date));
}

function getPhaseWeights(phase) {
    if (!phase?.startDate) return [];
    return getAllWeights().filter(row =>
        row.date >= phase.startDate &&
        (!phase.endDate || row.date <= phase.endDate)
    );
}

function dateMs(date) {
    return new Date(`${date}T12:00:00`).getTime();
}

function daysBetween(a, b) {
    return Math.max(0, (dateMs(b) - dateMs(a)) / 86400000);
}

function today() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function calculatePhaseMovingAverage(entries) {
    return entries.map(entry => {
        const current = dateMs(entry.date);
        const windowStart = current - (6 * 86400000);
        const windowEntries = entries.filter(item => {
            const time = dateMs(item.date);
            return time >= windowStart && time <= current;
        });

        const average = windowEntries.reduce((sum, item) => sum + item.weight, 0) / windowEntries.length;

        return {
            date: entry.date,
            weight: Number(average.toFixed(2)),
            samples: windowEntries.length
        };
    });
}

function getPhaseStats(phase) {
    const entries = getPhaseWeights(phase);
    const movingAverage = calculatePhaseMovingAverage(entries);
    const latestAverage = movingAverage.at(-1)?.weight ?? null;
    const trend = calculateWeightTrend(entries);

    return {
        entries,
        movingAverage,
        latestAverage,
        weeklyChange: trend.weeklyChange,
        trend
    };
}

function signed(value, digits = 2) {
    if (!Number.isFinite(Number(value))) return "--";
    const number = Number(value);
    return `${number > 0 ? "+" : ""}${number.toFixed(digits).replace(/\.00$/, "")}`;
}

function formatDate(date) {
    if (!date) return "--";
    return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function projectedEndDate(phase, latestAverage, goalWeight) {
    const rate = Number(phase?.targetWeeklyRate);
    if (!Number.isFinite(latestAverage) || !Number.isFinite(goalWeight) || !Number.isFinite(rate) || Math.abs(rate) < 0.005) {
        return null;
    }

    const remaining = goalWeight - latestAverage;
    if ((rate < 0 && remaining >= 0) || (rate > 0 && remaining <= 0)) {
        return remaining === 0 ? "Goal reached" : null;
    }

    const weeks = Math.abs(remaining) / Math.abs(rate);
    const end = new Date();
    end.setDate(end.getDate() + Math.ceil(weeks * 7));

    return end.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function ensurePhaseGoalMetrics() {
    const card = document.querySelector(".nutrition-phases-view .phase-current-card");
    const phase = getActivePhase();
    if (!card || !phase) return;

    const stats = getPhaseStats(phase);
    const goalWeight = getGoalWeight();
    const endDate = projectedEndDate(phase, stats.latestAverage, goalWeight);

    const metrics = card.querySelector(".phase-metrics");
    if (metrics) {
        let averageMetric = metrics.querySelector('[data-phase-metric="average"]');
        if (!averageMetric) {
            averageMetric = document.createElement("div");
            averageMetric.dataset.phaseMetric = "average";
            averageMetric.innerHTML = "<span>7-Day Average</span><strong>--</strong>";
            metrics.appendChild(averageMetric);
        }
        averageMetric.querySelector("strong").textContent = Number.isFinite(stats.latestAverage)
            ? `${stats.latestAverage.toFixed(1)} lb`
            : "--";

        let trendMetric = metrics.querySelector('[data-phase-metric="ma-trend"]');
        if (!trendMetric) {
            trendMetric = document.createElement("div");
            trendMetric.dataset.phaseMetric = "ma-trend";
            trendMetric.innerHTML = "<span>Weekly Trend</span><strong>--</strong>";
            metrics.appendChild(trendMetric);
        }
        trendMetric.querySelector("span").textContent = stats.trend.label;
        trendMetric.querySelector("strong").textContent = Number.isFinite(stats.weeklyChange)
            ? `${signed(stats.weeklyChange)} lb/wk`
            : "Collecting data";
    }

    const oldTrendRow = [...card.querySelectorAll(".phase-goal-row")]
        .find(row => ["Current phase trend", "Trend Method"].includes(row.querySelector("span")?.textContent?.trim()));
    if (oldTrendRow) {
        oldTrendRow.querySelector("span").textContent = "Trend Method";
        oldTrendRow.querySelector("strong").textContent = "Recent phase weigh-ins · regression";
    }

    let goalRow = card.querySelector('[data-phase-row="goal-weight"]');
    if (!goalRow) {
        goalRow = document.createElement("div");
        goalRow.className = "phase-goal-row";
        goalRow.dataset.phaseRow = "goal-weight";
        goalRow.innerHTML = "<span>Goal weight</span><strong>--</strong>";
        const endButton = card.querySelector("#end-nutrition-phase");
        card.insertBefore(goalRow, endButton || null);
    }
    goalRow.querySelector("strong").textContent = Number.isFinite(goalWeight)
        ? `${goalWeight.toFixed(1)} lb`
        : "Set in Weight Progress";

    let endRow = card.querySelector('[data-phase-row="projected-date"]');
    if (!endRow) {
        endRow = document.createElement("div");
        endRow.className = "phase-goal-row";
        endRow.dataset.phaseRow = "projected-date";
        endRow.innerHTML = "<span>Predicted end date</span><strong>--</strong>";
        const endButton = card.querySelector("#end-nutrition-phase");
        card.insertBefore(endRow, endButton || null);
    }
    endRow.querySelector("strong").textContent = endDate || "--";
}

function patchMockPreview() {
    const sample = document.querySelector(".nutrition-phases-view .phase-sample-card");
    if (!sample) return;

    const onTrack = sample.querySelector(".phase-on-track");
    if (onTrack) {
        onTrack.innerHTML = "ON TRACK <small>regression trend +0.23 lb/week</small>";
    }

    if (!sample.querySelector('[data-sample-row="goal"]')) {
        const goalRow = document.createElement("div");
        goalRow.className = "phase-goal-row";
        goalRow.dataset.sampleRow = "goal";
        goalRow.innerHTML = "<span>Goal weight</span><strong>165.0 lb</strong>";
        sample.appendChild(goalRow);

        const dateRow = document.createElement("div");
        dateRow.className = "phase-goal-row";
        dateRow.dataset.sampleRow = "date";
        dateRow.innerHTML = "<span>Predicted end date</span><strong>Dec 28, 2026</strong>";
        sample.appendChild(dateRow);
    }
}

function patchAdaptiveCoach() {
    const coach = document.querySelector('[data-planner-view="coach"]');
    if (!coach || coach.hidden) return;

    const phase = getActivePhase();
    const recommendation = document.getElementById("coach-recommendation");
    if (!phase) return;

    const stats = getPhaseStats(phase);
    const targetRate = Number(phase.targetWeeklyRate);
    const phaseName = PHASE_LABELS[phase.type] || "Current Phase";
    const phaseDays = Math.floor(daysBetween(phase.startDate, today())) + 1;
    const plan = getNutritionPlan();

    const goalEl = document.getElementById("coach-goal-rate");
    const actualEl = document.getElementById("coach-actual-rate");
    const confidenceEl = document.getElementById("coach-confidence");
    const actualHeading = actualEl?.closest(".metric-card")?.querySelector("h3");
    const suggestedText = document.getElementById("coach-suggested-calories");
    const applyButton = document.getElementById("apply-coach-recommendation");

    if (goalEl && Number.isFinite(targetRate)) goalEl.textContent = `${signed(targetRate)} lb/wk`;
    if (actualHeading) actualHeading.textContent = stats.trend.label;
    if (actualEl) actualEl.textContent = Number.isFinite(stats.weeklyChange)
        ? `${signed(stats.weeklyChange)} lb/wk`
        : "--";
    if (confidenceEl) {
        const status = stats.trend.status === "actual" ? "Established" : stats.trend.status === "preliminary" ? "Preliminary" : "Insufficient";
        confidenceEl.textContent = `${status} · ${stats.trend.windowEntries} weigh-ins / ${stats.trend.windowDays} days`;
    }

    if (stats.trend.status !== "actual" || !Number.isFinite(stats.weeklyChange)) {
        if (recommendation) {
            recommendation.textContent = stats.trend.status === "preliminary"
                ? `${phaseName} preliminary regression trend: ${signed(stats.weeklyChange)} lb/week. Level Up shows the rate now, but waits for at least 14 calendar days and 7 valid weigh-ins before suggesting a calorie change.`
                : `${phaseName} started ${phaseDays} day${phaseDays === 1 ? "" : "s"} ago. Keep logging weight consistently. A preliminary rate can appear after 7 days; Level Up waits for at least 14 calendar days and 7 valid weigh-ins before coaching.`;
        }
        if (suggestedText) suggestedText.textContent = "";
        hideApply(applyButton);
        return;
    }

    if (!Number.isFinite(targetRate)) {
        if (suggestedText) suggestedText.textContent = "";
        hideApply(applyButton);
        return;
    }

    const difference = stats.weeklyChange - targetRate;
    if (Math.abs(difference) <= COACH_TOLERANCE_LB_PER_WEEK) {
        if (recommendation) {
            recommendation.textContent = `On track for this ${phaseName.toLowerCase()} phase. Your recent regression trend is ${signed(stats.weeklyChange)} lb/week versus a target of ${signed(targetRate)} lb/week. The difference is within ±${COACH_TOLERANCE_LB_PER_WEEK.toFixed(2)} lb/week, so keep calories unchanged.`;
        }
        if (suggestedText) suggestedText.textContent = "";
        hideApply(applyButton);
        return;
    }

    if (!Number.isFinite(plan.currentCalories)) {
        if (recommendation) recommendation.textContent = `Your ${phaseName.toLowerCase()} trend is established, but Level Up needs a current calorie target before calculating an adjustment.`;
        if (suggestedText) suggestedText.textContent = "";
        hideApply(applyButton);
        return;
    }

    const direction = difference > 0 ? -1 : 1;
    const adjustment = calculateSuggestedAdjustment(difference);
    const suggested = Math.round(plan.currentCalories + direction * adjustment);
    const actionText = direction < 0
        ? `reduce calories by about ${adjustment} kcal/day`
        : `increase calories by about ${adjustment} kcal/day`;

    if (recommendation) {
        recommendation.textContent = `Your ${phaseName.toLowerCase()} regression trend is ${Math.abs(difference).toFixed(2)} lb/week away from target. Based on that rate difference, consider whether you want to ${actionText}. Level Up only uses phase weigh-ins from ${formatDate(phase.startDate)} onward and caps each review at a practical 100–200 kcal/day change.`;
    }
    if (suggestedText) suggestedText.textContent = `Suggested target: ${suggested} kcal/day`;

    if (applyButton) {
        applyButton.hidden = false;
        applyButton.onclick = () => {
            setCurrentCalories(suggested, "Adaptive Coach phase regression recommendation");
            window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));
            if (recommendation) recommendation.textContent = "Recommendation applied. Your current calorie target has been updated.";
            hideApply(applyButton);
        };
    }
}

function calculateSuggestedAdjustment(rateDifference) {
    const impliedDailyCalories = Math.abs(Number(rateDifference)) * 3500 / 7;
    const rounded = Math.round(impliedDailyCalories / 50) * 50;
    return Math.min(MAX_ADJUSTMENT_KCAL, Math.max(MIN_ADJUSTMENT_KCAL, rounded));
}

function hideApply(button) {
    if (!button) return;
    button.hidden = true;
    button.onclick = null;
}

function refreshPhaseEnhancements() {
    ensurePhaseGoalMetrics();
    patchMockPreview();
    patchAdaptiveCoach();
}

function refreshSoon(delay = 90) {
    setTimeout(refreshPhaseEnhancements, delay);
}

document.addEventListener("click", event => {
    if (event.target.closest('[data-nutrition-view="phases"], [data-nutrition-view="coach"], #start-nutrition-phase, #end-nutrition-phase, #save-goal-weight-btn, #save-reference-weight-btn')) {
        refreshSoon();
        refreshSoon(220);
    }
});

window.addEventListener("levelup:nutrition-updated", () => refreshSoon());
window.addEventListener("load", () => refreshSoon());

refreshSoon();
