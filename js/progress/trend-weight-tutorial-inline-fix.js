import {
    completeTutorial,
    dismissTutorial,
    getTutorial,
    getTutorialState,
    restartTutorial,
    setTutorialStep
} from "../core/tutorials.js?v=trend-weight-inline-fix-2";

const TUTORIAL_ID = "trend-weight";
const CARD_SELECTOR = "[data-trend-weight-tutorial-inline-v2]";
const ICONS = [
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16M6 15l3-4 3 2 5-7 2 2"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2"/><circle cx="18" cy="8" r="2"/><path d="M8 11.4 16 8.6" stroke-dasharray="2 2"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 16c3-6 5 1 8-4s5 2 10-5M3 19c4-3 7-2 10-5s5-3 8-5"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18V6M4 18h16M7 15l4-5 3 2 5-6"/><path d="m16 6 3 0 0 3"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17V9M10 17V6M15 17v-4M20 17V4"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M5 8h14M7 8c0 3-1.5 5-4 6 1 2 3 3 5 3s4-1 5-3c-2.5-1-4-3-4-6M15 8c0 3-1.5 5-4 6 1 2 3 3 5 3s4-1 5-3c-2.5-1-4-3-4-6"/></svg>'
];

function markup(tutorial, stepIndex) {
    const step = tutorial.steps[stepIndex];
    const last = stepIndex === tutorial.steps.length - 1;
    return `<div class="expenditure-tutorial-progress" aria-label="Step ${stepIndex + 1} of ${tutorial.steps.length}">
        <span>${stepIndex + 1} of ${tutorial.steps.length}</span>
        <div>${tutorial.steps.map((_, index) => `<i class="${index <= stepIndex ? "is-active" : ""}"></i>`).join("")}</div>
    </div>
    <div class="expenditure-tutorial-copy">
        <span class="expenditure-tutorial-icon">${ICONS[stepIndex] || ICONS[0]}</span>
        <div><small>${step.eyebrow}</small><h3>${step.title}</h3></div>
        <p>${step.body}</p>
    </div>
    <div class="expenditure-tutorial-actions">
        <button type="button" class="expenditure-tutorial-dismiss" data-trend-tutorial-dismiss>Close</button>
        <span>
            <button type="button" class="secondary-btn" data-trend-tutorial-previous ${stepIndex === 0 ? "disabled" : ""}>Previous</button>
            <button type="button" class="primary-btn" data-trend-tutorial-next>${last ? "Finish" : "Next"}</button>
        </span>
    </div>`;
}

function render(card, tutorial, stepIndex) {
    const next = Math.max(0, Math.min(tutorial.steps.length - 1, Number(stepIndex) || 0));
    setTutorialStep(TUTORIAL_ID, next);
    card.innerHTML = markup(tutorial, next);
}

function openTutorial(launcher) {
    const tutorial = getTutorial(TUTORIAL_ID);
    const section = launcher.closest("#weight-progress");
    if (!tutorial || !section) return;

    restartTutorial(TUTORIAL_ID);
    section.querySelector(CARD_SELECTOR)?.remove();

    const card = document.createElement("aside");
    card.className = "expenditure-tutorial-card weight-trend-tutorial-card";
    card.dataset.trendWeightTutorialInlineV2 = "1";
    card.setAttribute("aria-label", "Trend Weight tutorial");
    card.setAttribute("aria-live", "polite");
    launcher.insertAdjacentElement("afterend", card);
    render(card, tutorial, 0);
    card.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
}

document.addEventListener("click", event => {
    const launcher = event.target.closest?.("#weight-progress [data-trend-tutorial-launch]");
    if (launcher) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openTutorial(launcher);
        return;
    }

    const card = event.target.closest?.(`#weight-progress ${CARD_SELECTOR}`);
    if (!card) return;
    const tutorial = getTutorial(TUTORIAL_ID);
    if (!tutorial) return;
    const current = getTutorialState(TUTORIAL_ID).step;

    if (event.target.closest("[data-trend-tutorial-dismiss]")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        dismissTutorial(TUTORIAL_ID, current);
        card.remove();
        return;
    }

    if (event.target.closest("[data-trend-tutorial-previous]")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        render(card, tutorial, Math.max(0, current - 1));
        return;
    }

    if (!event.target.closest("[data-trend-tutorial-next]")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (current >= tutorial.steps.length - 1) {
        completeTutorial(TUTORIAL_ID);
        card.remove();
        return;
    }
    render(card, tutorial, current + 1);
}, true);
