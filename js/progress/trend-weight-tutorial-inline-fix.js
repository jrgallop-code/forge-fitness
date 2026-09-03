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
    // 1. Scale weight is noisy: bathroom scale + jagged daily weigh-in path.
    '<svg viewBox="0 0 24 24" aria-hidden="true" style="fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><rect x="5" y="13" width="14" height="8" rx="2"/><path d="M9 17.5a3 3 0 0 1 6 0"/><path d="M3 9.5 6 7l3 1.8 3-4.3 3 2.7 3-3.2 3 1.6"/><circle cx="3" cy="9.5" r=".8" fill="currentColor" stroke="none"/><circle cx="9" cy="8.8" r=".8" fill="currentColor" stroke="none"/><circle cx="15" cy="7.2" r=".8" fill="currentColor" stroke="none"/><circle cx="21" cy="5.6" r=".8" fill="currentColor" stroke="none"/></svg>',
    // 2. Missing days: real weigh-ins with interpolated days between them.
    '<svg viewBox="0 0 24 24" aria-hidden="true" style="fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M4 5h16v15H4z"/><path d="M4 9h16M8 3v4M16 3v4"/><circle cx="7" cy="15" r="1.35" fill="currentColor"/><circle cx="17" cy="13" r="1.35" fill="currentColor"/><path d="M8.4 14.7 15.6 13.3" stroke-dasharray="1.5 2"/><circle cx="10.5" cy="14.3" r=".65" opacity=".45"/><circle cx="13.5" cy="13.7" r=".65" opacity=".45"/></svg>',
    // 3. Smoothing: noisy raw series, smooth trend, newest point emphasized.
    '<svg viewBox="0 0 24 24" aria-hidden="true" style="fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M3 15 6 8l3 5 3-7 3 6 3-4 3 3" opacity=".42"/><path d="M3 16c3-2 5-3 8-3.5 4-.7 6-1 10-4.5" stroke-width="2.1"/><circle cx="21" cy="8" r="2"/><circle cx="21" cy="8" r=".7" fill="currentColor" stroke="none"/></svg>',
    // 4. Weekly Trend: slope/regression direction translated into a weekly rate.
    '<svg viewBox="0 0 24 24" aria-hidden="true" style="fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M4 19V5M4 19h16"/><path d="m7 16 4-4 3 1.5 5-7" stroke-width="2"/><path d="m16 6.5 3-.5-.2 3"/><path d="M7 21h10"/><path d="m7 21 1-1m-1 1 1 1m9-1-1-1m1 1-1 1"/></svg>',
    // 5. Confidence: more weigh-ins build a stronger signal.
    '<svg viewBox="0 0 24 24" aria-hidden="true" style="fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M5 18v-3M10 18v-6M15 18V9M20 18V5" stroke-width="2.2"/><circle cx="4" cy="21" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="21" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="21" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="21" r="1" fill="currentColor" stroke="none"/><circle cx="20" cy="21" r="1" fill="currentColor" stroke="none"/><path d="M4 7c2-2 4-3 6-3M4 10c3-3 7-4 10-4" opacity=".45"/></svg>',
    // 6. TDEE: intake + Trend Weight feed the expenditure calculation.
    '<svg viewBox="0 0 24 24" aria-hidden="true" style="fill:none;stroke:currentColor;stroke-width:1.55;stroke-linecap:round;stroke-linejoin:round"><path d="M3 4v7M5 4v7M3 8h2M4 11v4"/><path d="M7 12h3"/><path d="M9 10l2 2-2 2"/><path d="M12 15v-7h5"/><path d="m13 13 2-2 2 1 2-4"/><path d="M18 12h2"/><path d="m19 10 2 2-2 2"/><rect x="16" y="15" width="6" height="6" rx="1"/><path d="M18 17h2M18 19h.1M20 19h.1"/></svg>'
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
