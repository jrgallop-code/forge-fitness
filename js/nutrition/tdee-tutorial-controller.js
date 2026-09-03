import {
    completeTutorial,
    dismissTutorial,
    getTutorial,
    restartTutorial,
    setTutorialStep
} from "../core/tutorials.js?v=tdee-tutorial-smoothed-1";

const TUTORIAL_ID = "expenditure";
const STYLE_ID = "level-up-tdee-tutorial-controller-styles";
const ICONS = [
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Zm2 11.5-.9.5V15h-2.2v-1l-.9-.5A5 5 0 1 1 14 13.5ZM9 19h6v2H9v-2Z"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 2a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm-1 3h2v3h3v2h-5V8Z"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5h2v11.2l3.7-4 3 2.2L18.5 8H15V6h7v7h-2V9.6l-7 7.8-3.1-2.3L6.3 19H4Z"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4V4Zm2 2v12h12V6H6Zm2 2h3v3H8V8Zm5 0h3v2h-3V8Zm0 4h3v2h-3v-2Zm-5 1h3v3H8v-3Z"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v4H5V5Zm2 2h10V7H7Zm-2 5h14v7H5v-7Zm2 2v3h10v-3H7Zm2 .5h2v2H9v-2Z"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-1 3h2v4h4v2h-6V7Z"/></svg>'
];

let queued = false;
let eventsBound = false;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #calorie-progress .tdee-tutorial-launch-shell,
        #calorie-progress .tdee-tutorial-card-owned,
        #calorie-progress .tdee-tutorial-card-owned .expenditure-tutorial-actions {
            position: relative;
            z-index: 24;
            pointer-events: auto !important;
        }
        #calorie-progress .tdee-tutorial-launch-shell {
            display: grid;
            margin: -4px 0 0;
        }
        #calorie-progress .tdee-tutorial-launch {
            width: 100%;
            min-height: 42px;
            pointer-events: auto !important;
            touch-action: manipulation;
        }
        #calorie-progress .tdee-tutorial-card-owned button {
            pointer-events: auto !important;
            touch-action: manipulation;
        }
        #calorie-progress .tdee-tutorial-card-owned {
            margin-top: 0;
        }
    `;
    document.head.appendChild(style);
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function patchTdeeCopy(panel) {
    const descriptions = panel.querySelectorAll(".calculated-maintenance-card .expenditure-summary-copy p");
    setText(
        descriptions[0],
        "Your latest daily energy expenditure estimate, based on logged intake and the same smoothed Weekly Trend shown in Weight Progress."
    );

    const breakdownNote = panel.querySelector(".calculated-maintenance-card .calculated-maintenance-breakdown > small");
    setText(
        breakdownNote,
        "Food intake uses logged days through yesterday. The weight-change input uses up to 20 days of smoothed Trend Weight. Level Up keeps the existing 21-day TDEE evidence window, confidence gates, seven-day review cadence, and 50-calorie building / 100-calorie high-confidence stabilization limits."
    );
}

function removeLegacyAutoTutorial(panel) {
    panel.querySelectorAll("[data-expenditure-tutorial]").forEach(card => {
        if (card.dataset.tdeeTutorialOwned !== "1") card.remove();
    });
}

function ensureLauncher(panel) {
    const maintenanceCard = panel.querySelector(".calculated-maintenance-card");
    if (!maintenanceCard) return;

    let shell = panel.querySelector("[data-tdee-tutorial-launch-shell]");
    if (!shell) {
        shell = document.createElement("div");
        shell.className = "tdee-tutorial-launch-shell";
        shell.dataset.tdeeTutorialLaunchShell = "1";
        shell.innerHTML = '<button type="button" class="secondary-btn tdee-tutorial-launch" data-tdee-tutorial-launch>How TDEE works</button>';
        maintenanceCard.insertAdjacentElement("afterend", shell);
    } else if (shell.previousElementSibling !== maintenanceCard) {
        maintenanceCard.insertAdjacentElement("afterend", shell);
    }
}

function stepMarkup(tutorial, stepIndex) {
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
            <button type="button" class="expenditure-tutorial-dismiss" data-tdee-tutorial-close>Close</button>
            <span>
                <button type="button" class="secondary-btn" data-tdee-tutorial-previous ${stepIndex === 0 ? "disabled" : ""}>Previous</button>
                <button type="button" class="primary-btn" data-tdee-tutorial-next>${last ? "Finish" : "Next"}</button>
            </span>
        </div>`;
}

function renderStep(card, tutorial, stepIndex) {
    const next = Math.max(0, Math.min(tutorial.steps.length - 1, Number(stepIndex) || 0));
    card.dataset.step = String(next);
    setTutorialStep(TUTORIAL_ID, next);
    card.innerHTML = stepMarkup(tutorial, next);
}

function openTutorial(panel) {
    const tutorial = getTutorial(TUTORIAL_ID);
    const shell = panel.querySelector("[data-tdee-tutorial-launch-shell]");
    if (!tutorial || !shell) return;

    restartTutorial(TUTORIAL_ID);
    let card = panel.querySelector("[data-tdee-tutorial-owned='1']");
    if (!card) {
        card = document.createElement("aside");
        card.className = "expenditure-tutorial-card tdee-tutorial-card-owned";
        card.dataset.expenditureTutorial = "1";
        card.dataset.tdeeTutorialOwned = "1";
        card.setAttribute("aria-label", "TDEE tutorial");
        card.setAttribute("aria-live", "polite");
        shell.insertAdjacentElement("afterend", card);
    }
    renderStep(card, tutorial, 0);
    card.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
}

function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;
    document.addEventListener("click", event => {
        const launcher = event.target.closest?.("[data-tdee-tutorial-launch]");
        if (launcher) {
            event.preventDefault();
            const panel = launcher.closest("[data-progress-calorie-stats]");
            if (panel) openTutorial(panel);
            return;
        }

        const card = event.target.closest?.("[data-tdee-tutorial-owned='1']");
        if (!card) return;
        const tutorial = getTutorial(TUTORIAL_ID);
        if (!tutorial) return;
        const current = Math.max(0, Number(card.dataset.step) || 0);

        if (event.target.closest("[data-tdee-tutorial-close]")) {
            event.preventDefault();
            dismissTutorial(TUTORIAL_ID, current);
            card.remove();
            return;
        }
        if (event.target.closest("[data-tdee-tutorial-previous]")) {
            event.preventDefault();
            renderStep(card, tutorial, current - 1);
            return;
        }
        if (!event.target.closest("[data-tdee-tutorial-next]")) return;
        event.preventDefault();
        if (current >= tutorial.steps.length - 1) {
            completeTutorial(TUTORIAL_ID);
            card.remove();
            return;
        }
        renderStep(card, tutorial, current + 1);
    }, true);
}

function refresh() {
    queued = false;
    ensureStyles();
    bindEvents();
    document.querySelectorAll("[data-progress-calorie-stats]").forEach(panel => {
        removeLegacyAutoTutorial(panel);
        patchTdeeCopy(panel);
        ensureLauncher(panel);
    });
}

function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(refresh);
}

const content = document.getElementById("content");
if (content) new MutationObserver(schedule).observe(content, { childList: true, subtree: true });
window.addEventListener("pageshow", schedule);
window.addEventListener("levelup:nutrition-updated", schedule);
window.addEventListener("levelup:food-log-updated", schedule);
window.addEventListener("levelup:weight-updated", schedule);
document.addEventListener("click", event => {
    if (event.target.closest?.("#nutrition-progress-tab, [data-page='progress']")) window.setTimeout(schedule, 0);
}, true);

schedule();
