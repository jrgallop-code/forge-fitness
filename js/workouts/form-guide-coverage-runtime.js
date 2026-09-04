import "./exercise-library-expansion.js?v=exercise-library-expansion-1";
import { getAllExercises, getExerciseById } from "./exercise-library.js?v=exercise-library-catalogue-2";
import { createGeneratedExerciseGuide } from "./exercise-guide-generator.js?v=full-library-guides-2";
import {
    getFormGuideMuscleVisual,
    renderFormGuideMuscleSvg
} from "./form-guide-anatomy.js?v=form-guide-anatomy-2";

const RUNTIME_ATTR = "data-form-guide-runtime-ready";
const STYLE_ID = "form-guide-runtime-anatomy-styles";

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function normalizeName(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\bform guide\b/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .form-guide-runtime-screen .exercise-guide-anatomy-overview {
            margin:14px 0 12px;
            padding:12px;
            overflow:hidden;
            border:1px solid var(--line,rgba(255,255,255,.11));
            border-radius:16px;
            background:var(--surface-raised,#050506);
        }
        .form-guide-runtime-screen .exercise-guide-anatomy-overview figcaption {
            display:flex;
            align-items:baseline;
            justify-content:space-between;
            gap:10px;
            margin:0 2px 10px;
        }
        .form-guide-runtime-screen .exercise-guide-anatomy-overview figcaption strong {
            font-size:13px;
            letter-spacing:.02em;
        }
        .form-guide-runtime-screen .exercise-guide-anatomy-overview figcaption small {
            color:var(--muted,#a0a0a0);
            font-size:10px;
        }
        .form-guide-runtime-screen .exercise-guide-anatomy-strip {
            display:flex;
            gap:8px;
            overflow-x:auto;
            padding-bottom:4px;
            scroll-snap-type:x proximity;
            scrollbar-width:thin;
        }
        .form-guide-runtime-screen .exercise-guide-anatomy-tile {
            flex:0 0 min(36vw,132px);
            min-width:104px;
            padding:7px;
            border:1px solid var(--line,rgba(255,255,255,.09));
            border-radius:12px;
            background:var(--surface,#0b0b0d);
            scroll-snap-align:start;
        }
        .form-guide-runtime-screen .exercise-guide-anatomy-tile .form-guide-muscle-svg {
            display:block!important;
            width:100%!important;
            height:auto!important;
            aspect-ratio:4/5;
            border-radius:8px;
            background:#000;
        }
        .form-guide-runtime-screen .exercise-guide-anatomy-tile strong,
        .form-guide-runtime-screen .exercise-guide-anatomy-tile small {
            display:block;
            visibility:visible;
            opacity:1;
        }
        .form-guide-runtime-screen .exercise-guide-anatomy-tile strong {
            margin-top:7px;
            font-size:11px;
            line-height:1.2;
        }
        .form-guide-runtime-screen .exercise-guide-anatomy-tile small {
            margin-top:3px;
            font-size:9px;
            font-weight:800;
            letter-spacing:.07em;
            text-transform:uppercase;
        }
        .form-guide-runtime-screen .exercise-guide-anatomy-tile small.primary { color:var(--muscle-recovery-accent,#ff315f); }
        .form-guide-runtime-screen .exercise-guide-anatomy-tile small.secondary { color:var(--text-secondary,#a0a0a0); }
        .form-guide-runtime-screen .exercise-muscle-image-frame .form-guide-muscle-svg {
            position:absolute;
            inset:0;
            display:block!important;
            width:100%!important;
            height:100%!important;
        }
        @media(max-width:390px){
            .form-guide-runtime-screen .exercise-guide-anatomy-tile { flex-basis:112px; }
        }
    `;
    document.head.appendChild(style);
}

function guideForExercise(exercise) {
    if (!exercise) return null;
    return createGeneratedExerciseGuide(exercise);
}

function exerciseFromName(name) {
    const normalized = normalizeName(name);
    if (!normalized) return null;
    return getAllExercises().find(exercise => normalizeName(exercise?.name) === normalized) || null;
}

function visualConfig(muscle) {
    return getFormGuideMuscleVisual(muscle);
}

function muscleVisualMarkup(muscle) {
    const config = visualConfig(muscle);
    const svg = config ? renderFormGuideMuscleSvg(config) : "";
    return svg || `<span class="exercise-muscle-visual-fallback" aria-hidden="true"></span>`;
}

function anatomyItems(guide) {
    return [
        ...(guide?.primary || []).map(muscle => ({ muscle, role: "primary" })),
        ...(guide?.secondary || []).map(muscle => ({ muscle, role: "secondary" }))
    ].filter(item => visualConfig(item.muscle));
}

function renderAnatomyOverview(guide) {
    const items = anatomyItems(guide);
    if (!items.length) return "";
    return `
        <figure class="exercise-guide-hero-figure exercise-guide-anatomy-overview" data-runtime-anatomy-overview="1">
            <figcaption><strong>Muscle diagram</strong><small>Primary + secondary muscles</small></figcaption>
            <div class="exercise-guide-anatomy-strip">
                ${items.map(item => `
                    <div class="exercise-guide-anatomy-tile" data-runtime-muscle="${escapeHtml(item.muscle)}">
                        ${muscleVisualMarkup(item.muscle)}
                        <strong>${escapeHtml(item.muscle)}</strong>
                        <small class="${item.role}">${item.role}</small>
                    </div>
                `).join("")}
            </div>
        </figure>`;
}

function renderMuscleCards(guide) {
    const muscles = anatomyItems(guide);
    if (!muscles.length) return "";
    return `
        <section class="exercise-guide-section">
            <h3>Muscles Used</h3>
            <div class="exercise-muscle-grid">
                ${muscles.map(item => `
                    <article class="exercise-muscle-card" data-runtime-muscle="${escapeHtml(item.muscle)}">
                        <div class="exercise-muscle-image-frame form-guide-anatomy-frame">
                            ${muscleVisualMarkup(item.muscle)}
                        </div>
                        <strong>${escapeHtml(item.muscle)}</strong>
                        <span class="${item.role}">${item.role}</span>
                    </article>
                `).join("")}
            </div>
        </section>`;
}

function refreshRuntimeAnatomy(root = document) {
    root.querySelectorAll?.(".form-guide-runtime-screen [data-runtime-muscle]").forEach(node => {
        const muscle = node.dataset.runtimeMuscle || node.querySelector("strong")?.textContent?.trim();
        const config = visualConfig(muscle);
        const svg = config ? renderFormGuideMuscleSvg(config) : "";
        if (!svg) return;

        const frame = node.matches(".exercise-muscle-card")
            ? node.querySelector(".exercise-muscle-image-frame")
            : node;
        if (!frame) return;

        if (node.matches(".exercise-guide-anatomy-tile")) {
            const existing = node.querySelector(".form-guide-muscle-svg, .exercise-muscle-visual-fallback");
            if (existing) existing.outerHTML = svg;
            else node.insertAdjacentHTML("afterbegin", svg);
        }
        else {
            frame.innerHTML = svg;
            frame.classList.add("form-guide-anatomy-frame");
        }

        frame.dataset.formGuideAnatomy = muscle;
        frame.dataset.formGuideDirectRecoverySvg = muscle;
        frame.dataset.anatomySex = config?.anatomy?.sex || "male";
    });
}

function openRuntimeGuide(sourceScreen, exercise, guide, options = {}) {
    if (!sourceScreen || !exercise || !guide) return false;
    if (document.querySelector(".exercise-guide-screen")) return false;

    const host = sourceScreen.closest(".workout-page") || sourceScreen.parentElement;
    if (!host) return false;

    ensureStyles();
    const previousScrollY = window.scrollY;
    const screen = document.createElement("section");
    screen.className = "exercise-guide-screen form-guide-runtime-screen";
    screen.dataset.exerciseId = exercise.id;
    screen.innerHTML = `
        <button class="plan-detail-back exercise-guide-back" type="button">${escapeHtml(options.backLabel || "← Workout")}</button>
        <header class="exercise-guide-header">
            <span class="eyebrow">EXERCISE GUIDE</span>
            <h2>${escapeHtml(exercise.name)}</h2>
            <p>Use these instructions as general technique guidance. Choose a comfortable range of motion and stop if an exercise causes pain.</p>
        </header>
        ${renderAnatomyOverview(guide)}
        ${renderMuscleCards(guide)}
        <section class="exercise-guide-section">
            <h3>Setup</h3>
            <ol>${(guide.setup || []).map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
        </section>
        <section class="exercise-guide-section">
            <h3>How to Perform It</h3>
            <ol>${(guide.execution || []).map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
        </section>
        <section class="exercise-guide-section exercise-cue-section">
            <h3>Key Cues</h3>
            <div class="exercise-cue-list">${(guide.cues || []).map(cue => `<span>${escapeHtml(cue)}</span>`).join("")}</div>
        </section>
        <section class="exercise-guide-section">
            <h3>Common Mistakes</h3>
            <ul>${(guide.mistakes || []).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>`;

    sourceScreen.hidden = true;
    sourceScreen.insertAdjacentElement("beforebegin", screen);
    refreshRuntimeAnatomy(screen);

    screen.querySelector(".exercise-guide-back")?.addEventListener("click", () => {
        screen.remove();
        sourceScreen.hidden = false;
        requestAnimationFrame(() => window.scrollTo({ top: previousScrollY, behavior: "auto" }));
    });

    if (options.focusGuideStart) {
        requestAnimationFrame(() => screen.scrollIntoView({ behavior: "auto", block: "start" }));
    }
    return true;
}

function ensureGuideForOpenEvent(event) {
    const exerciseId = event?.detail?.exerciseId;
    if (!exerciseId) return;

    if (document.querySelector(".exercise-guide-screen")) return;

    const exercise = getExerciseById(exerciseId);
    const guide = guideForExercise(exercise);
    const sourceScreen = document.querySelector(event.detail?.sourceSelector || "#plan-builder");
    if (!exercise || !guide || !sourceScreen) return;

    openRuntimeGuide(sourceScreen, exercise, guide, {
        backLabel: event.detail?.backLabel || "← Workout",
        focusGuideStart: Boolean(event.detail?.focusGuideStart)
    });
}

function patchPlanDetailRows(root = document) {
    root.querySelectorAll?.(`.plan-detail-exercise-row:not([${RUNTIME_ATTR}])`).forEach(row => {
        row.setAttribute(RUNTIME_ATTR, "1");
        if (row.classList.contains("has-exercise-guide")) return;

        const nameNode = row.querySelector(".plan-detail-exercise-name");
        const exercise = exerciseFromName(nameNode?.textContent);
        const guide = guideForExercise(exercise);
        if (!exercise || !guide || !nameNode) return;

        row.classList.add("has-exercise-guide", "has-generated-exercise-guide");
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", "0");
        row.setAttribute("aria-label", `Open ${exercise.name} exercise guide`);
        if (!nameNode.querySelector(".exercise-guide-label")) {
            nameNode.insertAdjacentHTML("beforeend", '<span class="exercise-guide-label">Form guide</span>');
        }

        const open = event => {
            event?.preventDefault?.();
            document.dispatchEvent(new CustomEvent("levelup:open-exercise-guide", {
                detail: {
                    exerciseId: exercise.id,
                    sourceSelector: "#workout-plan-detail-screen",
                    backLabel: "← Workout Plan",
                    focusGuideStart: true
                }
            }));
        };
        row.addEventListener("click", open);
        row.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") return;
            open(event);
        });
    });
}

document.addEventListener("levelup:open-exercise-guide", ensureGuideForOpenEvent);
window.addEventListener("levelup:profile-updated", () => requestAnimationFrame(() => refreshRuntimeAnatomy(document)));
window.addEventListener("levelup:muscle-map-colors-changed", () => requestAnimationFrame(() => refreshRuntimeAnatomy(document)));

const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (!(node instanceof Element)) continue;
            if (node.matches?.(".plan-detail-exercise-row, #workout-plan-detail-screen")) patchPlanDetailRows(node.parentElement || document);
            else if (node.querySelector?.(".plan-detail-exercise-row")) patchPlanDetailRows(node);
        }
    }
});
observer.observe(document.documentElement, { childList: true, subtree: true });
ensureStyles();
patchPlanDetailRows();
