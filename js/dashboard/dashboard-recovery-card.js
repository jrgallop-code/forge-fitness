import {
    getRecoveryStates,
    getReadyRecoveryCount
} from "../progress/recovery-secondary-muscles.js?v=recovery-secondary-7";
import { getExerciseById } from "../workouts/exercise-library.js";
import { createGeneratedExerciseGuide } from "../workouts/exercise-guide-generator.js?v=full-library-guides-1";

const SESSION_KEY = "forge_workout_sessions";
const FRONT_ASSET = "assets/recovery/front-view.svg?v=recovery-front-vector-2";
const BACK_ASSET = "assets/recovery/back-view.svg?v=recovery-back-vector-1";
const STYLESHEET = "css/dashboard-recovery-card.css?v=dashboard-muscle-snapshot-1";
const TARGET_GREEN = "#45cb75";
const SECONDARY_SET_CREDIT = 0.5;
const NORMALIZATION_SETS = 12;

const FRONT_REGIONS = {
    Shoulders: ["muscle_front_009", "muscle_front_010"],
    Chest: ["muscle_front_011", "muscle_front_012"],
    Biceps: ["muscle_front_015", "muscle_front_016"],
    Triceps: ["muscle_front_013", "muscle_front_014"],
    Forearms: [
        "muscle_front_033", "muscle_front_034", "muscle_front_037",
        "muscle_front_038", "muscle_front_041", "muscle_front_042"
    ],
    Back: ["muscle_front_007", "muscle_front_008"],
    Core: [
        "muscle_front_017", "muscle_front_018", "muscle_front_019", "muscle_front_020",
        "muscle_front_021", "muscle_front_022", "muscle_front_023", "muscle_front_024",
        "muscle_front_025", "muscle_front_026", "muscle_front_027", "muscle_front_028",
        "muscle_front_029", "muscle_front_030", "muscle_front_031", "muscle_front_032",
        "muscle_front_035", "muscle_front_036", "muscle_front_039", "muscle_front_040",
        "muscle_front_043", "muscle_front_044", "muscle_front_045", "muscle_front_046"
    ],
    Adductors: [
        "muscle_front_047", "muscle_front_048", "muscle_front_065", "muscle_front_066"
    ],
    Quads: [
        "muscle_front_049", "muscle_front_050", "muscle_front_051", "muscle_front_052",
        "muscle_front_067", "muscle_front_068", "muscle_front_069", "muscle_front_070"
    ],
    Calves: [
        "muscle_front_073", "muscle_front_074", "muscle_front_075", "muscle_front_076",
        "muscle_front_077", "muscle_front_078", "muscle_front_079", "muscle_front_080"
    ]
};

const BACK_REGIONS = {
    "Rear Delts": ["muscle_back_016", "muscle_back_017"],
    Back: [
        "muscle_back_003", "muscle_back_004",
        "muscle_back_012", "muscle_back_013", "muscle_back_020", "muscle_back_021",
        "muscle_back_022", "muscle_back_023", "muscle_back_028", "muscle_back_029",
        "muscle_back_050", "muscle_back_051", "muscle_back_074", "muscle_back_075"
    ],
    Triceps: [
        "muscle_back_024", "muscle_back_025", "muscle_back_034",
        "muscle_back_035", "muscle_back_040", "muscle_back_041"
    ],
    Forearms: [
        "muscle_back_056", "muscle_back_057", "muscle_back_064", "muscle_back_065",
        "muscle_back_068", "muscle_back_069", "muscle_back_070", "muscle_back_071"
    ],
    Glutes: ["muscle_back_078", "muscle_back_079", "muscle_back_080", "muscle_back_081"],
    Hamstrings: [
        "muscle_back_096", "muscle_back_097", "muscle_back_113", "muscle_back_114",
        "muscle_back_118", "muscle_back_119", "muscle_back_120", "muscle_back_121",
        "muscle_back_126", "muscle_back_127"
    ],
    Calves: [
        "muscle_back_134", "muscle_back_135", "muscle_back_136", "muscle_back_137",
        "muscle_back_140", "muscle_back_141", "muscle_back_142", "muscle_back_143",
        "muscle_back_148", "muscle_back_149"
    ]
};

let queued = false;

function installStyles() {
    if (document.querySelector('link[data-dashboard-recovery-card-style]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = STYLESHEET;
    link.dataset.dashboardRecoveryCardStyle = "true";
    document.head.appendChild(link);
}

function getSessions() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
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

function getLastSevenDayVolume() {
    const endDate = localDateValue();
    const startDate = shiftDate(endDate, -6);
    const volume = new Map();

    getSessions().forEach(session => {
        const date = String(session?.date || "").slice(0, 10);
        if (!date || date < startDate || date > endDate) return;

        (session?.exercises || []).forEach(exercise => {
            const sets = completedSetCount(exercise);
            if (!sets) return;
            getExerciseImpacts(exercise).forEach((credit, muscle) => {
                volume.set(muscle, (volume.get(muscle) || 0) + sets * credit);
            });
        });
    });

    return volume;
}

function renderOverlayUses(regions, values, asset, mode) {
    return Object.entries(regions).flatMap(([muscle, ids]) => {
        const state = values.get(muscle);
        const opacity = mode === "recovery"
            ? Number(state?.opacity ?? 0)
            : Math.max(0, Math.min(1, Number(state || 0) / NORMALIZATION_SETS));
        if (opacity <= 0) return [];
        const fill = mode === "recovery" ? "#ff315f" : TARGET_GREEN;
        return ids.map(id => {
            const href = `${asset}#${id}`;
            return `<use href="${href}" xlink:href="${href}" class="dashboard-muscle-region" style="--dashboard-muscle-fill:${fill};--dashboard-muscle-opacity:${opacity}"/>`;
        });
    }).join("");
}

function renderFigure(side, values, mode) {
    const front = side === "front";
    const asset = front ? FRONT_ASSET : BACK_ASSET;
    const regions = front ? FRONT_REGIONS : BACK_REGIONS;
    const viewBox = front ? "0 0 960 1920" : "960 0 960 1920";
    const imageX = front ? 0 : 960;
    const label = `${front ? "Front" : "Back"} ${mode === "recovery" ? "muscle recovery" : "seven-day muscle volume"} preview`;

    return `
        <svg class="dashboard-muscle-figure dashboard-muscle-${front ? "front" : "back"}" viewBox="${viewBox}" role="img" aria-label="${label}" xmlns:xlink="http://www.w3.org/1999/xlink">
            <image href="${asset}" xlink:href="${asset}" x="${imageX}" y="0" width="960" height="1920" preserveAspectRatio="xMidYMid meet"/>
            ${renderOverlayUses(regions, values, asset, mode)}
        </svg>
    `;
}

function formatRecoveryStatus(recoveryStates) {
    if (!recoveryStates.size) return "No data yet";
    const ready = getReadyRecoveryCount(recoveryStates);
    return `${ready} ready`;
}

function formatVolumeStatus(volume) {
    const total = [...volume.values()].reduce((sum, value) => sum + Number(value || 0), 0);
    if (!total) return "No volume yet";
    const rounded = Math.round(total * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} set credits`;
}

function renderCard({ mode, values, eyebrow, title, status }) {
    const recovery = mode === "recovery";
    return `
        <button class="dashboard-muscle-card is-${mode}" type="button" data-dashboard-open-muscle-mode="${mode}" aria-label="Open ${recovery ? "Muscle Recovery" : "7-Day Muscle Volume"}">
            <span class="dashboard-muscle-copy">
                <span class="eyebrow">${eyebrow}</span>
                <strong>${title}</strong>
                <span class="dashboard-muscle-status">${status}</span>
            </span>
            <span class="dashboard-muscle-visual" aria-hidden="true">
                <span class="dashboard-muscle-figure-stage">
                    ${renderFigure("front", values, mode)}
                    ${renderFigure("back", values, mode)}
                </span>
                <span class="dashboard-muscle-facing-label">FRONT ↔ BACK</span>
            </span>
            <span class="dashboard-muscle-link">Open <b aria-hidden="true">›</b></span>
        </button>
    `;
}

function renderGrid(recoveryStates, volume) {
    return `
        <div class="dashboard-muscle-snapshot-grid" data-dashboard-muscle-snapshot>
            ${renderCard({
                mode: "recovery",
                values: recoveryStates,
                eyebrow: "RECOVERY",
                title: "Recovery",
                status: formatRecoveryStatus(recoveryStates)
            })}
            ${renderCard({
                mode: "volume",
                values: volume,
                eyebrow: "LAST 7 DAYS",
                title: "Volume",
                status: formatVolumeStatus(volume)
            })}
        </div>
    `;
}

function ensureMuscleSnapshot() {
    const content = document.getElementById("content");
    if (!content?.classList.contains("dashboard-command-center")) return;

    const weekly = content.querySelector(".dashboard-command-weekly");
    if (!weekly) return;

    const recoveryStates = getRecoveryStates();
    const volume = getLastSevenDayVolume();
    const signature = JSON.stringify({
        recovery: [...recoveryStates.entries()]
            .map(([muscle, state]) => [muscle, state.percent])
            .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
        volume: [...volume.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    });

    const legacyCard = content.querySelector(":scope > .dashboard-recovery-card");
    legacyCard?.remove();

    let grid = content.querySelector("[data-dashboard-muscle-snapshot]");
    if (!grid) {
        weekly.insertAdjacentHTML("afterend", renderGrid(recoveryStates, volume));
        grid = content.querySelector("[data-dashboard-muscle-snapshot]");
    }
    else if (grid.dataset.signature !== signature) {
        grid.outerHTML = renderGrid(recoveryStates, volume);
        grid = content.querySelector("[data-dashboard-muscle-snapshot]");
    }

    if (grid) {
        grid.dataset.signature = signature;
        if (grid.previousElementSibling !== weekly) weekly.insertAdjacentElement("afterend", grid);
    }
}

function openMuscleMode(mode) {
    document.querySelector('.nav-btn[data-page="progress"]')?.click();

    let attempts = 0;
    const open = () => {
        const liftingTab = document.getElementById("lifting-tab");
        if (liftingTab && !liftingTab.classList.contains("active")) liftingTab.click();

        const trainingTab = document.querySelector('.training-progress-tab[data-view="training"]');
        if (trainingTab && !trainingTab.classList.contains("active")) trainingTab.click();

        const modeButton = document.querySelector(`[data-muscle-overview-mode="${mode === "recovery" ? "recovery" : "volume"}"]`);
        if (modeButton) {
            modeButton.click();
            document.querySelector(".muscle-overview-shell")?.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }

        attempts += 1;
        if (attempts < 20) requestAnimationFrame(open);
    };

    requestAnimationFrame(open);
}

function queueEnsureMuscleSnapshot() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        ensureMuscleSnapshot();
    });
}

document.addEventListener("click", event => {
    const card = event.target.closest("[data-dashboard-open-muscle-mode]");
    if (card) openMuscleMode(card.dataset.dashboardOpenMuscleMode);
});

const content = document.getElementById("content");
if (content) {
    new MutationObserver(queueEnsureMuscleSnapshot).observe(content, { childList: true, subtree: true });
}

window.addEventListener("storage", event => {
    if (event.key === SESSION_KEY) queueEnsureMuscleSnapshot();
});

window.addEventListener("focus", queueEnsureMuscleSnapshot);

installStyles();
queueEnsureMuscleSnapshot();
