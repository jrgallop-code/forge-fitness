import {
    getRecoveryStates,
    getReadyRecoveryCount
} from "../progress/recovery-secondary-muscles.js?v=recovery-secondary-6";

const SESSION_KEY = "forge_workout_sessions";
const FRONT_ASSET = "assets/recovery/front-view.svg?v=recovery-front-vector-2";
const BACK_ASSET = "assets/recovery/back-view.svg?v=recovery-back-vector-1";
const STYLESHEET = "css/dashboard-recovery-card.css?v=dashboard-recovery-preview-1";

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
    "Rear Delts": ["muscle_back_016", "muscle_back_017"],
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

function installStyles() {
    if (document.querySelector('link[data-dashboard-recovery-card-style]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = STYLESHEET;
    link.dataset.dashboardRecoveryCardStyle = "true";
    document.head.appendChild(link);
}

function renderOverlayUses(regions, recoveryStates, asset) {
    return Object.entries(regions).flatMap(([muscle, ids]) => {
        const state = recoveryStates.get(muscle);
        if (!state) return [];
        const opacity = String(state.opacity ?? 0.04);
        return ids.map(id => {
            const href = `${asset}#${id}`;
            return `<use href="${href}" xlink:href="${href}" class="dashboard-recovery-muscle" style="--dashboard-recovery-fill:#ff315f;--dashboard-recovery-opacity:${opacity}"/>`;
        });
    }).join("");
}

function renderFront(recoveryStates) {
    return `
        <svg class="dashboard-recovery-figure dashboard-recovery-front" viewBox="0 0 960 1920" role="img" aria-label="Front muscle recovery preview" xmlns:xlink="http://www.w3.org/1999/xlink">
            <image href="${FRONT_ASSET}" xlink:href="${FRONT_ASSET}" x="0" y="0" width="960" height="1920" preserveAspectRatio="xMidYMid meet"/>
            ${renderOverlayUses(FRONT_REGIONS, recoveryStates, FRONT_ASSET)}
        </svg>
    `;
}

function renderBack(recoveryStates) {
    return `
        <svg class="dashboard-recovery-figure dashboard-recovery-back" viewBox="960 0 960 1920" role="img" aria-label="Back muscle recovery preview" xmlns:xlink="http://www.w3.org/1999/xlink">
            <image href="${BACK_ASSET}" xlink:href="${BACK_ASSET}" x="960" y="0" width="960" height="1920" preserveAspectRatio="xMidYMid meet"/>
            ${renderOverlayUses(BACK_REGIONS, recoveryStates, BACK_ASSET)}
        </svg>
    `;
}

function formatStatus(recoveryStates) {
    if (!recoveryStates.size) return "No recovery data";
    const ready = getReadyRecoveryCount(recoveryStates);
    return `${ready} muscle ${ready === 1 ? "group" : "groups"} ready`;
}

function renderCard(recoveryStates) {
    const helper = recoveryStates.size
        ? "Uses the same recovery model as your full Recovery page"
        : "Complete a workout to start tracking recovery";

    return `
        <button class="dashboard-recovery-card" type="button" data-dashboard-open-recovery aria-label="Open Muscle Recovery">
            <span class="dashboard-recovery-copy">
                <span class="eyebrow">RECOVERY</span>
                <strong>Muscle Recovery</strong>
                <span class="dashboard-recovery-status">${formatStatus(recoveryStates)}</span>
                <small>${helper}</small>
                <span class="dashboard-recovery-link">View recovery <b aria-hidden="true">›</b></span>
            </span>
            <span class="dashboard-recovery-visual" aria-hidden="true">
                <span class="dashboard-recovery-figure-stage">
                    ${renderFront(recoveryStates)}
                    ${renderBack(recoveryStates)}
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

    const recoveryStates = getRecoveryStates();
    const signature = JSON.stringify([...recoveryStates.entries()]
        .map(([muscle, state]) => [muscle, state.percent, state.opacity])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))));

    let card = content.querySelector(".dashboard-recovery-card");
    if (!card) {
        weekly.insertAdjacentHTML("afterend", renderCard(recoveryStates));
        card = content.querySelector(".dashboard-recovery-card");
    }
    else if (card.dataset.signature !== signature) {
        card.outerHTML = renderCard(recoveryStates);
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

window.addEventListener("focus", queueEnsureRecoveryCard);

installStyles();
queueEnsureRecoveryCard();
