import { getPresetPlan } from "./workout-plans.js";
import { getExerciseById } from "./exercise-library.js";
import { createGeneratedExerciseGuide } from "./exercise-guide-generator.js?v=full-library-guides-1";

const PLAN_STORAGE_KEY = "forge_workout_plans";
const TARGET_GREEN = "#45cb75";
const NORMALIZATION_SETS = 12;
const SECONDARY_SET_CREDIT = 0.5;

// These are the same custom SVG assets and fragment IDs used by Muscle Recovery.
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

let pendingPlanInfo = null;

function getSavedPlans() {
    try {
        const plans = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || "[]");
        return Array.isArray(plans) ? plans : [];
    }
    catch {
        return [];
    }
}

function getPlanFromCard(card) {
    if (!card) return null;

    if (card.dataset.planId) {
        const plan = getPresetPlan(card.dataset.planId);
        return plan ? { plan, card } : null;
    }

    if (card.dataset.customPlanId) {
        const plan = getSavedPlans().find(item => item?.id === card.dataset.customPlanId);
        return plan ? { plan, card } : null;
    }

    return null;
}

function rememberPlanFromPointer(event) {
    const card = event.target.closest?.(".preset-plan-card");
    if (!card || !card.closest(".workout-page")) return;
    pendingPlanInfo = getPlanFromCard(card) || pendingPlanInfo;
}

function rememberPlanFromKeyboard(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    rememberPlanFromPointer(event);
}

function normalizeRecoveryGroup(value) {
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

function getSetCount(exercise) {
    if (Array.isArray(exercise?.sets)) return exercise.sets.length;
    const count = Number(exercise?.sets);
    return Number.isFinite(count) && count > 0 ? count : 0;
}

function getExerciseImpacts(exercise) {
    const definition = getExerciseById(exercise?.id || exercise?.exerciseId);
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
        const fallback = normalizeRecoveryGroup(definition?.muscleGroup || exercise?.muscleGroup);
        return fallback ? new Map([[fallback, 1]]) : new Map();
    }

    // Collapse detailed muscles into the Recovery groups before crediting sets.
    // This prevents, for example, Front + Side Delts from double-counting one set.
    const impacts = new Map();
    secondary.forEach(muscle => {
        const group = normalizeRecoveryGroup(muscle);
        if (group) impacts.set(group, SECONDARY_SET_CREDIT);
    });
    primary.forEach(muscle => {
        const group = normalizeRecoveryGroup(muscle);
        if (group) impacts.set(group, 1);
    });
    return impacts;
}

function getWeeklyPlanVolume(plan) {
    const volume = new Map();
    const days = Array.isArray(plan?.days) ? plan.days : [];

    days.forEach(day => {
        const exercises = Array.isArray(day?.exercises) ? day.exercises : [];
        exercises.forEach(exercise => {
            const sets = getSetCount(exercise);
            if (!sets) return;

            getExerciseImpacts(exercise).forEach((credit, group) => {
                volume.set(group, (volume.get(group) || 0) + sets * credit);
            });
        });
    });

    return volume;
}

function anatomyMarkup(side) {
    const front = side === "front";
    const asset = front ? FRONT_ASSET : BACK_ASSET;
    const regions = front ? FRONT_REGIONS : BACK_REGIONS;
    const viewBox = front ? "0 0 960 1920" : "960 0 960 1920";
    const imageX = front ? 0 : 960;
    const svgClass = front ? "recovery-user-front-svg" : "recovery-user-back-svg";

    const overlays = Object.entries(regions).flatMap(([muscle, ids]) =>
        ids.map(id => {
            const href = `${asset}#${id}`;
            return `<use href="${href}" xlink:href="${href}" data-plan-target-muscle="${escapeHtml(muscle)}" class="plan-target-muscle"/>`;
        })
    ).join("");

    return `
        <svg class="${svgClass} plan-target-anatomy-svg" viewBox="${viewBox}" role="img" aria-label="${front ? "Front" : "Back"} weekly planned muscle-set distribution" xmlns:xlink="http://www.w3.org/1999/xlink">
            <image href="${asset}" xlink:href="${asset}" x="${imageX}" y="0" width="960" height="1920" preserveAspectRatio="xMidYMid meet"/>
            ${overlays}
        </svg>
    `;
}

function renderTargetMapSlide(side) {
    const label = side === "front" ? "Front" : "Back";
    return `
        <section class="plan-detail-day plan-target-map-slide" data-plan-target-map="${side}" aria-label="Plan Target Map — ${label}">
            <div class="plan-target-map-heading">
                <span class="eyebrow">PLAN TARGET MAP</span>
                <h3>${label}</h3>
                <p>Weekly planned set distribution</p>
            </div>
            <div class="plan-target-map-body">
                ${anatomyMarkup(side)}
            </div>
            <div class="plan-target-map-legend" aria-label="Planned set volume from lower to higher">
                <span>Lower</span>
                <i aria-hidden="true"></i>
                <span>Higher</span>
            </div>
        </section>
    `;
}

function applyPlanVolume(screen, volume) {
    screen.querySelectorAll(".plan-target-map-slide [data-plan-target-muscle]").forEach(node => {
        const sets = volume.get(node.dataset.planTargetMuscle) || 0;
        const intensity = Math.max(0, Math.min(1, sets / NORMALIZATION_SETS));
        node.style.setProperty("--plan-target-fill", TARGET_GREEN);
        node.style.setProperty("--plan-target-intensity", String(intensity));
        node.dataset.plannedSets = String(Math.round(sets * 10) / 10);
    });
}

function pageLabel(index, dayCount) {
    if (index === 0) return "Front · Plan Target Map";
    if (index === 1) return "Back · Plan Target Map";
    return `Day ${index - 1} of ${dayCount}`;
}

function initializePlanTargetCarousel(screen, dayCount) {
    const scroller = screen.querySelector(".plan-detail-days");
    const guide = screen.querySelector(".plan-day-swipe-guide");
    if (!scroller || !guide) return;

    const totalPages = dayCount + 2;
    guide.innerHTML = `
        <div class="plan-day-dots" aria-label="Workout plan page navigation">
            ${Array.from({ length: totalPages }, (_, index) => {
                const aria = index === 0
                    ? "Show front plan target map"
                    : index === 1
                        ? "Show back plan target map"
                        : `Show day ${index - 1}`;
                return `<button type="button" data-plan-target-dot="${index}" aria-label="${aria}" class="${index === 0 ? "active" : ""}"></button>`;
            }).join("")}
        </div>
        <span data-plan-target-counter>${pageLabel(0, dayCount)}</span>
        <strong>Swipe left or right to view target maps and workout days</strong>
    `;

    const dots = [...guide.querySelectorAll("[data-plan-target-dot]")];
    const counter = guide.querySelector("[data-plan-target-counter]");

    const updateIndicator = () => {
        const width = scroller.clientWidth || 1;
        const index = Math.max(0, Math.min(totalPages - 1, Math.round(scroller.scrollLeft / width)));
        dots.forEach((dot, dotIndex) => {
            dot.classList.toggle("active", dotIndex === index);
            dot.setAttribute("aria-current", dotIndex === index ? "true" : "false");
        });
        if (counter) counter.textContent = pageLabel(index, dayCount);
    };

    scroller.addEventListener("scroll", () => requestAnimationFrame(updateIndicator), { passive: true });
    dots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
            scroller.scrollTo({ left: scroller.clientWidth * index, behavior: "smooth" });
        });
    });
    updateIndicator();
}

function inferPlanFromScreen(screen) {
    if (pendingPlanInfo?.plan) return pendingPlanInfo.plan;
    const name = screen.querySelector(".plan-detail-header h2")?.textContent?.trim();
    if (!name) return null;

    const templateCards = [...document.querySelectorAll(".preset-plan-card[data-plan-id]")];
    for (const card of templateCards) {
        const plan = getPresetPlan(card.dataset.planId);
        if (plan?.name === name) return plan;
    }

    return getSavedPlans().find(plan => plan?.name === name) || null;
}

function enhancePlanDetails(screen) {
    if (!screen || screen.dataset.planTargetMapReady === "true") return;
    const plan = inferPlanFromScreen(screen);
    if (!plan) return;

    const originalScroller = screen.querySelector(".plan-detail-days");
    const guide = screen.querySelector(".plan-day-swipe-guide");
    if (!originalScroller) return;

    // Clone the day scroller to retain the existing day markup while removing the
    // original day-only scroll listener. Form Guide clicks remain delegated by the screen.
    const scroller = originalScroller.cloneNode(true);
    scroller.setAttribute("aria-label", "Plan target maps and workout days");
    scroller.insertAdjacentHTML("afterbegin", `${renderTargetMapSlide("front")}${renderTargetMapSlide("back")}`);
    originalScroller.replaceWith(scroller);

    if (!guide) {
        const newGuide = document.createElement("div");
        newGuide.className = "plan-day-swipe-guide";
        scroller.insertAdjacentElement("afterend", newGuide);
    }

    screen.dataset.planTargetMapReady = "true";
    const days = Array.isArray(plan?.days) ? plan.days : [];
    applyPlanVolume(screen, getWeeklyPlanVolume(plan));
    initializePlanTargetCarousel(screen, days.length);
    scroller.scrollLeft = 0;
}

function queueEnhancement() {
    const screen = document.getElementById("workout-plan-detail-screen");
    if (screen) requestAnimationFrame(() => enhancePlanDetails(screen));
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\\\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.addEventListener("pointerdown", rememberPlanFromPointer, true);
document.addEventListener("keydown", rememberPlanFromKeyboard, true);

const content = document.getElementById("content");
if (content) {
    new MutationObserver(queueEnhancement).observe(content, { childList: true, subtree: true });
}

queueEnhancement();