import { getExerciseById } from "../workouts/exercise-library.js";
import { createGeneratedExerciseGuide } from "../workouts/exercise-guide-generator.js?v=full-library-guides-1";
import { getAnatomyConfig } from "../core/anatomy-profile.js?v=female-anatomy-1";

const SESSION_STORAGE_KEY = "forge_workout_sessions";
const TARGET_GREEN = "#45cb75";
const NORMALIZATION_SETS = 12;
const SECONDARY_SET_CREDIT = 0.5;
const FRONT_ASSET = "assets/recovery/front-view.svg?v=recovery-front-vector-2";
const BACK_ASSET = "assets/recovery/back-view.svg?v=recovery-back-vector-1";

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

function getSessions() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "[]");
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

function getLastSevenDayVolume() {
    const endDate = localDateValue();
    const startDate = shiftDate(endDate, -6);
    const volume = new Map();

    getSessions().forEach(session => {
        const date = String(session?.date || "");
        if (!date || date < startDate || date > endDate) return;

        (session.exercises || []).forEach(exercise => {
            const sets = completedSetCount(exercise);
            if (!sets) return;

            getExerciseImpacts(exercise).forEach((credit, muscle) => {
                volume.set(muscle, (volume.get(muscle) || 0) + sets * credit);
            });
        });
    });

    return { startDate, endDate, volume };
}

function anatomyMarkup(side) {
    const front = side === "front";
    const { asset, regions, viewBox, imageX } = getAnatomyConfig(side);

    const overlays = Object.entries(regions).flatMap(([muscle, ids]) =>
        ids.map(id => {
            const href = `${asset}#${id}`;
            return `<use href="${href}" xlink:href="${href}" data-seven-day-muscle="${escapeHtml(muscle)}" class="seven-day-volume-muscle"/>`;
        })
    ).join("");

    return `
        <figure class="seven-day-volume-figure">
            <svg class="seven-day-volume-anatomy" viewBox="${viewBox}" role="img" aria-label="${front ? "Front" : "Back"} muscle volume in the last seven days" xmlns:xlink="http://www.w3.org/1999/xlink">
                <image href="${asset}" xlink:href="${asset}" x="${imageX}" y="0" width="960" height="1920" preserveAspectRatio="xMidYMid meet"/>
                ${overlays}
            </svg>
            <figcaption>${front ? "Front" : "Back"}</figcaption>
        </figure>
    `;
}

function renderSevenDayVolume() {
    const root = document.querySelector("[data-seven-day-volume-root]");
    if (!root) return;

    const { startDate, endDate, volume } = getLastSevenDayVolume();
    const entries = [...volume.entries()]
        .filter(([, sets]) => sets > 0)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    root.innerHTML = `
        <div class="seven-day-volume-heading">
            <div>
                <span class="eyebrow">MUSCLE VOLUME</span>
                <h4>Your Last 7 Days</h4>
                <p>Completed hypertrophy volume by muscle group.</p>
            </div>
            <strong class="seven-day-volume-window">${escapeHtml(formatDateWindow(startDate, endDate))}</strong>
        </div>

        <div class="seven-day-volume-map-card">
            <div class="seven-day-volume-bodies">
                ${anatomyMarkup("front")}
                ${anatomyMarkup("back")}
            </div>
            <div class="seven-day-volume-legend" aria-label="Completed set volume from lower to higher">
                <span>Lower</span><i aria-hidden="true"></i><span>Higher</span>
            </div>
            <p class="seven-day-volume-note">Same scale as Plan Target Maps: 0 sets stays neutral grey; green intensity increases continuously to full intensity at 12+ set credits.</p>
        </div>

        <div class="seven-day-volume-breakdown">
            <div class="seven-day-volume-breakdown-heading">
                <h4>Muscle Breakdown</h4>
                <span>Primary 1.0 · Secondary 0.5</span>
            </div>
            ${entries.length ? entries.map(([muscle, sets]) => renderVolumeRow(muscle, sets)).join("") : '<p class="empty-state">Complete working sets to populate your 7-day muscle map.</p>'}
        </div>
    `;

    root.querySelectorAll("[data-seven-day-muscle]").forEach(node => {
        const sets = volume.get(node.dataset.sevenDayMuscle) || 0;
        const intensity = Math.max(0, Math.min(1, sets / NORMALIZATION_SETS));
        node.style.setProperty("--seven-day-volume-fill", TARGET_GREEN);
        node.style.setProperty("--seven-day-volume-intensity", String(intensity));
        node.dataset.completedSets = formatSets(sets);
    });
}

function renderVolumeRow(muscle, sets) {
    const intensity = Math.max(0, Math.min(1, sets / NORMALIZATION_SETS));
    return `
        <div class="seven-day-volume-row">
            <div class="seven-day-volume-row-top">
                <strong>${escapeHtml(muscle)}</strong>
                <span>${escapeHtml(formatSets(sets))} sets</span>
            </div>
            <div class="seven-day-volume-track" aria-hidden="true">
                <div class="seven-day-volume-fill" style="width:${(intensity * 100).toFixed(1)}%"></div>
            </div>
        </div>
    `;
}

function formatSets(value) {
    const rounded = Math.round(Number(value) * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatDateWindow(startDate, endDate) {
    const start = new Date(`${startDate}T12:00:00`);
    const end = new Date(`${endDate}T12:00:00`);
    const startMonth = start.toLocaleDateString(undefined, { month: "short" });
    const endMonth = end.toLocaleDateString(undefined, { month: "short" });
    if (startMonth === endMonth) return `${startMonth} ${start.getDate()}–${end.getDate()}`;
    return `${startMonth} ${start.getDate()}–${endMonth} ${end.getDate()}`;
}

function createSharedNav() {
    const nav = document.createElement("div");
    nav.className = "muscle-overview-shell";
    nav.dataset.muscleOverviewReady = "true";
    nav.dataset.muscleMode = "volume";
    nav.hidden = true;
    nav.innerHTML = `
        <div class="muscle-overview-intro">
            <span class="eyebrow">MUSCLE OVERVIEW</span>
            <h4>See what you trained and how recovered you are</h4>
            <p>Compare completed muscle volume from the last 7 days with your current recovery map.</p>
        </div>
        <div class="muscle-overview-toggle" role="tablist" aria-label="Muscle overview mode">
            <button class="active" type="button" role="tab" aria-selected="true" data-muscle-overview-mode="volume">7-Day Volume</button>
            <button type="button" role="tab" aria-selected="false" data-muscle-overview-mode="recovery">Recovery</button>
        </div>
    `;
    return nav;
}

function createVolumeContent() {
    const content = document.createElement("div");
    content.className = "muscle-overview-volume-content";
    content.dataset.muscleOverviewVolumeContent = "true";
    content.innerHTML = `
        <div data-seven-day-volume-root></div>
        <div class="muscle-overview-more-heading">
            <span class="eyebrow">LONGER-TERM ANALYTICS</span>
            <h4>More Volume Analytics</h4>
        </div>
    `;
    return content;
}

function ensureVolumeContentFirst(trainingView, volumeContent) {
    if (!trainingView?.isConnected || !volumeContent?.isConnected) return;
    if (trainingView.firstElementChild !== volumeContent) trainingView.prepend(volumeContent);
}

function refreshRecoveryEnhancers() {
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("resize"));
}

function setMode(nav, trainingView, recoveryView, volumeContent, mode) {
    if (!nav || !trainingView || !recoveryView) return;
    const nextMode = mode === "recovery" ? "recovery" : "volume";
    nav.dataset.muscleMode = nextMode;
    nav.hidden = false;

    nav.querySelectorAll("[data-muscle-overview-mode]").forEach(button => {
        const active = button.dataset.muscleOverviewMode === nextMode;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
    });

    trainingView.hidden = nextMode !== "volume";
    recoveryView.hidden = nextMode !== "recovery";

    if (nextMode === "volume") {
        ensureVolumeContentFirst(trainingView, volumeContent);
        renderSevenDayVolume();
    }
    else {
        refreshRecoveryEnhancers();
    }
}

function hideSharedNav(nav) {
    if (nav) nav.hidden = true;
}

function enhanceMuscleOverview() {
    const lifting = document.getElementById("lifting-progress");
    const tabs = lifting?.querySelector(".training-progress-tabs");
    const trainingView = lifting?.querySelector('.training-progress-view[data-view="training"]');
    const trainingTab = tabs?.querySelector('.training-progress-tab[data-view="training"]');
    const recoveryView = lifting?.querySelector('.training-progress-view[data-view="recovery"]');
    const recoveryTab = tabs?.querySelector('.training-progress-tab[data-view="recovery"]');
    if (!lifting || !tabs || !trainingView || !trainingTab || !recoveryView) return;

    trainingTab.textContent = "Muscles";
    recoveryTab?.remove();

    let nav = lifting.querySelector(":scope > .muscle-overview-shell");
    if (!nav) {
        nav = createSharedNav();
        tabs.insertAdjacentElement("afterend", nav);
    }

    let volumeContent = trainingView.querySelector(":scope > [data-muscle-overview-volume-content]");
    if (!volumeContent) {
        volumeContent = createVolumeContent();
        trainingView.prepend(volumeContent);

        new MutationObserver(() => ensureVolumeContentFirst(trainingView, volumeContent))
            .observe(trainingView, { childList: true });
    }

    if (nav.dataset.muscleOverviewBound !== "true") {
        nav.dataset.muscleOverviewBound = "true";
        nav.querySelectorAll("[data-muscle-overview-mode]").forEach(button => {
            button.addEventListener("click", () => {
                setMode(nav, trainingView, recoveryView, volumeContent, button.dataset.muscleOverviewMode);
            });
        });
    }

    const activeTab = tabs.querySelector(".training-progress-tab.active")?.dataset.view;
    if (activeTab === "training") {
        setMode(nav, trainingView, recoveryView, volumeContent, nav.dataset.muscleMode || "volume");
    }
    else {
        hideSharedNav(nav);
    }

    renderSevenDayVolume();
}

function queueEnhancement() {
    requestAnimationFrame(enhanceMuscleOverview);
    window.setTimeout(enhanceMuscleOverview, 80);
}

document.addEventListener("click", event => {
    const tab = event.target.closest?.(".training-progress-tab");
    if (tab) {
        window.setTimeout(() => {
            enhanceMuscleOverview();
            const lifting = document.getElementById("lifting-progress");
            const nav = lifting?.querySelector(":scope > .muscle-overview-shell");
            const trainingView = lifting?.querySelector('.training-progress-view[data-view="training"]');
            const recoveryView = lifting?.querySelector('.training-progress-view[data-view="recovery"]');
            const volumeContent = trainingView?.querySelector(":scope > [data-muscle-overview-volume-content]");

            if (tab.dataset.view === "training" && nav && trainingView && recoveryView && volumeContent) {
                setMode(nav, trainingView, recoveryView, volumeContent, nav.dataset.muscleMode || "volume");
                requestAnimationFrame(() => requestAnimationFrame(() => ensureVolumeContentFirst(trainingView, volumeContent)));
            }
            else {
                hideSharedNav(nav);
            }
        }, 0);
        return;
    }

    if (event.target.closest?.("#lifting-tab")) {
        window.setTimeout(enhanceMuscleOverview, 0);
        return;
    }

    if (event.target.closest?.("#load-training-demo, #remove-training-demo")) {
        window.setTimeout(renderSevenDayVolume, 0);
    }
});

const contentRoot = document.getElementById("content");
if (contentRoot) {
    // Progress routing replaces #content's direct child. Observe only that level so
    // the muscle map's own DOM updates cannot retrigger setup in a loop.
    new MutationObserver(queueEnhancement).observe(contentRoot, { childList: true });
}

window.addEventListener("storage", event => {
    if (event.key === SESSION_STORAGE_KEY) renderSevenDayVolume();
});

queueEnhancement();

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
