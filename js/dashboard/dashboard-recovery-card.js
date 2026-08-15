import { getExerciseById } from "../workouts/exercise-library.js?v=dashboard-recovery-preview-1";

const SESSION_KEY = "forge_workout_sessions";
const FULL_RECOVERY_HOURS = 72;
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
    Glutes: ["muscle_front_047", "muscle_front_048"],
    Adductors: ["muscle_front_049", "muscle_front_050"],
    Quads: [
        "muscle_front_051", "muscle_front_052", "muscle_front_067",
        "muscle_front_068", "muscle_front_069", "muscle_front_070"
    ],
    Calves: [
        "muscle_front_073", "muscle_front_074", "muscle_front_075", "muscle_front_076",
        "muscle_front_077", "muscle_front_078", "muscle_front_079", "muscle_front_080"
    ]
};

const BACK_REGIONS = {
    Shoulders: ["muscle_back_016", "muscle_back_017"],
    Back: [
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

function readSessions() {
    try {
        const sessions = JSON.parse(localStorage.getItem(SESSION_KEY) || "[]");
        return Array.isArray(sessions) ? sessions : [];
    }
    catch {
        return [];
    }
}

function getSessionTime(session) {
    const raw = session?.completedAt || session?.endTime || session?.date;
    if (!raw) return 0;
    const time = new Date(raw).getTime();
    return Number.isFinite(time) ? time : 0;
}

function hasPerformedSet(exercise) {
    return (exercise?.sets || []).some(set =>
        set?.completed === true ||
        Number(set?.reps) > 0 ||
        Number(set?.weight) > 0 ||
        Number(set?.duration) > 0 ||
        Number(set?.durationMinutes) > 0
    );
}

function normalizeMuscle(value) {
    const text = String(value || "").trim();
    if (!text || /cardio|other/i.test(text)) return "";

    const aliases = {
        Quadriceps: "Quads",
        Hamstring: "Hamstrings",
        Shoulder: "Shoulders",
        "Rear Delts": "Shoulders",
        Glute: "Glutes",
        Calf: "Calves",
        Abs: "Core",
        Abdominals: "Core"
    };

    return aliases[text] || text;
}

function getRecovery() {
    const latest = new Map();

    readSessions().forEach(session => {
        const time = getSessionTime(session);
        if (!time) return;

        (session.exercises || []).forEach(exercise => {
            if (!hasPerformedSet(exercise)) return;
            const definition = getExerciseById(exercise.exerciseId);
            const muscle = normalizeMuscle(definition?.muscleGroup || exercise.muscleGroup);
            if (!muscle) return;
            if (time > (latest.get(muscle) || 0)) latest.set(muscle, time);
        });
    });

    return [...latest.entries()].map(([muscle, time]) => {
        const hours = Math.max(0, (Date.now() - time) / 3600000);
        return {
            muscle,
            hours,
            percent: Math.min(100, Math.round((hours / FULL_RECOVERY_HOURS) * 100))
        };
    });
}

function recoveryOpacity(percent) {
    const normalized = Math.max(0, Math.min(100, Number(percent) || 0));
    return Math.max(0, 0.92 * (1 - normalized / 100)).toFixed(3);
}

function colorForPercent(percent) {
    const normalized = Math.max(0, Math.min(100, Number(percent) || 0)) / 100;
    const fatigued = [255, 49, 95];
    const recovered = [118, 119, 132];
    const rgb = fatigued.map((start, index) =>
        Math.round(start + (recovered[index] - start) * normalized)
    );
    return `rgb(${rgb.join(",")})`;
}

function renderOverlayUses(regions, recoveryByMuscle, asset) {
    return Object.entries(regions).flatMap(([muscle, ids]) => {
        const item = recoveryByMuscle.get(muscle);
        if (!item) return [];
        const fill = colorForPercent(item.percent);
        const opacity = recoveryOpacity(item.percent);
        return ids.map(id => {
            const href = `${asset}#${id}`;
            return `<use href="${href}" xlink:href="${href}" class="dashboard-recovery-muscle" style="--dashboard-recovery-fill:${fill};--dashboard-recovery-opacity:${opacity}"/>`;
        });
    }).join("");
}

function renderFront(recoveryByMuscle) {
    return `
        <svg class="dashboard-recovery-figure dashboard-recovery-front" viewBox="0 0 960 1920" role="img" aria-label="Front muscle recovery preview" xmlns:xlink="http://www.w3.org/1999/xlink">
            <image href="${FRONT_ASSET}" xlink:href="${FRONT_ASSET}" x="0" y="0" width="960" height="1920" preserveAspectRatio="xMidYMid meet"/>
            ${renderOverlayUses(FRONT_REGIONS, recoveryByMuscle, FRONT_ASSET)}
        </svg>
    `;
}

function renderBack(recoveryByMuscle) {
    return `
        <svg class="dashboard-recovery-figure dashboard-recovery-back" viewBox="960 0 960 1920" role="img" aria-label="Back muscle recovery preview" xmlns:xlink="http://www.w3.org/1999/xlink">
            <image href="${BACK_ASSET}" xlink:href="${BACK_ASSET}" x="960" y="0" width="960" height="1920" preserveAspectRatio="xMidYMid meet"/>
            ${renderOverlayUses(BACK_REGIONS, recoveryByMuscle, BACK_ASSET)}
        </svg>
    `;
}

function formatStatus(recovery) {
    if (!recovery.length) return "No recovery data";
    const ready = recovery.filter(item => item.percent >= 100).length;
    return `${ready}/${recovery.length} ready`;
}

function renderCard(recovery) {
    const recoveryByMuscle = new Map(recovery.map(item => [item.muscle, item]));
    const helper = recovery.length
        ? "Based on your most recent completed workouts"
        : "Complete a workout to start tracking recovery";

    return `
        <button class="dashboard-recovery-card" type="button" data-dashboard-open-recovery aria-label="Open Muscle Recovery">
            <span class="dashboard-recovery-copy">
                <span class="eyebrow">RECOVERY</span>
                <strong>Muscle Recovery</strong>
                <span class="dashboard-recovery-status">${formatStatus(recovery)}</span>
                <small>${helper}</small>
                <span class="dashboard-recovery-link">View recovery <b aria-hidden="true">›</b></span>
            </span>
            <span class="dashboard-recovery-visual" aria-hidden="true">
                <span class="dashboard-recovery-figure-stage">
                    ${renderFront(recoveryByMuscle)}
                    ${renderBack(recoveryByMuscle)}
                </span>
                <span class="dashboard-recovery-facing-label">FRONT ↔ BACK</span>
            </span>
        </button>
    `;
}

function ensureRecoveryCard() {
    const content = document.getElementById("content");
    if (!content?.classList.contains("dashboard-command-center")) return;

    const weekly = content.querySelector(".dashboard-command-weekly");
    if (!weekly) return;

    const recovery = getRecovery();
    const signature = JSON.stringify(recovery
        .map(item => [item.muscle, item.percent])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))));

    let card = content.querySelector(".dashboard-recovery-card");
    if (!card) {
        weekly.insertAdjacentHTML("afterend", renderCard(recovery));
        card = content.querySelector(".dashboard-recovery-card");
    }
    else if (card.dataset.signature !== signature) {
        card.outerHTML = renderCard(recovery);
        card = content.querySelector(".dashboard-recovery-card");
    }

    if (card) card.dataset.signature = signature;
}

function openRecoveryPage() {
    document.querySelector('.nav-btn[data-page="progress"]')?.click();

    let attempts = 0;
    const openRecovery = () => {
        const liftingTab = document.getElementById("lifting-tab");
        if (liftingTab && !liftingTab.classList.contains("active")) liftingTab.click();

        const recoveryTab = document.querySelector('.training-progress-tab[data-view="recovery"]');
        if (recoveryTab) {
            recoveryTab.click();
            recoveryTab.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        attempts += 1;
        if (attempts < 16) requestAnimationFrame(openRecovery);
    };

    requestAnimationFrame(openRecovery);
}

function queueEnsureRecoveryCard() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        ensureRecoveryCard();
    });
}

document.addEventListener("click", event => {
    if (event.target.closest("[data-dashboard-open-recovery]")) {
        openRecoveryPage();
    }
});

const content = document.getElementById("content");
if (content) {
    new MutationObserver(queueEnsureRecoveryCard).observe(content, { childList: true, subtree: true });
}

window.addEventListener("storage", event => {
    if (event.key === SESSION_KEY) queueEnsureRecoveryCard();
});

queueEnsureRecoveryCard();
