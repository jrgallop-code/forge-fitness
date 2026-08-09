const PHASES_KEY = "level_up_nutrition_phases";
const WEIGHT_KEY = "forge_weight_entries";
const GOAL_WEIGHT_KEY = "level_up_goal_weight";

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

function calculateWeeklyChangeFromMovingAverage(movingAverage) {
    if (movingAverage.length < 2) return null;

    const latest = movingAverage[movingAverage.length - 1];
    const latestTime = dateMs(latest.date);
    let comparison = null;

    for (let index = movingAverage.length - 2; index >= 0; index--) {
        const candidate = movingAverage[index];
        const days = (latestTime - dateMs(candidate.date)) / 86400000;
        if (days >= 7) {
            comparison = { ...candidate, days };
            break;
        }
    }

    if (!comparison) return null;

    return ((latest.weight - comparison.weight) / comparison.days) * 7;
}

function getPhaseStats(phase) {
    const entries = getPhaseWeights(phase);
    const movingAverage = calculatePhaseMovingAverage(entries);
    const latestAverage = movingAverage.at(-1)?.weight ?? null;
    const weeklyChange = calculateWeeklyChangeFromMovingAverage(movingAverage);

    return {
        entries,
        movingAverage,
        latestAverage,
        weeklyChange
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
            trendMetric.innerHTML = "<span>7-Day Avg Change</span><strong>--</strong>";
            metrics.appendChild(trendMetric);
        }
        trendMetric.querySelector("strong").textContent = Number.isFinite(stats.weeklyChange)
            ? `${signed(stats.weeklyChange)} lb/wk`
            : "Collecting data";
    }

    const oldTrendRow = [...card.querySelectorAll(".phase-goal-row")]
        .find(row => row.querySelector("span")?.textContent?.trim() === "Current phase trend");
    if (oldTrendRow) {
        oldTrendRow.querySelector("span").textContent = "Trend Method";
        oldTrendRow.querySelector("strong").textContent = "Phase-only 7-day moving averages";
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
        onTrack.innerHTML = "ON TRACK <small>7-day average trend +0.23 lb/week</small>";
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

    const goalEl = document.getElementById("coach-goal-rate");
    const actualEl = document.getElementById("coach-actual-rate");
    const confidenceEl = document.getElementById("coach-confidence");

    if (goalEl && Number.isFinite(targetRate)) goalEl.textContent = `${signed(targetRate)} lb/wk`;
    if (actualEl) actualEl.textContent = Number.isFinite(stats.weeklyChange)
        ? `${signed(stats.weeklyChange)} lb/wk`
        : "--";
    if (confidenceEl) confidenceEl.textContent = `${stats.entries.length} phase weigh-ins · 7-day avg`;

    if (phaseDays < 14 || stats.entries.length < 7 || !Number.isFinite(stats.weeklyChange)) {
        if (recommendation) {
            recommendation.textContent = `${phaseName} started ${phaseDays} day${phaseDays === 1 ? "" : "s"} ago. Keep logging weight consistently. Level Up will judge progress using phase-only 7-day moving averages once enough current-phase data is available.`;
        }
        return;
    }

    if (!Number.isFinite(targetRate)) return;
    const difference = stats.weeklyChange - targetRate;

    if (recommendation) {
        recommendation.textContent = Math.abs(difference) <= 0.2
            ? `On track for this ${phaseName.toLowerCase()} phase. Your phase-only 7-day average is changing ${signed(stats.weeklyChange)} lb/week versus a target of ${signed(targetRate)} lb/week. Keep calories unchanged.`
            : `This ${phaseName.toLowerCase()} phase is trending ${difference > 0 ? "faster" : "slower"} than planned. The coach is comparing phase-only 7-day moving averages and ignores weight data from before ${formatDate(phase.startDate)}.`;
    }
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
