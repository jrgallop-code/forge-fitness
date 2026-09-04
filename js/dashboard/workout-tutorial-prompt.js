import { navigate } from "../core/router.js?v=deload-workout-preview-1";

const STYLE_ID = "level-up-workout-tutorial-prompt-styles";
const PROMPT_ID = "workout-tutorial-dashboard-prompt";
const PROMPT_STATE_KEY = "level_up_workout_tutorial_prompt_v1";
const HANDOFF_CLASS = "level-up-tutorial-handoff";
const COMPLETION_KEYS = [
    "level_up_interactive_workout_tutorial_v5",
    "level_up_interactive_workout_tutorial_v4",
    "level_up_interactive_workout_tutorial_v3"
];

let queued = false;
let handoffTimer = 0;

install();

function install() {
    ensureStyles();
    schedule();

    const content = document.getElementById("content");
    if (content) {
        new MutationObserver(schedule).observe(content, { childList: true, subtree: true });
    }

    window.addEventListener("pageshow", schedule);
    document.addEventListener("click", handleClick, true);
}

function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
        queued = false;
        syncPrompt();
    });
}

function syncPrompt() {
    const welcome = document.querySelector(".dashboard-welcome");
    const dashboard = document.querySelector(".dashboard");

    if (!welcome || !dashboard || shouldHidePrompt()) {
        removePrompt();
        return;
    }

    if (document.getElementById(PROMPT_ID)) return;

    const card = document.createElement("section");
    card.id = PROMPT_ID;
    card.className = "workout-tutorial-dashboard-prompt section-card";
    card.setAttribute("aria-label", "Interactive workout tutorial");
    card.innerHTML = `
        <div class="workout-tutorial-prompt-icon" aria-hidden="true">☝️</div>
        <div class="workout-tutorial-prompt-copy">
            <span class="eyebrow">QUICK START</span>
            <h3>Learn the workout logger</h3>
            <p>Practice a real Level Up workout without saving fake data. We’ll guide you through sets, warm-ups, Form Guide, plate calculator, swaps and more.</p>
            <small>11 guided steps · about 4 min · available anytime in More → Tutorials</small>
        </div>
        <div class="workout-tutorial-prompt-actions">
            <button type="button" class="primary-btn" data-workout-tutorial-prompt-start>Start tutorial</button>
            <button type="button" class="workout-tutorial-prompt-dismiss" data-workout-tutorial-prompt-dismiss>Dismiss</button>
        </div>`;

    welcome.insertAdjacentElement("afterend", card);
}

function handleClick(event) {
    const start = event.target.closest?.("[data-workout-tutorial-prompt-start]");
    if (start) {
        event.preventDefault();
        event.stopPropagation();
        startTutorialFromPrompt(start);
        return;
    }

    const dismiss = event.target.closest?.("[data-workout-tutorial-prompt-dismiss]");
    if (dismiss) {
        event.preventDefault();
        event.stopPropagation();
        dismissPrompt();
    }
}

function beginTutorialHandoff() {
    document.documentElement.classList.add(HANDOFF_CLASS);
    if (handoffTimer) window.clearTimeout(handoffTimer);
    // Fail-safe: never leave the app hidden if a route fails to finish.
    handoffTimer = window.setTimeout(endTutorialHandoff, 2200);
}

function endTutorialHandoff() {
    if (handoffTimer) window.clearTimeout(handoffTimer);
    handoffTimer = 0;
    document.documentElement.classList.remove(HANDOFF_CLASS);
}

function startTutorialFromPrompt(button) {
    button.disabled = true;
    button.textContent = "Opening…";
    beginTutorialHandoff();

    // Reuse the exact tutorial launch path that is already proven on iOS. The
    // entire content area stays hidden during the route handoff so none of the
    // Tutorials library target/bullseye icons can paint for a single frame.
    navigate("more");
    waitFor('[data-more-page="learn"]', learnButton => {
        learnButton.click();
        waitFor("#interactive-workout-tutorial-card", tutorialButton => {
            tutorialButton.click();
            window.setTimeout(endTutorialHandoff, 520);
        });
    });
}

function waitFor(selector, callback, attempts = 0) {
    const node = document.querySelector(selector);
    if (node) {
        callback(node);
        return;
    }
    if (attempts >= 80) {
        endTutorialHandoff();
        navigate("home");
        window.setTimeout(() => {
            const retry = document.querySelector("[data-workout-tutorial-prompt-start]");
            if (retry) {
                retry.disabled = false;
                retry.textContent = "Try again";
            }
        }, 120);
        return;
    }
    window.setTimeout(() => waitFor(selector, callback, attempts + 1), 50);
}

function dismissPrompt() {
    try {
        localStorage.setItem(PROMPT_STATE_KEY, JSON.stringify({
            dismissed: true,
            dismissedAt: new Date().toISOString()
        }));
    } catch {}
    removePrompt();
}

function shouldHidePrompt() {
    if (isTutorialCompleted()) return true;
    try {
        return JSON.parse(localStorage.getItem(PROMPT_STATE_KEY) || "null")?.dismissed === true;
    } catch {
        return false;
    }
}

function isTutorialCompleted() {
    return COMPLETION_KEYS.some(key => {
        try {
            return JSON.parse(localStorage.getItem(key) || "null")?.completed === true;
        } catch {
            return false;
        }
    });
}

function removePrompt() {
    document.getElementById(PROMPT_ID)?.remove();
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        html.${HANDOFF_CLASS} #content{
            opacity:0!important;
            visibility:hidden!important;
            pointer-events:none!important;
        }
        html.${HANDOFF_CLASS} #content *,
        html.${HANDOFF_CLASS} #content *::before,
        html.${HANDOFF_CLASS} #content *::after{
            visibility:hidden!important;
        }
        .workout-tutorial-dashboard-prompt{
            display:grid;
            grid-template-columns:auto minmax(0,1fr) auto;
            align-items:center;
            gap:14px;
            margin:10px 0 16px;
            padding:16px;
            border:1px solid color-mix(in srgb,var(--accent) 30%,var(--card-border,#34373f));
            background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 10%,var(--card)),var(--card));
            box-shadow:var(--shadow);
        }
        .workout-tutorial-prompt-icon{
            display:grid;
            place-items:center;
            width:48px;
            height:48px;
            border-radius:15px;
            background:color-mix(in srgb,var(--accent) 16%,transparent);
            border:1px solid color-mix(in srgb,var(--accent) 38%,transparent);
            font-size:25px;
        }
        .workout-tutorial-prompt-copy{min-width:0}
        .workout-tutorial-prompt-copy .eyebrow{display:block;margin-bottom:3px;color:var(--accent-text,var(--accent));font-size:9px;font-weight:900;letter-spacing:.11em}
        .workout-tutorial-prompt-copy h3{margin:0;color:var(--text);font-size:17px;line-height:1.2}
        .workout-tutorial-prompt-copy p{margin:5px 0 4px;color:var(--text-secondary,var(--muted));font-size:11px;line-height:1.45}
        .workout-tutorial-prompt-copy small{display:block;color:var(--muted);font-size:9px;line-height:1.35}
        .workout-tutorial-prompt-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end}
        .workout-tutorial-prompt-actions .primary-btn{white-space:nowrap;margin:0;padding:9px 12px;font-size:10px}
        .workout-tutorial-prompt-dismiss{border:0;background:transparent;color:var(--muted);padding:8px 5px;font-size:10px;font-weight:800}
        @media(max-width:620px){
            .workout-tutorial-dashboard-prompt{grid-template-columns:auto minmax(0,1fr);align-items:start}
            .workout-tutorial-prompt-actions{grid-column:1 / -1;justify-content:flex-start;padding-left:62px}
        }
        @media(max-width:430px){
            .workout-tutorial-dashboard-prompt{gap:11px;padding:14px}
            .workout-tutorial-prompt-icon{width:44px;height:44px;border-radius:14px;font-size:23px}
            .workout-tutorial-prompt-copy h3{font-size:16px}
            .workout-tutorial-prompt-actions{padding-left:55px}
        }
    `;
    document.head.appendChild(style);
}
