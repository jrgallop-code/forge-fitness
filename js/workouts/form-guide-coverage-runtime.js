import "./exercise-library-expansion.js?v=exercise-library-expansion-1";
import { getAllExercises, getExerciseById } from "./exercise-library.js?v=exercise-library-catalogue-2";
import { createGeneratedExerciseGuide } from "./exercise-guide-generator.js?v=full-library-guides-2";
import {
    getFormGuideMuscleVisual,
    renderFormGuideMuscleSvg
} from "./form-guide-anatomy.js?v=female-back-regions-1";

const RUNTIME_ATTR = "data-form-guide-runtime-ready";

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

function guideForExercise(exercise) {
    if (!exercise) return null;
    return createGeneratedExerciseGuide(exercise);
}

function exerciseFromName(name) {
    const normalized = normalizeName(name);
    if (!normalized) return null;
    return getAllExercises().find(exercise => normalizeName(exercise?.name) === normalized) || null;
}

function muscleVisualMarkup(muscle) {
    const config = getFormGuideMuscleVisual(muscle);
    const svg = config ? renderFormGuideMuscleSvg(config) : "";
    return svg || `<span class="exercise-muscle-visual-fallback" aria-hidden="true"></span>`;
}

function renderMuscleCards(guide) {
    const muscles = [
        ...(guide?.primary || []).map(muscle => ({ muscle, role: "primary" })),
        ...(guide?.secondary || []).map(muscle => ({ muscle, role: "secondary" }))
    ];
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
    root.querySelectorAll?.(".form-guide-runtime-screen .exercise-muscle-card[data-runtime-muscle]").forEach(card => {
        const muscle = card.dataset.runtimeMuscle || card.querySelector("strong")?.textContent?.trim();
        const frame = card.querySelector(".exercise-muscle-image-frame");
        const config = getFormGuideMuscleVisual(muscle);
        const svg = config ? renderFormGuideMuscleSvg(config) : "";
        if (!frame || !svg) return;
        frame.innerHTML = svg;
        frame.classList.add("form-guide-anatomy-frame");
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
patchPlanDetailRows();
