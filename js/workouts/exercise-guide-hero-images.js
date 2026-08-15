import { getAllExercises, getExerciseById } from "./exercise-library.js?v=exercise-library-guides-1";
import {
    getFormGuideMuscleVisual,
    renderFormGuideMuscleSvg
} from "./form-guide-anatomy.js?v=form-guide-anatomy-1";

const GUIDE_IMAGE_PATHS = {
    "barbell-bench-press": "assets/exercise-guides/performance/barbell-bench-press-guide.webp?v=1",
    "dumbbell-bench-press": "assets/exercise-guides/performance/dumbbell-bench-press.webp?v=2",
    "incline-barbell-press": "assets/exercise-guides/performance/incline-barbell-press.webp?v=1",
    "incline-dumbbell-press": "assets/exercise-guides/performance/incline-dumbbell-press.webp?v=1",
    "machine-chest-press": "assets/exercise-guides/performance/machine-chest-press.webp?v=1",
    "cable-fly": "assets/exercise-guides/performance/cable-fly.webp?v=1",
    "pec-deck": "assets/exercise-guides/performance/pec-deck.webp?v=1",
    "push-up": "assets/exercise-guides/performance/push-up.webp?v=1"
};

const GROUP_MUSCLES = {
    Chest: { primary: ["Chest"], secondary: ["Triceps", "Front Delts"] },
    Back: { primary: ["Lats", "Upper Back"], secondary: ["Biceps", "Rear Delts"] },
    Shoulders: { primary: ["Side Delts", "Front Delts"], secondary: ["Triceps"] },
    "Rear Delts": { primary: ["Rear Delts"], secondary: ["Upper Back"] },
    Biceps: { primary: ["Biceps"], secondary: ["Forearms"] },
    Triceps: { primary: ["Triceps"], secondary: ["Front Delts"] },
    Quads: { primary: ["Quads"], secondary: ["Glutes", "Adductors"] },
    Hamstrings: { primary: ["Hamstrings"], secondary: ["Glutes", "Spinal Erectors"] },
    Glutes: { primary: ["Glutes"], secondary: ["Hamstrings"] },
    Calves: { primary: ["Calves"], secondary: [] },
    Core: { primary: ["Rectus Abdominis", "Deep Core"], secondary: ["Obliques"] }
};

let stylesAdded = false;

function ensureStyles() {
    if (stylesAdded || document.getElementById("exercise-guide-hero-image-styles")) return;
    stylesAdded = true;
    const style = document.createElement("style");
    style.id = "exercise-guide-hero-image-styles";
    style.textContent = `
        .exercise-guide-hero-figure {
            margin: 14px 0 12px;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,.11);
            border-radius: 16px;
            background: #050506;
        }
        .exercise-guide-hero-figure > img {
            display: block;
            width: 100%;
            height: auto;
            aspect-ratio: 3 / 2;
            object-fit: cover;
            background: #000;
        }
        .exercise-guide-anatomy-overview {
            padding: 12px;
        }
        .exercise-guide-anatomy-overview figcaption {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 10px;
            margin: 0 2px 10px;
        }
        .exercise-guide-anatomy-overview figcaption strong {
            font-size: 13px;
            letter-spacing: .02em;
        }
        .exercise-guide-anatomy-overview figcaption small {
            color: #a0a0a0;
            font-size: 10px;
        }
        .exercise-guide-anatomy-strip {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            padding-bottom: 2px;
            scroll-snap-type: x proximity;
            scrollbar-width: thin;
        }
        .exercise-guide-anatomy-tile {
            flex: 0 0 min(36vw, 132px);
            min-width: 104px;
            padding: 7px;
            border: 1px solid rgba(255,255,255,.09);
            border-radius: 12px;
            background: #0b0b0d;
            scroll-snap-align: start;
        }
        .exercise-guide-anatomy-tile .form-guide-muscle-svg {
            display: block;
            width: 100%;
            aspect-ratio: 4 / 5;
            border-radius: 8px;
            background: #000;
        }
        .exercise-guide-anatomy-tile strong,
        .exercise-guide-anatomy-tile small {
            display: block;
        }
        .exercise-guide-anatomy-tile strong {
            margin-top: 7px;
            font-size: 11px;
            line-height: 1.2;
        }
        .exercise-guide-anatomy-tile small {
            margin-top: 3px;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: .07em;
            text-transform: uppercase;
        }
        .exercise-guide-anatomy-tile small.primary { color: #ff4d55; }
        .exercise-guide-anatomy-tile small.secondary { color: #ffad5c; }
        .exercise-muscle-image-frame .form-guide-muscle-svg {
            position: absolute;
            inset: 0;
            display: block;
            width: 100%;
            height: 100%;
        }
        .form-guide-anatomy-base {
            opacity: .74;
        }
        .form-guide-muscle-highlight {
            fill: #ff315f;
            opacity: .98;
            filter: drop-shadow(0 0 8px rgba(255,49,95,.32));
        }
        .exercise-guide-fallback-note {
            margin-top: 8px;
            color: #a0a0a0;
            font-size: 11px;
            line-height: 1.45;
        }
        .plan-detail-exercise-row.has-generated-exercise-guide {
            cursor: pointer;
        }
        @media (max-width: 390px) {
            .exercise-guide-anatomy-tile { flex-basis: 112px; }
        }
    `;
    document.head.appendChild(style);
}

function exerciseForTitle(title) {
    const clean = String(title || "").trim();
    return getAllExercises().find(exercise => exercise?.name === clean) || null;
}

function findRenderedGuide(exerciseId) {
    const exercise = getExerciseById(exerciseId);
    if (!exercise) return null;
    return [...document.querySelectorAll(".exercise-guide-screen")].find(screen =>
        screen.querySelector(".exercise-guide-header h2")?.textContent?.trim() === exercise.name
    ) || null;
}

function addPerformanceImage(exerciseId, screen) {
    const source = GUIDE_IMAGE_PATHS[exerciseId];
    if (!source) return false;

    const header = screen?.querySelector(".exercise-guide-header");
    if (!screen || !header || screen.querySelector(".exercise-guide-hero-figure")) return false;

    ensureStyles();
    const exercise = getExerciseById(exerciseId);
    const figure = document.createElement("figure");
    figure.className = "exercise-guide-hero-figure";

    const image = document.createElement("img");
    image.src = source;
    image.alt = `${exercise?.name || exerciseId.replaceAll("-", " ")} anatomy guide showing the working muscles`;
    image.loading = "eager";
    image.decoding = "async";

    figure.appendChild(image);
    header.insertAdjacentElement("afterend", figure);
    return true;
}

function upgradeMuscleCards(screen) {
    if (!screen) return;
    ensureStyles();

    screen.querySelectorAll(".exercise-muscle-card").forEach(card => {
        const muscle = card.querySelector("strong")?.textContent?.trim();
        const frame = card.querySelector(".exercise-muscle-image-frame");
        const config = getFormGuideMuscleVisual(muscle);
        if (!frame || !config || frame.dataset.formGuideAnatomy === muscle) return;

        const visual = renderFormGuideMuscleSvg(config);
        if (!visual) return;

        frame.innerHTML = visual;
        frame.dataset.formGuideAnatomy = muscle;
        frame.classList.add("form-guide-anatomy-frame");
    });
}

function addAnatomyOverview(screen) {
    const header = screen?.querySelector(".exercise-guide-header");
    if (!screen || !header || screen.querySelector(".exercise-guide-hero-figure")) return;

    const cards = [...screen.querySelectorAll(".exercise-muscle-card")]
        .map(card => ({
            name: card.querySelector("strong")?.textContent?.trim(),
            role: card.querySelector("span.primary") ? "primary" : "secondary"
        }))
        .filter(item => item.name && getFormGuideMuscleVisual(item.name));

    if (!cards.length) return;
    ensureStyles();

    const figure = document.createElement("figure");
    figure.className = "exercise-guide-hero-figure exercise-guide-anatomy-overview";
    figure.innerHTML = `
        <figcaption><strong>Muscle diagram</strong><small>Primary + secondary muscles</small></figcaption>
        <div class="exercise-guide-anatomy-strip">
            ${cards.map(item => `
                <div class="exercise-guide-anatomy-tile">
                    ${renderFormGuideMuscleSvg(getFormGuideMuscleVisual(item.name))}
                    <strong>${escapeHtml(item.name)}</strong>
                    <small class="${item.role}">${item.role}</small>
                </div>
            `).join("")}
        </div>
    `;
    header.insertAdjacentElement("afterend", figure);
}

function addGuideVisual(exerciseId, screen = null) {
    const target = screen || findRenderedGuide(exerciseId);
    if (!target) return;
    upgradeMuscleCards(target);
    if (!addPerformanceImage(exerciseId, target)) addAnatomyOverview(target);
}

function genericGuide(exercise) {
    const muscles = GROUP_MUSCLES[exercise?.muscleGroup] || { primary: [], secondary: [] };
    const equipment = String(exercise?.equipment || "equipment").toLowerCase();
    const isolation = exercise?.type === "isolation";
    const bodyweight = equipment === "bodyweight";
    const machine = equipment === "machine";
    const cable = equipment === "cable";

    return {
        ...muscles,
        setup: [
            machine
                ? "Adjust the machine so the working joints line up comfortably with the machine path."
                : cable
                    ? "Set the cable and attachment so tension follows the intended movement path."
                    : bodyweight
                        ? "Choose a stable starting position and use support or assistance if needed."
                        : `Set the ${equipment} securely and choose a stable starting position.`,
            "Use a load or variation you can control through a comfortable range.",
            "Brace and organize your posture before the first repetition."
        ],
        execution: [
            isolation
                ? "Move mainly through the target joint while keeping the rest of the body quiet."
                : "Move through the exercise with the working joints coordinated and the torso controlled.",
            "Use a smooth range of motion without bouncing or forcing the end position.",
            "Return to the start under control before beginning the next repetition."
        ],
        cues: ["Stable setup", "Smooth tempo", "Control the return"],
        mistakes: ["Using more load than can be controlled", "Changing body position to create momentum", "Forcing a painful or unstable range"]
    };
}

function renderFallbackMuscles(guide) {
    const items = [
        ...guide.primary.map(muscle => ({ muscle, role: "primary" })),
        ...guide.secondary.map(muscle => ({ muscle, role: "secondary" }))
    ].filter(item => getFormGuideMuscleVisual(item.muscle));

    if (!items.length) {
        return `<p class="exercise-guide-fallback-note">No anatomy diagram is available for this custom muscle category yet.</p>`;
    }

    return `<div class="exercise-muscle-grid">${items.map(item => `
        <article class="exercise-muscle-card">
            <div class="exercise-muscle-image-frame form-guide-anatomy-frame" data-form-guide-anatomy="${escapeHtml(item.muscle)}">
                ${renderFormGuideMuscleSvg(getFormGuideMuscleVisual(item.muscle))}
            </div>
            <strong>${escapeHtml(item.muscle)}</strong>
            <span class="${item.role}">${item.role}</span>
        </article>
    `).join("")}</div>`;
}

function createFallbackGuide(exerciseId, detail = {}) {
    const exercise = getExerciseById(exerciseId);
    const sourceScreen = document.querySelector(detail.sourceSelector || "#plan-builder");
    const page = sourceScreen?.closest(".workout-page");
    if (!exercise || !sourceScreen || !page) return null;

    const guide = genericGuide(exercise);
    const previousScrollY = window.scrollY;
    page.querySelector(".exercise-guide-screen")?.remove();

    const screen = document.createElement("section");
    screen.className = "exercise-guide-screen";
    screen.innerHTML = `
        <button class="plan-detail-back exercise-guide-back" type="button">${escapeHtml(detail.backLabel || "← Workout Plan")}</button>
        <header class="exercise-guide-header">
            <span class="eyebrow">EXERCISE GUIDE</span>
            <h2>${escapeHtml(exercise.name)}</h2>
            <p>General technique guidance based on the muscle group, exercise type and equipment saved for this exercise.</p>
            <p class="exercise-guide-fallback-note">For custom movements, use the specific setup recommended for the exact exercise variation you perform.</p>
        </header>
        <section class="exercise-guide-section">
            <h3>Muscles Used</h3>
            ${renderFallbackMuscles(guide)}
        </section>
        <section class="exercise-guide-section">
            <h3>Setup</h3>
            <ol>${guide.setup.map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
        </section>
        <section class="exercise-guide-section">
            <h3>How to Perform It</h3>
            <ol>${guide.execution.map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
        </section>
        <section class="exercise-guide-section exercise-cue-section">
            <h3>Key Cues</h3>
            <div class="exercise-cue-list">${guide.cues.map(cue => `<span>${escapeHtml(cue)}</span>`).join("")}</div>
        </section>
        <section class="exercise-guide-section">
            <h3>Common Mistakes</h3>
            <ul>${guide.mistakes.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>
    `;

    sourceScreen.hidden = true;
    sourceScreen.insertAdjacentElement("beforebegin", screen);
    screen.querySelector(".exercise-guide-back")?.addEventListener("click", () => {
        screen.remove();
        sourceScreen.hidden = false;
        requestAnimationFrame(() => window.scrollTo({ top: previousScrollY, behavior: "auto" }));
    });

    addGuideVisual(exerciseId, screen);
    if (detail.focusGuideStart) requestAnimationFrame(() => screen.scrollIntoView({ behavior: "auto", block: "start" }));
    return screen;
}

function addVisualToRenderedGuide(screen) {
    if (!(screen instanceof Element) || !screen.matches(".exercise-guide-screen")) return;
    const title = screen.querySelector(".exercise-guide-header h2")?.textContent?.trim();
    const exercise = exerciseForTitle(title);
    if (exercise) addGuideVisual(exercise.id, screen);
}

function enhanceUnguidedPlanRows(root = document) {
    root.querySelectorAll?.(".plan-detail-exercise-row:not(.has-exercise-guide):not([data-generated-guide-ready])").forEach(row => {
        const nameNode = row.querySelector(".plan-detail-exercise-name");
        const exercise = exerciseForTitle(nameNode?.textContent);
        if (!exercise) return;

        row.dataset.generatedGuideReady = "1";
        row.classList.add("has-exercise-guide", "has-generated-exercise-guide");
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", "0");
        row.setAttribute("aria-label", `Open ${exercise.name} exercise guide`);
        if (nameNode && !nameNode.querySelector(".exercise-guide-label")) {
            nameNode.insertAdjacentHTML("beforeend", '<span class="exercise-guide-label">Form guide</span>');
        }

        const open = () => document.dispatchEvent(new CustomEvent("levelup:open-exercise-guide", {
            detail: {
                exerciseId: exercise.id,
                sourceSelector: "#workout-plan-detail-screen",
                backLabel: "← Workout Plan",
                focusGuideStart: true
            }
        }));
        row.addEventListener("click", open);
        row.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            open();
        });
    });
}

document.addEventListener("levelup:open-exercise-guide", event => {
    const exerciseId = event.detail?.exerciseId;
    if (!exerciseId) return;
    queueMicrotask(() => {
        const screen = findRenderedGuide(exerciseId);
        if (screen) addGuideVisual(exerciseId, screen);
        else createFallbackGuide(exerciseId, event.detail || {});
    });
});

const guideObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (!(node instanceof Element)) return;
            if (node.matches(".exercise-guide-screen")) addVisualToRenderedGuide(node);
            node.querySelectorAll?.(".exercise-guide-screen").forEach(addVisualToRenderedGuide);
            enhanceUnguidedPlanRows(node);
        });
    });
});

guideObserver.observe(document.documentElement, { childList: true, subtree: true });
document.querySelectorAll(".exercise-guide-screen").forEach(addVisualToRenderedGuide);
enhanceUnguidedPlanRows();

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
