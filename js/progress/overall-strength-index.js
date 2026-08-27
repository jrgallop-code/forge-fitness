import { drawStrengthIndexChart } from "./strength-index-chart-renderer.js?v=red-index-polish-1";

const SESSION_STORAGE_KEY = "forge_workout_sessions";

const CORE_STRENGTH_CATEGORIES = [
    {
        key: "horizontal-push",
        label: "Horizontal push",
        preferred: [
            ["barbell-bench-press", "Barbell Bench Press"],
            ["dumbbell-bench-press", "Dumbbell Bench Press"],
            ["machine-chest-press", "Machine Chest Press"],
            ["incline-barbell-press", "Incline Barbell Press"],
            ["incline-dumbbell-press", "Incline Dumbbell Press"]
        ]
    },
    {
        key: "vertical-push",
        label: "Vertical push",
        preferred: [
            ["overhead-press", "Overhead Press"],
            ["dumbbell-shoulder-press", "Dumbbell Shoulder Press"],
            ["machine-shoulder-press", "Machine Shoulder Press"]
        ]
    },
    {
        key: "horizontal-pull",
        label: "Horizontal pull",
        preferred: [
            ["barbell-row", "Barbell Row"],
            ["chest-supported-row", "Chest-Supported Row"],
            ["seated-cable-row", "Seated Cable Row"],
            ["machine-row", "Machine Row"],
            ["single-arm-dumbbell-row", "Single-Arm Dumbbell Row"]
        ]
    },
    {
        key: "vertical-pull",
        label: "Vertical pull",
        preferred: [
            ["lat-pulldown", "Lat Pulldown"],
            ["weighted-pull-up", "Weighted Pull-Up"]
        ]
    },
    {
        key: "knee-dominant",
        label: "Knee-dominant lower body",
        preferred: [
            ["hack-squat", "Hack Squat"],
            ["back-squat", "Back Squat"],
            ["front-squat", "Front Squat"]
        ]
    },
    {
        key: "hip-dominant",
        label: "Hip-dominant lower body",
        preferred: [
            ["romanian-deadlift", "Romanian Deadlift"],
            ["deadlift", "Deadlift"],
            ["barbell-hip-thrust", "Barbell Hip Thrust"]
        ]
    }
];

export function initializeOverallStrengthIndex() {
    ensureStrengthIndexCard();

    const render = () => requestAnimationFrame(renderOverallStrengthIndex);

    document.getElementById("lifting-tab")?.addEventListener("click", render);
    document.querySelectorAll('.training-progress-tab[data-view="overview"]').forEach(button => {
        button.addEventListener("click", render);
    });
    document.getElementById("load-training-demo")?.addEventListener("click", () => setTimeout(render, 0));
    document.getElementById("remove-training-demo")?.addEventListener("click", () => setTimeout(render, 0));
    window.addEventListener("resize", render);

    render();
}

function ensureStrengthIndexCard() {
    const overview = document.querySelector('.training-progress-view[data-view="overview"]');
    if (!overview || document.getElementById("overall-strength-index-chart")) return;

    overview.insertAdjacentHTML("afterbegin", `
        <div class="analytics-card overall-strength-index-card">
            <div class="overall-strength-index-header">
                <h4>Overall Strength Index</h4>
                <button id="overall-strength-index-info-btn" class="secondary-btn" type="button" aria-controls="overall-strength-index-method-view" aria-expanded="false">
                    ⓘ How this works
                </button>
            </div>

            <div id="overall-strength-index-chart-view">
                <p class="analytics-note">
                    Tracks overall strength using one representative lift from each of six major movement categories.
                </p>
                <canvas
                    id="overall-strength-index-chart"
                    class="training-chart"
                    aria-label="Overall strength index over time"
                ></canvas>
                <p id="overall-strength-index-summary" class="analytics-note">
                    100 = baseline strength. An index of 105 means overall estimated strength is about 5% above baseline; 95 means about 5% below baseline.
                </p>
            </div>

            <div id="overall-strength-index-method-view" class="analytics-note overall-strength-index-info" hidden>
                <div id="overall-strength-index-method">
                    Level Up uses six representative movement categories. Each selected lift is normalized to its own first valid estimated 1RM, which equals 100, then the available category indexes are averaged.
                </div>
                <button id="overall-strength-index-back-btn" class="secondary-btn" type="button">
                    ← Back to Strength Index
                </button>
            </div>
        </div>
    `);

    const chartView = document.getElementById("overall-strength-index-chart-view");
    const methodView = document.getElementById("overall-strength-index-method-view");
    const infoButton = document.getElementById("overall-strength-index-info-btn");
    const backButton = document.getElementById("overall-strength-index-back-btn");

    const showMethod = () => {
        if (!chartView || !methodView || !infoButton) return;
        chartView.hidden = true;
        methodView.hidden = false;
        infoButton.hidden = true;
        infoButton.setAttribute("aria-expanded", "true");
    };

    const showChart = () => {
        if (!chartView || !methodView || !infoButton) return;
        methodView.hidden = true;
        chartView.hidden = false;
        infoButton.hidden = false;
        infoButton.setAttribute("aria-expanded", "false");
        requestAnimationFrame(renderOverallStrengthIndex);
    };

    infoButton?.addEventListener("click", showMethod);
    backButton?.addEventListener("click", showChart);
}

function renderOverallStrengthIndex() {
    const canvas = document.getElementById("overall-strength-index-chart");
    const summary = document.getElementById("overall-strength-index-summary");
    const method = document.getElementById("overall-strength-index-method");
    if (!canvas || !summary) return;

    const result = buildStrengthIndexPoints(getSessions());
    drawStrengthIndexChart(canvas, result.points);
    updateMethodText(method, result.selectedCategories);

    if (!result.points.length) {
        summary.textContent = "Log at least two valid performances in at least two core movement categories to establish an overall strength trend. 100 represents baseline strength.";
        return;
    }

    const latest = result.points[result.points.length - 1];
    const change = latest.value - 100;
    const direction = change > 0 ? "above" : change < 0 ? "below" : "at";
    const magnitude = Math.abs(change).toFixed(1);
    const comparison = direction === "at" ? "at baseline" : `${magnitude}% ${direction} baseline`;

    summary.textContent = `Current index: ${latest.value.toFixed(1)} — about ${comparison}. Based on ${latest.exerciseCount} of 6 core movement categories.`;
}

function updateMethodText(target, selectedCategories) {
    if (!target) return;

    const selectedByKey = new Map(selectedCategories.map(item => [item.key, item]));
    const rows = CORE_STRENGTH_CATEGORIES.map(category => {
        const selected = selectedByKey.get(category.key);
        const preferredNames = category.preferred.map(([, name]) => name).join(" → ");
        return `<li><strong>${category.label}:</strong> ${selected ? selected.exerciseName : `not yet established`}<br><small>Priority: ${preferredNames}</small></li>`;
    }).join("");

    target.innerHTML = `
        <p>Each category contributes at most one lift, so accessory exercises and multiple variations cannot dominate the score.</p>
        <ul>${rows}</ul>
        <p>Each selected lift's first valid estimated 1RM is set to 100. Later values are calculated relative to that baseline, and the available category indexes are averaged. Leg Press is intentionally excluded; Hack Squat is the preferred knee-dominant lift.</p>
        <p>Unweighted Pull-Ups are not used because this index requires a recorded external load for the estimated 1RM calculation. Lat Pulldown or Weighted Pull-Up can represent vertical pulling.</p>
    `;
}

function getSessions() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "[]");
        return Array.isArray(parsed)
            ? parsed.filter(session => /^\d{4}-\d{2}-\d{2}$/.test(String(session?.date || "")))
                .sort((a, b) => String(a.date).localeCompare(String(b.date)))
            : [];
    } catch {
        return [];
    }
}

function buildStrengthIndexPoints(sessions) {
    const recordsByExercise = collectExerciseRecords(sessions);
    const selectedCategories = selectCoreExercises(recordsByExercise);

    if (selectedCategories.length < 2) {
        return { points: [], selectedCategories };
    }

    const baselineByExercise = new Map(
        selectedCategories.map(item => [item.exerciseId, item.records[0].estimatedOneRepMax])
    );
    const recordsByDate = new Map();

    selectedCategories.forEach(item => {
        item.records.forEach(record => {
            if (!recordsByDate.has(record.date)) recordsByDate.set(record.date, []);
            recordsByDate.get(record.date).push({
                exerciseId: item.exerciseId,
                estimatedOneRepMax: record.estimatedOneRepMax
            });
        });
    });

    const latestByExercise = new Map();
    const points = [];

    [...recordsByDate.keys()].sort().forEach(date => {
        recordsByDate.get(date).forEach(record => {
            latestByExercise.set(record.exerciseId, record.estimatedOneRepMax);
        });

        const indexes = [];
        latestByExercise.forEach((current, exerciseId) => {
            const baseline = baselineByExercise.get(exerciseId);
            if (Number.isFinite(baseline) && baseline > 0) indexes.push((current / baseline) * 100);
        });

        if (indexes.length >= 2) {
            points.push({
                date,
                label: formatShortDate(date),
                value: indexes.reduce((sum, value) => sum + value, 0) / indexes.length,
                exerciseCount: indexes.length
            });
        }
    });

    return { points, selectedCategories };
}

function collectExerciseRecords(sessions) {
    const recordsByExercise = new Map();

    sessions.forEach(session => {
        session.exercises?.forEach(exercise => {
            const exerciseId = String(exercise?.exerciseId || "");
            if (!exerciseId) return;

            const validSets = (exercise.sets || []).filter(set => Number(set?.weight) > 0 && Number(set?.reps) > 0);
            if (!validSets.length) return;

            const bestEstimatedOneRepMax = Math.max(...validSets.map(estimateOneRepMax));
            if (!Number.isFinite(bestEstimatedOneRepMax) || bestEstimatedOneRepMax <= 0) return;

            if (!recordsByExercise.has(exerciseId)) recordsByExercise.set(exerciseId, []);
            recordsByExercise.get(exerciseId).push({
                date: session.date,
                estimatedOneRepMax: bestEstimatedOneRepMax
            });
        });
    });

    recordsByExercise.forEach((records, exerciseId) => {
        const byDate = new Map();
        records.forEach(record => {
            const existing = byDate.get(record.date);
            if (!existing || record.estimatedOneRepMax > existing.estimatedOneRepMax) byDate.set(record.date, record);
        });
        recordsByExercise.set(exerciseId, [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)));
    });

    return recordsByExercise;
}

function selectCoreExercises(recordsByExercise) {
    return CORE_STRENGTH_CATEGORIES.flatMap(category => {
        for (const [exerciseId, exerciseName] of category.preferred) {
            const records = recordsByExercise.get(exerciseId) || [];
            if (records.length >= 2) {
                return [{
                    key: category.key,
                    label: category.label,
                    exerciseId,
                    exerciseName,
                    records
                }];
            }
        }
        return [];
    });
}

function estimateOneRepMax(set) {
    return Number(set.weight) * (1 + Number(set.reps) / 30);
}

function formatShortDate(value) {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" })
        .format(new Date(`${value}T00:00:00`));
}
