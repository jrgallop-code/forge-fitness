import { getExerciseById } from "../workouts/exercise-library.js";
import { createGeneratedExerciseGuide } from "../workouts/exercise-guide-generator.js?v=full-library-guides-1";

const SESSION_STORAGE_KEY = "forge_workout_sessions";
const RANGE_STORAGE_KEY = "level_up_training_analytics_range";
const SECONDARY_SET_CREDIT = 0.5;

const RANGE_OPTIONS = {
    "1w": { label: "1W", days: 7 },
    "1m": { label: "1M", days: 30 },
    "3m": { label: "3M", days: 90 },
    "6m": { label: "6M", days: 180 },
    "1y": { label: "1Y", days: 365 },
    all: { label: "ALL", days: 0 }
};

let syncTimer = null;

function readRange() {
    const key = String(localStorage.getItem(RANGE_STORAGE_KEY) || "3m").toLowerCase();
    return RANGE_OPTIONS[key] ? key : "3m";
}

function getSessions() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "[]");
        return Array.isArray(parsed)
            ? parsed.filter(session => session && /^\d{4}-\d{2}-\d{2}$/.test(String(session.date || "")))
            : [];
    }
    catch {
        return [];
    }
}

function localDateValue(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftDate(dateValue, days) {
    const date = new Date(`${dateValue}T12:00:00`);
    date.setDate(date.getDate() + days);
    return localDateValue(date);
}

function getRangeWindow(range, sessions) {
    const option = RANGE_OPTIONS[range] || RANGE_OPTIONS["3m"];
    const endDate = localDateValue();

    if (!option.days) {
        const dates = sessions.map(session => String(session.date)).sort();
        return { range, option, startDate: dates[0] || endDate, endDate };
    }

    return {
        range,
        option,
        startDate: shiftDate(endDate, -(option.days - 1)),
        endDate
    };
}

function normalizeMuscle(value) {
    const text = String(value || "").trim();
    if (!text || /cardio|other/i.test(text)) return "";

    const aliases = {
        Quadriceps: "Quads",
        Hamstring: "Hamstrings",
        Shoulder: "Shoulders",
        Glute: "Glutes",
        Calf: "Calves",
        Forearm: "Forearms",
        "Front Delts": "Shoulders",
        "Side Delts": "Shoulders",
        Lats: "Back",
        "Upper Back": "Back",
        "Spinal Erectors": "Back",
        "Rectus Abdominis": "Core",
        Obliques: "Core",
        "Deep Core": "Core",
        Abs: "Core",
        Abdominals: "Core"
    };

    return aliases[text] || text;
}

function getExerciseImpacts(exercise) {
    const definition = getExerciseById(exercise?.exerciseId || exercise?.id);
    let primary = [];
    let secondary = [];

    try {
        const guide = definition ? createGeneratedExerciseGuide(definition) : null;
        primary = Array.isArray(guide?.primary) ? guide.primary : [];
        secondary = Array.isArray(guide?.secondary) ? guide.secondary : [];
    }
    catch {
        primary = [];
        secondary = [];
    }

    if (!primary.length && !secondary.length) {
        const fallback = normalizeMuscle(definition?.muscleGroup || exercise?.muscleGroup);
        return fallback ? new Map([[fallback, 1]]) : new Map();
    }

    const impacts = new Map();
    secondary.forEach(muscle => {
        const group = normalizeMuscle(muscle);
        if (group) impacts.set(group, SECONDARY_SET_CREDIT);
    });
    primary.forEach(muscle => {
        const group = normalizeMuscle(muscle);
        if (group) impacts.set(group, 1);
    });
    return impacts;
}

function completedSetCount(exercise) {
    if (!Array.isArray(exercise?.sets)) return 0;
    return exercise.sets.filter(set => Number(set?.reps) > 0 || set?.completed === true).length;
}

function calculateSelectedVolume() {
    const range = readRange();
    const sessions = getSessions();
    const window = getRangeWindow(range, sessions);
    const volume = new Map();

    sessions.forEach(session => {
        const date = String(session.date || "");
        if (date < window.startDate || date > window.endDate) return;

        (session.exercises || []).forEach(exercise => {
            const completedSets = completedSetCount(exercise);
            if (!completedSets) return;

            getExerciseImpacts(exercise).forEach((credit, muscle) => {
                volume.set(muscle, (volume.get(muscle) || 0) + completedSets * credit);
            });
        });
    });

    return { range, window, volume };
}

function renderRow(muscle, sets, maximum) {
    const width = maximum > 0 ? Math.max(4, Math.min(100, sets / maximum * 100)) : 0;
    return `
        <div class="seven-day-volume-row" data-range-synced-breakdown-row="true">
            <div class="seven-day-volume-row-top">
                <strong>${escapeHtml(muscle)}</strong>
                <span>${escapeHtml(formatSets(sets))} sets</span>
            </div>
            <div class="seven-day-volume-track" aria-hidden="true">
                <div class="seven-day-volume-fill" style="width:${width.toFixed(1)}%"></div>
            </div>
        </div>
    `;
}

function syncBreakdownToSelectedRange() {
    const breakdown = document.querySelector(".seven-day-volume-breakdown");
    if (!breakdown) return;

    const { window, volume } = calculateSelectedVolume();
    const entries = [...volume.entries()]
        .filter(([, sets]) => sets > 0)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    const headingMeta = breakdown.querySelector(".seven-day-volume-breakdown-heading span");
    if (headingMeta) {
        headingMeta.textContent = `${window.option.label} · Primary 1.0 · Secondary 0.5`;
    }

    breakdown
        .querySelectorAll(".seven-day-volume-row, .empty-state")
        .forEach(node => node.remove());

    if (!entries.length) {
        breakdown.insertAdjacentHTML(
            "beforeend",
            `<p class="empty-state">No muscle volume in the selected ${escapeHtml(window.option.label)} timeframe.</p>`
        );
        return;
    }

    const maximum = Math.max(...entries.map(([, sets]) => sets));
    breakdown.insertAdjacentHTML(
        "beforeend",
        entries.map(([muscle, sets]) => renderRow(muscle, sets, maximum)).join("")
    );
}

function scheduleSync(delay = 80) {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => requestAnimationFrame(syncBreakdownToSelectedRange), delay);
}

document.addEventListener("click", event => {
    if (
        event.target.closest?.("[data-training-analytics-range]") ||
        event.target.closest?.('.training-progress-tab[data-view="training"]') ||
        event.target.closest?.("#lifting-tab") ||
        event.target.closest?.("#load-training-demo") ||
        event.target.closest?.("#remove-training-demo") ||
        event.target.closest?.('[data-muscle-overview-mode="volume"]')
    ) {
        scheduleSync(120);
    }
});

document.addEventListener("change", event => {
    if (event.target?.id === "progress-range") scheduleSync(100);
});

window.addEventListener("storage", event => {
    if (event.key === RANGE_STORAGE_KEY || event.key === SESSION_STORAGE_KEY) {
        scheduleSync(100);
    }
});

window.addEventListener("pageshow", () => scheduleSync(120));

const content = document.getElementById("content");
if (content) {
    new MutationObserver(mutations => {
        const breakdownWasRebuilt = mutations.some(mutation =>
            [...mutation.addedNodes].some(node =>
                node.nodeType === Node.ELEMENT_NODE &&
                (node.matches?.(".seven-day-volume-breakdown") || node.querySelector?.(".seven-day-volume-breakdown"))
            )
        );
        if (breakdownWasRebuilt) scheduleSync(40);
    }).observe(content, { childList: true, subtree: true });
}

window.setTimeout(() => scheduleSync(160), 0);

function formatSets(value) {
    const rounded = Math.round(Number(value || 0) * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
