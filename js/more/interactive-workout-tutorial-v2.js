import { navigate } from "../core/router.js?v=deload-workout-preview-1";
import { presetPlans } from "../workouts/workout-plans.js?v=interactive-workout-tutorial-5";
import { openWorkoutLogger, ACTIVE_WORKOUT_STORAGE_KEY } from "../workouts/workout-session.js?v=workout-source-stats-1";

const STYLE_ID = "level-up-interactive-workout-tutorial-v2-styles";
const CARD_ID = "interactive-workout-tutorial-card";
const COMPLETION_KEY = "level_up_interactive_workout_tutorial_v2";
const TUTORIAL_PLAN = presetPlans.find(plan => plan.id === "full-body-foundation");
const PRIMARY_SELECTOR = '.session-exercise-card[data-exercise-id="back-squat"]';
const FIRST_CARD_SELECTOR = '.session-exercise-card[data-exercise-index="0"]';
const ISOLATED_STORAGE_KEYS = new Set([
    ACTIVE_WORKOUT_STORAGE_KEY,
    "forge_workout_sessions",
    "level_up_adaptive_guidance_state",
    "level_up_plate_calculator_settings"
]);

const STEPS = [
    {
        target: "#begin-session-btn",
        title: "Start logging the workout",
        body: "Normally, go to Workout → My Workouts, choose your plan, and tap Log a Workout. On this screen, confirm the Training Day and Workout Date, then tap Begin Workout. That starts the workout timer and opens the exercise-by-exercise logger."
    },
    {
        target: `${PRIMARY_SELECTOR} .logger-form-guide-btn`,
        title: "Use the Form Guide",
        body: "Tap Form Guide whenever you want a technique refresher before or during an exercise. It opens the exercise guide with setup cues and the form video, then returns you to the same spot in your workout when you are done."
    },
    {
        target: `${PRIMARY_SELECTOR} .exercise-warmup-btn`,
        title: "Show your warm-up sets",
        body: "Tap Warm-up to reveal the suggested warm-up sets for this lift. Warm-ups prepare you for the working weight and are kept separate from your programmed working sets, so they do not replace Set 1, Set 2, or Set 3."
    },
    {
        target: `${PRIMARY_SELECTOR} .complete-warmup-btn`,
        title: "Complete a warm-up",
        body: "After performing the warm-up, tap the completion button on that row. Level Up marks it finished and can start the normal rest-timer flow so you know when to move to the next set."
    },
    {
        target: `${PRIMARY_SELECTOR} .plate-calculator-trigger`,
        title: "Use the plate calculator",
        body: "For barbell exercises, the plate calculator uses the weight entered in the active set and shows what to load on each side of the bar. This removes the mental math when your target changes from one session to the next."
    },
    {
        target: `${PRIMARY_SELECTOR} .session-set-row[data-set-index="0"] .complete-set-btn`,
        title: "Log a working set",
        body: "Each working-set row shows your previous performance, today’s Weight, today’s Reps, and the completion button. Enter what you actually lifted after the set, then tap Complete Set. Those completed sets are what Level Up uses for workout history, volume, strength trends, and progression guidance."
    },
    {
        target: `${PRIMARY_SELECTOR} .session-set-row[data-set-index="0"] .drop-set-menu-trigger`,
        title: "Add a drop set",
        body: "Tap the set-number action when you want to continue immediately at a lighter weight after a working set. Level Up adds a Drop Set row and suggests a practical lighter load; enter the weight and reps you actually perform, then mark the drop complete."
    },
    {
        target: `${PRIMARY_SELECTOR} .session-inline-swap`,
        title: "Swap an exercise for today",
        body: "Tap Swap if equipment is busy or you need a different movement today. Smart Swap ranks alternatives that keep a similar training purpose, and the change applies to the active workout rather than rewriting the saved plan."
    },
    {
        target: `${FIRST_CARD_SELECTOR} .compact-add-set-btn`,
        title: "Add another working set",
        body: "Tap Add Set when you intentionally need one more working set for this exercise. Use it for a real programming reason—such as making up a missed set—not just because the button is available. The new row uses the same Weight, Reps, and Complete workflow."
    },
    {
        target: `${FIRST_CARD_SELECTOR} .session-add-exercise-btn`,
        title: "Add an exercise during the workout",
        body: "Tap Add Exercise to open the exercise library without leaving the session. Search by name or browse by muscle, then choose the movement you want to add. This is useful when you need an extra exercise today without rebuilding the whole workout plan first."
    },
    {
        target: "#save-session-btn",
        title: "Complete the workout",
        body: "When you are finished, scroll to Complete Workout. In a normal session, this saves the workout to history and sends the completed set data into Progress, including volume and strength tracking. Use this only when the session is actually finished."
    }
];

let active = false;
let stepIndex = 0;
let flow = null;
let queued = false;
let storageIsolation = null;
let isolatedValues = new Map();

install();

function install() {
    ensureStyles();
    schedule();
    new MutationObserver(() => {
        schedule();
        reconcileFlow();
        suppressAdaptiveUI();
    }).observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["hidden", "class"]
    });
    document.addEventListener("click", handleClick, true);
    window.addEventListener("resize", positionGuide);
    window.addEventListener("scroll", positionGuide, true);
}

function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        injectTutorialCard();
        suppressAdaptiveUI();
        if (active) positionGuide();
    });
}

function injectTutorialCard() {
    const shell = document.querySelector(".learn-shell");
    if (!shell || !TUTORIAL_PLAN) return;

    const oldCard = document.getElementById(CARD_ID);
    if (oldCard && oldCard.dataset.tutorialVersion !== "2") {
        oldCard.closest(".interactive-workout-tutorial-section")?.remove();
    }
    if (document.getElementById(CARD_ID)) return;

    const completed = readCompleted();
    const section = document.createElement("section");
    section.className = "interactive-workout-tutorial-section";
    section.innerHTML = `
        <header>
            <div><small>INTERACTIVE TUTORIAL</small><h3>Learn the workout logger</h3></div>
            <p>Walk through a full workout using an existing Level Up template and learn what each control is for.</p>
        </header>
        <button id="${CARD_ID}" data-tutorial-version="2" class="interactive-workout-tutorial-card${completed ? " is-complete" : ""}" type="button">
            <span class="interactive-workout-tutorial-icon" aria-hidden="true">☝️</span>
            <span class="interactive-workout-tutorial-copy">
                <strong>Interactive Workout Logger</strong>
                <small>Full Body Foundation · Day 1 – Full Body A · form guide, warm-ups, plate calculator, sets, drop sets, swaps, Add Set and Add Exercise.</small>
                <span>${STEPS.length} guided steps · about 4 min</span>
            </span>
            <span class="interactive-workout-tutorial-state">${completed ? "Practice again →" : "Start →"}</span>
        </button>`;

    const appGuides = shell.querySelector(".learn-library-heading");
    if (appGuides) appGuides.insertAdjacentElement("beforebegin", section);
    else shell.appendChild(section);
}

function handleClick(event) {
    const launch = event.target.closest?.(`#${CARD_ID}[data-tutorial-version="2"]`);
    if (launch) {
        event.preventDefault();
        startTutorial();
        return;
    }
    if (!active) return;

    if (event.target.closest?.("[data-interactive-tutorial-exit]")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        exitTutorial(false);
        return;
    }

    const finish = event.target.closest?.("#save-session-btn");
    if (finish) {
        event.preventDefault();
        event.stopImmediatePropagation();
        finishTutorial();
        return;
    }

    if (event.target.closest?.("#begin-session-btn")) {
        window.setTimeout(() => {
            preparePrimarySet();
            setStep(1);
        }, 160);
        return;
    }

    if (event.target.closest?.(`${PRIMARY_SELECTOR} .logger-form-guide-btn`)) {
        flow = "form-opening";
        hideGuide();
        window.setTimeout(reconcileFlow, 80);
        return;
    }

    if (event.target.closest?.(`${PRIMARY_SELECTOR} .exercise-warmup-btn`)) {
        window.setTimeout(() => setStep(3), 140);
        return;
    }

    if (event.target.closest?.(`${PRIMARY_SELECTOR} .complete-warmup-btn`)) {
        window.setTimeout(() => {
            preparePrimarySet();
            setStep(4);
        }, 140);
        return;
    }

    if (event.target.closest?.(`${PRIMARY_SELECTOR} .plate-calculator-trigger`)) {
        flow = "plate-opening";
        hideGuide();
        window.setTimeout(reconcileFlow, 80);
        return;
    }

    if (event.target.closest?.(`${PRIMARY_SELECTOR} .session-set-row[data-set-index="0"] .complete-set-btn`)) {
        window.setTimeout(() => setStep(6), 160);
        return;
    }

    if (event.target.closest?.(`${PRIMARY_SELECTOR} .session-set-row[data-set-index="0"] .drop-set-menu-trigger`)) {
        window.setTimeout(() => setStep(7), 160);
        return;
    }

    if (event.target.closest?.(`${PRIMARY_SELECTOR} .session-inline-swap`)) {
        flow = "swap-opening";
        hideGuide();
        window.setTimeout(reconcileFlow, 80);
        return;
    }

    if (event.target.closest?.(`${FIRST_CARD_SELECTOR} .compact-add-set-btn`)) {
        window.setTimeout(() => setStep(9), 180);
        return;
    }

    if (event.target.closest?.(`${FIRST_CARD_SELECTOR} .session-add-exercise-btn`)) {
        flow = "add-opening";
        hideGuide();
        window.setTimeout(reconcileFlow, 80);
    }
}

function startTutorial() {
    if (active || !TUTORIAL_PLAN) return;
    active = true;
    stepIndex = 0;
    flow = null;
    installStorageIsolation();
    document.documentElement.classList.add("interactive-workout-tutorial-active");
    navigate("workout");

    waitFor(".workout-page", () => {
        openWorkoutLogger(TUTORIAL_PLAN);
        waitFor("#workout-session-logger", logger => {
            logger.dataset.interactiveTutorial = "true";
            const day = logger.querySelector("#session-day-select");
            if (day) {
                day.value = "0";
                day.dispatchEvent(new Event("change", { bubbles: true }));
            }
            suppressAdaptiveUI();
            ensureGuide();
            setStep(0);
        });
    });
}

function installStorageIsolation() {
    if (storageIsolation) return;
    const prototype = Storage.prototype;
    const originalGetItem = prototype.getItem;
    const originalSetItem = prototype.setItem;
    const originalRemoveItem = prototype.removeItem;
    storageIsolation = { prototype, originalGetItem, originalSetItem, originalRemoveItem };
    isolatedValues = new Map();

    ISOLATED_STORAGE_KEYS.forEach(key => {
        if (key === ACTIVE_WORKOUT_STORAGE_KEY) {
            isolatedValues.set(key, null);
            return;
        }
        isolatedValues.set(key, originalGetItem.call(localStorage, key));
    });

    prototype.getItem = function(key) {
        const normalized = String(key);
        if (active && this === localStorage && ISOLATED_STORAGE_KEYS.has(normalized)) {
            return isolatedValues.get(normalized) ?? null;
        }
        return originalGetItem.call(this, key);
    };

    prototype.setItem = function(key, value) {
        const normalized = String(key);
        if (active && this === localStorage && ISOLATED_STORAGE_KEYS.has(normalized)) {
            isolatedValues.set(normalized, String(value));
            return;
        }
        return originalSetItem.call(this, key, value);
    };

    prototype.removeItem = function(key) {
        const normalized = String(key);
        if (active && this === localStorage && ISOLATED_STORAGE_KEYS.has(normalized)) {
            isolatedValues.set(normalized, null);
            return;
        }
        return originalRemoveItem.call(this, key);
    };
}

function restoreStorageIsolation() {
    if (!storageIsolation) return;
    const { prototype, originalGetItem, originalSetItem, originalRemoveItem } = storageIsolation;
    prototype.getItem = originalGetItem;
    prototype.setItem = originalSetItem;
    prototype.removeItem = originalRemoveItem;
    storageIsolation = null;
    isolatedValues = new Map();
}

function preparePrimarySet() {
    const card = document.querySelector(PRIMARY_SELECTOR);
    if (!card) return;
    const row = card.querySelector('.session-set-row[data-set-index="0"]');
    const weight = row?.querySelector(".session-weight");
    const reps = row?.querySelector(".session-reps");

    if (weight && !Number(weight.value)) {
        weight.value = "135";
        weight.dispatchEvent(new Event("input", { bubbles: true }));
        weight.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (reps && !Number(reps.value)) {
        reps.value = "8";
        reps.dispatchEvent(new Event("input", { bubbles: true }));
        reps.dispatchEvent(new Event("change", { bubbles: true }));
    }
}

function suppressAdaptiveUI() {
    if (!active) return;
    document.querySelectorAll(".adaptive-recovery-flow,.adaptive-post-flow,.adaptive-rir-control,.adaptive-deload-banner,.adaptive-preview-banner").forEach(node => node.remove());
    const logger = document.getElementById("workout-session-logger");
    logger?.classList.remove("adaptive-guidance-on", "adaptive-deload-active", "adaptive-deload-preview-active");
}

function reconcileFlow() {
    if (!active || !flow) return;

    if (flow === "form-opening") {
        if (document.querySelector(".exercise-guide-screen")) flow = "form-open";
        return;
    }
    if (flow === "form-open") {
        if (!document.querySelector(".exercise-guide-screen")) {
            flow = null;
            setStep(2);
        }
        return;
    }

    const plate = document.querySelector(".plate-calculator-overlay");
    if (flow === "plate-opening") {
        if (plate && !plate.hidden) flow = "plate-open";
        return;
    }
    if (flow === "plate-open") {
        if (!plate || plate.hidden) {
            flow = null;
            setStep(5);
        }
        return;
    }

    const swap = document.querySelector("#session-exercise-swap-sheet");
    if (flow === "swap-opening") {
        if (swap && !swap.hidden) flow = "swap-open";
        return;
    }
    if (flow === "swap-open") {
        if (!swap || swap.hidden) {
            flow = null;
            setStep(8);
        }
        return;
    }

    const addSheet = document.querySelector("#session-add-exercise-sheet");
    if (flow === "add-opening") {
        if (addSheet && !addSheet.hidden) flow = "add-open";
        return;
    }
    if (flow === "add-open" && (!addSheet || addSheet.hidden)) {
        flow = null;
        setStep(10);
    }
}

function ensureGuide() {
    if (document.querySelector("[data-interactive-tutorial-guide]")) return;
    document.body.insertAdjacentHTML("beforeend", `
        <div class="interactive-tutorial-plan-badge" data-interactive-tutorial-badge><span>TUTORIAL</span><strong>Full Body Foundation · Day 1 – Full Body A</strong></div>
        <div class="interactive-tutorial-finger" data-interactive-tutorial-finger aria-hidden="true">👇</div>
        <aside class="interactive-tutorial-guide" data-interactive-tutorial-guide role="status" aria-live="polite">
            <div>
                <small data-interactive-step-label></small>
                <strong data-interactive-step-title></strong>
                <p data-interactive-step-body></p>
            </div>
            <button type="button" data-interactive-tutorial-exit>Exit tutorial</button>
        </aside>`);
}

function setStep(index) {
    if (!active) return;
    stepIndex = Math.max(0, Math.min(STEPS.length - 1, index));
    ensureGuide();
    const step = STEPS[stepIndex];
    const guide = document.querySelector("[data-interactive-tutorial-guide]");
    setText(guide?.querySelector("[data-interactive-step-label]"), `STEP ${stepIndex + 1} OF ${STEPS.length}`);
    setText(guide?.querySelector("[data-interactive-step-title]"), step.title);
    setText(guide?.querySelector("[data-interactive-step-body]"), step.body);
    showGuide();
    window.setTimeout(positionGuide, 70);
}

function positionGuide() {
    if (!active || flow) return;
    document.querySelectorAll(".interactive-tutorial-focus").forEach(node => node.classList.remove("interactive-tutorial-focus"));

    const step = STEPS[stepIndex];
    const target = step ? document.querySelector(step.target) : null;
    const finger = document.querySelector("[data-interactive-tutorial-finger]");
    const guide = document.querySelector("[data-interactive-tutorial-guide]");
    if (!target || !finger || !guide) {
        if (finger) finger.hidden = true;
        return;
    }

    target.classList.add("interactive-tutorial-focus");
    const rect = target.getBoundingClientRect();
    const guideHeight = Math.max(140, guide.getBoundingClientRect().height || 0);
    const bottomClearance = guideHeight + 36;

    if (rect.top < 88 || rect.bottom > window.innerHeight - bottomClearance) {
        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        window.setTimeout(positionGuide, 300);
        return;
    }

    finger.style.left = `${Math.max(16, Math.min(window.innerWidth - 54, rect.left + rect.width / 2 - 18))}px`;
    finger.style.top = `${Math.max(54, rect.top - 42)}px`;
    finger.hidden = false;
}

function hideGuide() {
    const guide = document.querySelector("[data-interactive-tutorial-guide]");
    const finger = document.querySelector("[data-interactive-tutorial-finger]");
    if (guide) guide.hidden = true;
    if (finger) finger.hidden = true;
    document.querySelectorAll(".interactive-tutorial-focus").forEach(node => node.classList.remove("interactive-tutorial-focus"));
}

function showGuide() {
    const guide = document.querySelector("[data-interactive-tutorial-guide]");
    if (guide) guide.hidden = false;
}

function finishTutorial() {
    localStorage.setItem(COMPLETION_KEY, JSON.stringify({ completed: true, completedAt: new Date().toISOString() }));
    exitTutorial(true);
}

function exitTutorial(completed) {
    if (!active) return;
    hideGuide();
    document.querySelector("[data-interactive-tutorial-guide]")?.remove();
    document.querySelector("[data-interactive-tutorial-finger]")?.remove();
    document.querySelector("[data-interactive-tutorial-badge]")?.remove();
    document.querySelector(".plate-calculator-overlay")?.remove();
    document.querySelector("#session-exercise-swap-sheet")?.remove();
    document.querySelector("#session-add-exercise-sheet")?.remove();

    active = false;
    flow = null;
    document.documentElement.classList.remove("interactive-workout-tutorial-active");
    restoreStorageIsolation();

    navigate("more");
    waitFor('[data-more-page="learn"]', button => {
        button.click();
        if (completed) {
            window.setTimeout(() => document.getElementById(CARD_ID)?.scrollIntoView({ behavior: "smooth", block: "center" }), 140);
        }
    });
}

function waitFor(selector, callback, attempts = 0) {
    const node = document.querySelector(selector);
    if (node) {
        callback(node);
        return;
    }
    if (attempts >= 80) {
        if (active) exitTutorial(false);
        return;
    }
    window.setTimeout(() => waitFor(selector, callback, attempts + 1), 50);
}

function readCompleted() {
    try {
        return JSON.parse(localStorage.getItem(COMPLETION_KEY) || "null")?.completed === true;
    }
    catch {
        return false;
    }
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .interactive-workout-tutorial-section{margin:18px 0}.interactive-workout-tutorial-section>header{margin-bottom:9px}.interactive-workout-tutorial-section>header>div{display:flex;align-items:baseline;justify-content:space-between;gap:10px}.interactive-workout-tutorial-section>header small{color:var(--accent);font-size:9px;font-weight:900;letter-spacing:.08em}.interactive-workout-tutorial-section>header h3{margin:2px 0;color:var(--text)}.interactive-workout-tutorial-section>header p{margin:0;color:var(--muted);font-size:11px;line-height:1.4}.interactive-workout-tutorial-card{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:11px;align-items:center;width:100%;padding:13px;border:1px solid color-mix(in srgb,var(--accent) 35%,var(--card-border,#333));border-radius:17px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 10%,var(--card)),var(--card));color:var(--text);text-align:left}.interactive-workout-tutorial-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:color-mix(in srgb,var(--accent) 15%,transparent);font-size:24px}.interactive-workout-tutorial-copy strong,.interactive-workout-tutorial-copy small,.interactive-workout-tutorial-copy span{display:block}.interactive-workout-tutorial-copy strong{font-size:13px}.interactive-workout-tutorial-copy small{margin-top:3px;color:var(--muted);font-size:10px;line-height:1.4}.interactive-workout-tutorial-copy span{margin-top:5px;color:var(--accent);font-size:9px;font-weight:850}.interactive-workout-tutorial-state{font-size:10px;font-weight:900;white-space:nowrap}
        html.interactive-workout-tutorial-active .bottom-nav{display:none!important}html.interactive-workout-tutorial-active #content{padding-bottom:280px!important}html.interactive-workout-tutorial-active :is(.adaptive-recovery-flow,.adaptive-post-flow,.adaptive-rir-control,.adaptive-deload-banner,.adaptive-preview-banner){display:none!important}
        .interactive-tutorial-plan-badge{position:fixed;z-index:10030;top:calc(10px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:7px;max-width:calc(100vw - 24px);padding:6px 9px;border:1px solid color-mix(in srgb,var(--accent) 30%,var(--card-border,#333));border-radius:999px;background:color-mix(in srgb,var(--card) 96%,transparent);box-shadow:0 6px 22px rgba(0,0,0,.24);white-space:nowrap}.interactive-tutorial-plan-badge span{padding:3px 5px;border-radius:999px;background:var(--accent);color:var(--accent-text,#fff);font-size:8px;font-weight:950}.interactive-tutorial-plan-badge strong{overflow:hidden;text-overflow:ellipsis;color:var(--text);font-size:9px}
        .interactive-tutorial-guide{position:fixed;z-index:10040;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom));display:flex;align-items:flex-start;justify-content:space-between;gap:11px;max-height:min(230px,42vh);overflow:auto;padding:12px;border:1px solid color-mix(in srgb,var(--accent) 34%,var(--card-border,#333));border-radius:16px;background:color-mix(in srgb,var(--card) 98%,transparent);box-shadow:0 12px 36px rgba(0,0,0,.38);color:var(--text);backdrop-filter:blur(16px)}.interactive-tutorial-guide[hidden]{display:none!important}.interactive-tutorial-guide div{min-width:0}.interactive-tutorial-guide small,.interactive-tutorial-guide strong,.interactive-tutorial-guide p{display:block}.interactive-tutorial-guide small{color:var(--accent);font-size:8px;font-weight:950;letter-spacing:.08em}.interactive-tutorial-guide strong{margin-top:2px;font-size:13px;line-height:1.2}.interactive-tutorial-guide p{margin:5px 0 0;color:var(--text-secondary,var(--muted));font-size:10px;line-height:1.48}.interactive-tutorial-guide>button{flex:0 0 auto;padding:5px 6px;border:0;background:transparent;color:var(--muted);font-size:9px;font-weight:850}
        .interactive-tutorial-finger{position:fixed;z-index:10045;width:38px;height:38px;font-size:28px;line-height:38px;text-align:center;pointer-events:none;filter:drop-shadow(0 4px 7px rgba(0,0,0,.45));animation:interactive-tutorial-point .85s ease-in-out infinite alternate}.interactive-tutorial-finger[hidden]{display:none!important}.interactive-tutorial-focus{position:relative!important;z-index:10032!important;outline:3px solid var(--accent)!important;outline-offset:3px!important;box-shadow:0 0 0 7px color-mix(in srgb,var(--accent) 18%,transparent),0 8px 28px rgba(0,0,0,.32)!important}
        @keyframes interactive-tutorial-point{from{transform:translateY(-3px)}to{transform:translateY(6px)}}
        @media(max-width:430px){.interactive-workout-tutorial-card{grid-template-columns:40px minmax(0,1fr)}.interactive-workout-tutorial-state{grid-column:2}.interactive-tutorial-guide{left:10px;right:10px}.interactive-tutorial-guide>button{padding-top:1px}.interactive-tutorial-plan-badge strong{max-width:250px}}
    `;
    document.head.appendChild(style);
}
