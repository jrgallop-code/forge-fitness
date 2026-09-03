import {
    completeTutorial,
    dismissTutorial,
    getTutorial,
    restartTutorial,
    setTutorialStep
} from "./tutorials.js?v=contextual-modal-1";

const STYLE_ID = "level-up-contextual-tutorial-modal-styles";
const MODAL_ID = "level-up-contextual-tutorial-modal";
const LAUNCHERS = {
    "trend-weight": "[data-trend-tutorial-launch]",
    expenditure: "[data-tdee-tutorial-launch]"
};
const ICONS = {
    "trend-weight": ["⚖", "↔", "〰", "↗", "▥", "⚡"],
    expenditure: ["⚡", "◷", "↗", "▦", "▤", "✓"]
};
let activeId = null;
let activeStep = 0;
let lastLauncherActivation = 0;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #weight-progress [data-trend-tutorial-launch],
        #calorie-progress [data-tdee-tutorial-launch],
        #calorie-progress [data-tdee-tutorial-launch-shell] {
            position: relative !important;
            z-index: 2147483000 !important;
            pointer-events: auto !important;
            touch-action: manipulation !important;
            isolation: isolate;
        }
        #${MODAL_ID} {
            position: fixed;
            inset: 0;
            z-index: 2147483646;
            display: grid;
            align-items: end;
            padding: 18px;
            background: rgba(0,0,0,.58);
            backdrop-filter: blur(7px);
            -webkit-backdrop-filter: blur(7px);
        }
        #${MODAL_ID}[hidden] { display: none !important; }
        #${MODAL_ID} .level-up-tutorial-sheet {
            width: min(560px, 100%);
            max-height: min(82vh, 720px);
            margin: 0 auto max(env(safe-area-inset-bottom), 0px);
            overflow: auto;
            border: 1px solid color-mix(in srgb, var(--text-primary, #fff) 14%, transparent);
            border-radius: 24px;
            padding: 18px;
            background: var(--surface-elevated, var(--card-bg, #1c1c1e));
            color: var(--text-primary, #fff);
            box-shadow: 0 24px 70px rgba(0,0,0,.48);
        }
        #${MODAL_ID} .level-up-tutorial-topbar,
        #${MODAL_ID} .level-up-tutorial-actions,
        #${MODAL_ID} .level-up-tutorial-progress {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }
        #${MODAL_ID} .level-up-tutorial-kicker {
            margin: 0 0 4px;
            color: var(--accent, #45cb75);
            font-size: 10px;
            font-weight: 900;
            letter-spacing: .11em;
        }
        #${MODAL_ID} h3 { margin: 0; font-size: 22px; line-height: 1.15; }
        #${MODAL_ID} .level-up-tutorial-close {
            width: 38px;
            min-width: 38px;
            height: 38px;
            border: 0;
            border-radius: 50%;
            background: color-mix(in srgb, var(--text-primary, #fff) 9%, transparent);
            color: inherit;
            font-size: 20px;
            line-height: 1;
            cursor: pointer;
            pointer-events: auto !important;
            touch-action: manipulation;
        }
        #${MODAL_ID} .level-up-tutorial-progress { margin: 18px 0 16px; }
        #${MODAL_ID} .level-up-tutorial-progress > span {
            color: var(--text-secondary, #a1a1aa);
            font-size: 11px;
            font-weight: 800;
            white-space: nowrap;
        }
        #${MODAL_ID} .level-up-tutorial-dots { display: flex; flex: 1; gap: 5px; }
        #${MODAL_ID} .level-up-tutorial-dots i {
            height: 4px;
            flex: 1;
            border-radius: 99px;
            background: color-mix(in srgb, var(--text-primary, #fff) 12%, transparent);
        }
        #${MODAL_ID} .level-up-tutorial-dots i.is-active { background: var(--accent, #45cb75); }
        #${MODAL_ID} .level-up-tutorial-body {
            display: grid;
            grid-template-columns: 52px 1fr;
            gap: 14px;
            align-items: start;
            min-height: 165px;
            padding: 14px 0 18px;
        }
        #${MODAL_ID} .level-up-tutorial-icon {
            display: grid;
            place-items: center;
            width: 52px;
            height: 52px;
            border-radius: 16px;
            background: color-mix(in srgb, var(--accent, #45cb75) 14%, transparent);
            color: var(--accent, #45cb75);
            font-size: 24px;
            font-weight: 900;
        }
        #${MODAL_ID} .level-up-tutorial-eyebrow {
            display: block;
            margin-bottom: 5px;
            color: var(--text-secondary, #a1a1aa);
            font-size: 10px;
            font-weight: 900;
            letter-spacing: .09em;
        }
        #${MODAL_ID} .level-up-tutorial-body h4 { margin: 0 0 8px; font-size: 18px; }
        #${MODAL_ID} .level-up-tutorial-body p {
            margin: 0;
            color: var(--text-secondary, #b3b3bb);
            font-size: 13px;
            line-height: 1.55;
        }
        #${MODAL_ID} .level-up-tutorial-actions { padding-top: 12px; border-top: 1px solid color-mix(in srgb, var(--text-primary, #fff) 10%, transparent); }
        #${MODAL_ID} .level-up-tutorial-actions span { display: flex; gap: 8px; margin-left: auto; }
        #${MODAL_ID} button { pointer-events: auto !important; touch-action: manipulation !important; }
        @media (min-width: 680px) {
            #${MODAL_ID} { align-items: center; }
        }
    `;
    document.head.appendChild(style);
}

function ensureModal() {
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Level Up tutorial");
    modal.innerHTML = '<section class="level-up-tutorial-sheet" data-tutorial-sheet></section>';
    document.body.appendChild(modal);
    return modal;
}

function render() {
    const tutorial = getTutorial(activeId);
    const modal = ensureModal();
    const sheet = modal.querySelector("[data-tutorial-sheet]");
    if (!tutorial || !sheet) return;
    activeStep = Math.max(0, Math.min(tutorial.steps.length - 1, activeStep));
    setTutorialStep(activeId, activeStep);
    const step = tutorial.steps[activeStep];
    const last = activeStep === tutorial.steps.length - 1;
    const icons = ICONS[activeId] || ICONS["trend-weight"];
    sheet.innerHTML = `
        <div class="level-up-tutorial-topbar">
            <div><p class="level-up-tutorial-kicker">LEVEL UP GUIDE</p><h3>${escapeHtml(tutorial.title)}</h3></div>
            <button type="button" class="level-up-tutorial-close" data-context-tutorial-close aria-label="Close tutorial">×</button>
        </div>
        <div class="level-up-tutorial-progress">
            <span>${activeStep + 1} of ${tutorial.steps.length}</span>
            <div class="level-up-tutorial-dots">${tutorial.steps.map((_, index) => `<i class="${index <= activeStep ? "is-active" : ""}"></i>`).join("")}</div>
        </div>
        <div class="level-up-tutorial-body">
            <div class="level-up-tutorial-icon" aria-hidden="true">${icons[activeStep] || "•"}</div>
            <div><span class="level-up-tutorial-eyebrow">${escapeHtml(step.eyebrow)}</span><h4>${escapeHtml(step.title)}</h4><p>${escapeHtml(step.body)}</p></div>
        </div>
        <div class="level-up-tutorial-actions">
            <button type="button" class="secondary-btn" data-context-tutorial-close>Close</button>
            <span>
                <button type="button" class="secondary-btn" data-context-tutorial-prev ${activeStep === 0 ? "disabled" : ""}>Previous</button>
                <button type="button" class="primary-btn" data-context-tutorial-next>${last ? "Finish" : "Next"}</button>
            </span>
        </div>`;
    modal.hidden = false;
    modal.setAttribute("aria-label", `${tutorial.title} tutorial`);
    window.requestAnimationFrame(() => sheet.querySelector("[data-context-tutorial-next]")?.focus({ preventScroll: true }));
}

function openTutorial(id) {
    if (!getTutorial(id)) return;
    document.querySelectorAll("[data-trend-weight-tutorial], [data-tdee-tutorial-owned='1']").forEach(node => node.remove());
    activeId = id;
    activeStep = 0;
    restartTutorial(id);
    render();
}

function closeTutorial({ completed = false } = {}) {
    if (!activeId) return true;
    if (completed) completeTutorial(activeId);
    else dismissTutorial(activeId, activeStep);
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.hidden = true;
    activeId = null;
    activeStep = 0;
    return true;
}

function launcherId(target) {
    if (target.closest?.(LAUNCHERS["trend-weight"])) return "trend-weight";
    if (target.closest?.(LAUNCHERS.expenditure)) return "expenditure";
    return null;
}

function activateLauncher(event) {
    const id = launcherId(event.target);
    if (!id) return false;
    const now = Date.now();
    if (event.type === "click" && now - lastLauncherActivation < 600) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return true;
    }
    lastLauncherActivation = now;
    event.preventDefault();
    event.stopImmediatePropagation();
    openTutorial(id);
    return true;
}

function handleModalAction(event) {
    const modal = event.target.closest?.(`#${MODAL_ID}`);
    if (!modal || modal.hidden || !activeId) return false;
    const close = event.target.closest?.("[data-context-tutorial-close]");
    const previous = event.target.closest?.("[data-context-tutorial-prev]");
    const next = event.target.closest?.("[data-context-tutorial-next]");
    if (!close && !previous && !next) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (close) return closeTutorial();
    if (previous) {
        activeStep = Math.max(0, activeStep - 1);
        render();
        return true;
    }
    const tutorial = getTutorial(activeId);
    if (next && tutorial && activeStep >= tutorial.steps.length - 1) return closeTutorial({ completed: true });
    activeStep += 1;
    render();
    return true;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
}

ensureStyles();
ensureModal();
document.addEventListener("pointerup", event => {
    if (handleModalAction(event)) return;
    activateLauncher(event);
}, true);
document.addEventListener("click", event => {
    if (handleModalAction(event)) return;
    activateLauncher(event);
}, true);
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && activeId) closeTutorial();
}, true);
